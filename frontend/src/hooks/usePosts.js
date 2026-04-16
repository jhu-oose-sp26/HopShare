import { useCallback, useEffect, useState } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
    /\/$/,
    ''
);
const POSTS_ENDPOINT = `${API_ROOT}/posts`;

function toShortPlaceName(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    return raw.replace(/\s*,.*$/, '').trim();
}

function createPostPayload(formData) {
    const startShort = toShortPlaceName(formData.startTitle);
    const endShort = toShortPlaceName(formData.endTitle);

    return {
        title: `${startShort || formData.startTitle} → ${
            endShort || formData.endTitle
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

    useEffect(() => {
        refreshPosts().catch(() => {});

        const intervalId = window.setInterval(() => {
            refreshPosts({ silent: true }).catch(() => {});
        }, 30000);

        const handleWindowFocus = () => {
            refreshPosts({ silent: true }).catch(() => {});
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshPosts({ silent: true }).catch(() => {});
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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

        const createdResult = await response.json();
        const createdPost = {
            ...postPayload,
            _id: normalizeId(
                createdResult.postId || createdResult.insertedId,
                Date.now().toString()
            ),
            tripId: createdResult.tripId
                ? normalizeId(createdResult.tripId, null)
                : null,
        };

        setPosts((prevPosts) => [createdPost, ...prevPosts]);
        setError('');
        setLastUpdatedAt(new Date().toISOString());
        return createdPost;
    }, []);

    const removePost = useCallback(async (postId) => {
        const response = await fetch(`${POSTS_ENDPOINT}/${postId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        setPosts((prevPosts) =>
            prevPosts.filter((post) => String(post._id) !== String(postId))
        );
        setLastUpdatedAt(new Date().toISOString());
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

        // Update local state with the new data
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                String(post._id) === String(postId)
                    ? { ...post, ...postPayload }
                    : post
            )
        );
        setLastUpdatedAt(new Date().toISOString());
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
