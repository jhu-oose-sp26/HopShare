import { useCallback, useEffect, useMemo, useState } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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

export function useNotifications(currentUser, options = {}) {
    const pollingIntervalMs = options.pollingIntervalMs ?? 15000;
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

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

    useEffect(() => {
        let isActive = true;

        const loadNotifications = async () => {
            try {
                await refreshNotifications();
            } catch {
                if (!isActive) {
                    return;
                }
            }
        };

        loadNotifications();

        if (!userId) {
            return () => {
                isActive = false;
            };
        }

        const intervalId = window.setInterval(() => {
            refreshNotifications({ silent: true }).catch(() => {});
        }, pollingIntervalMs);

        const handleWindowFocus = () => {
            refreshNotifications({ silent: true }).catch(() => {});
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshNotifications({ silent: true }).catch(() => {});
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [pollingIntervalMs, refreshNotifications, userId]);

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

        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
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

            await refreshNotifications({ silent: true });
        },
        [currentUser?._id, currentUser?.name, refreshNotifications]
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

            await refreshNotifications({ silent: true });
        },
        [currentUser?.name, refreshNotifications]
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