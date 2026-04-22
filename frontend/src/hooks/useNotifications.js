import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

async function parseNotificationResponse(response) {
    if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;
        try {
            const payload = await response.json();
            if (payload?.error) {
                errorMessage = payload.error;
            }
        } catch {
            // Ignore parse failures and keep the fallback message.
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

export function useNotifications(currentUser) {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const socketRef = useRef(null);

    const userId = currentUser?._id;

    const refreshNotifications = useCallback(
        async ({ silent = false } = {}) => {
            if (!userId) {
                setNotifications([]);
                setError('');
                setIsLoading(false);
                setIsRefreshing(false);
                return [];
            }

            if (silent) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            try {
                const response = await fetch(`${API_ROOT}/notifications/${userId}`);
                const data = await parseNotificationResponse(response);
                const items = Array.isArray(data) ? data : [];
                setNotifications(items);
                setError('');
                setLastUpdatedAt(new Date().toISOString());
                return items;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Failed to load notifications';
                setError(message);
                throw err;
            } finally {
                if (silent) {
                    setIsRefreshing(false);
                } else {
                    setIsLoading(false);
                }
            }
        },
        [userId]
    );

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        refreshNotifications().catch(() => { });

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to notifications socket:', socket.id);
        });

        socket.on(`notification:created:${userId}`, ({ notification }) => {
            console.log('Received new notification:', notification._id);
            setNotifications((prev) => {
                if (prev.some((n) => String(n._id) === String(notification._id))) {
                    return prev;
                }
                return [notification, ...prev];
            });
            setLastUpdatedAt(new Date().toISOString());
        });

        socket.on(`notification:updated:${userId}`, ({ notification }) => {
            console.log('Received updated notification:', notification._id);
            setNotifications((prev) =>
                prev.map((n) =>
                    String(n._id) === String(notification._id) ? notification : n
                )
            );
            setLastUpdatedAt(new Date().toISOString());
        });

        socket.on('notification:deleted', ({ notificationId }) => {
            console.log('Received deleted notification:', notificationId);
            setNotifications((prev) =>
                prev.filter((n) => String(n._id) !== String(notificationId))
            );
            setLastUpdatedAt(new Date().toISOString());
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from notifications socket');
        });

        socket.on('connect_error', (err) => {
            console.error('Notifications socket connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [userId, refreshNotifications]);

    // Fallback refresh on focus (only if socket disconnected)
    useEffect(() => {
        if (!userId) return;

        const handleFocus = () => {
            if (!socketRef.current?.connected) {
                refreshNotifications({ silent: true }).catch(() => { });
            }
        };

        const handleVisibility = () => {
            if (!document.hidden && !socketRef.current?.connected) {
                refreshNotifications({ silent: true }).catch(() => { });
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [userId, refreshNotifications]);

    const markAllAsRead = useCallback(async () => {
        const unreadNotifications = notifications.filter((item) => !item.read);
        if (unreadNotifications.length === 0) {
            return;
        }

        await Promise.all(
            unreadNotifications.map((item) =>
                fetch(`${API_ROOT}/notifications/${item._id}/read`, {
                    method: 'PATCH',
                })
            )
        );

        // Change Stream will broadcast the updates
    }, [notifications]);

    const sendReply = useCallback(
        async (notification, message) => {
            await parseNotificationResponse(
                await fetch(`${API_ROOT}/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientId: notification.senderId,
                        senderName: currentUser?.name,
                        senderId: currentUser?._id,
                        message,
                        postId: notification.postId,
                        replyToMessage: notification.message,
                    }),
                })
            );

            // Change Stream will broadcast the new notification
        },
        [currentUser?._id, currentUser?.name]
    );

    const respondToNotification = useCallback(
        async (notification, response) => {
            try {
                await parseNotificationResponse(
                    await fetch(`${API_ROOT}/notifications/${notification._id}/respond`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            response,
                            responderName: currentUser?.name,
                        }),
                    })
                );
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to respond to notification');
                return;
            }

            // Change Stream will broadcast the update
        },
        [currentUser?.name]
    );

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.read).length,
        [notifications]
    );

    return {
        notifications,
        unreadCount,
        isLoading,
        isRefreshing,
        error,
        lastUpdatedAt,
        refreshNotifications,
        markAllAsRead,
        sendReply,
        respondToNotification,
    };
}