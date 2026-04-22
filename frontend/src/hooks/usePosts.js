import { useCallback, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
    /\/$/,
    ''
);
const POSTS_ENDPOINT = `${API_ROOT}/posts`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

function toShortPlaceName(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    return raw.replace(/\s*,.*$/, '').trim();
}

function createPostPayload(formData) {
    const startShort = toShortPlaceName(formData.startTitle);
    const endShort = toShortPlaceName(formData.endTitle);

    return {
        title: `${startShort || formData.startTitle} → ${endShort || formData.endTitle
            }`,
        description: formData.description,
        type: formData.type,
        suggestedPrice: formData.type === 'offer' && formData.suggestedPrice ? Number(formData.suggestedPrice) : null,
        user: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
        },
        trip: {
            startLocation: {
                title: formData.startTitle,
                gps_coordinates: {
                    latitude: formData.startLatitude,
                    longitude: formData.startLongitude,
                }
            },
            endLocation: {
                title: formData.endTitle,
                gps_coordinates: {
                    latitude: formData.endLatitude,
                    longitude: formData.endLongitude,
                }
            },
            date: formData.date,
            time: formData.time,
        },
        ...(formData.maxRiders != null ? { maxRiders: formData.maxRiders } : {}),
        createdAt: new Date().toISOString(),
    };
}

function normalizeId(id, fallback) {
    if (id) {
        return String(id);
    }
    return fallback;
}

async function readErrorMessage(response) {
    try {
        const payload = await response.json();
        if (payload?.error) {
            return payload.error;
        }
    } catch {
        // ignore parse errors
    }
    return `Request failed (${response.status})`;
}

export const usePosts = () => {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const socketRef = useRef(null);

    const fetchPosts = useCallback(async () => {
        const response = await fetch(POSTS_ENDPOINT);
        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
    }, []);

    const refreshPosts = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            try {
                const loadedPosts = await fetchPosts();
                setPosts(loadedPosts);
                setError('');
                setLastUpdatedAt(new Date().toISOString());
                return loadedPosts;
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Failed to load rides'
                );
                throw err;
            } finally {
                if (silent) {
                    setIsRefreshing(false);
                } else {
                    setIsLoading(false);
                }
            }
        },
        [fetchPosts]
    );

    // WebSocket connection for real-time updates
    useEffect(() => {
        refreshPosts().catch(() => { });

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to posts socket:', socket.id);
        });

        socket.on('post:created', ({ post }) => {
            console.log('Received new post:', post._id);
            if (!post.archived) {
                setPosts((prev) => {
                    if (prev.some((p) => String(p._id) === String(post._id))) {
                        return prev;
                    }
                    return [post, ...prev];
                });
                setLastUpdatedAt(new Date().toISOString());
            }
        });

        socket.on('post:updated', ({ post }) => {
            console.log('Received updated post:', post._id);
            setPosts((prev) =>
                prev
                    .map((p) => (String(p._id) === String(post._id) ? post : p))
                    .filter((p) => !p.archived)
            );
            setLastUpdatedAt(new Date().toISOString());
        });

        socket.on('post:deleted', ({ postId }) => {
            console.log('Received deleted post:', postId);
            setPosts((prev) => prev.filter((p) => String(p._id) !== String(postId)));
            setLastUpdatedAt(new Date().toISOString());
        });

        socket.on('posts:refresh', () => {
            console.log('Received refresh signal');
            refreshPosts({ silent: true }).catch(() => { });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from posts socket');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [refreshPosts]);

    // Fallback refresh on focus (only if socket disconnected)
    useEffect(() => {
        const handleFocus = () => {
            if (!socketRef.current?.connected) {
                refreshPosts({ silent: true }).catch(() => { });
            }
        };

        const handleVisibility = () => {
            if (!document.hidden && !socketRef.current?.connected) {
                refreshPosts({ silent: true }).catch(() => { });
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [refreshPosts]);

    const addPost = useCallback(async (formData) => {
        const postPayload = createPostPayload(formData);
        const response = await fetch(POSTS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postPayload),
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        const result = await response.json();
        // Change Stream will broadcast to all clients. No local state update needed
        return {
            ...postPayload,
            _id: normalizeId(result.postId || result.insertedId, Date.now().toString()),
            tripId: result.tripId ? normalizeId(result.tripId, null) : null,
            confirmationCode: result.confirmationCode,
        };
    }, []);

    const removePost = useCallback(async (postId) => {
        const response = await fetch(`${POSTS_ENDPOINT}/${postId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }
        // Change Stream will broadcast to all clients
    }, []);

    const updatePost = useCallback(async (postId, formData) => {
        const postPayload = createPostPayload(formData);
        const response = await fetch(`${POSTS_ENDPOINT}/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postPayload),
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }
        // Change Stream will broadcast to all clients
    }, []);

    return {
        posts,
        addPost,
        removePost,
        updatePost,
        refreshPosts,
        postCount: posts.length,
        isLoading,
        isRefreshing,
        error,
        lastUpdatedAt,
    };
};
