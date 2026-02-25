import { useCallback, useEffect, useState } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
    /\/$/,
    ''
);
const POSTS_ENDPOINT = `${API_ROOT}/posts`;

function createPostPayload(formData) {
    return {
        title: `${formData.startLocation} → ${formData.endLocation}`,
        description: formData.description,
        user: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
        },
        trip: {
            startLocation: formData.startLocation,
            endLocation: formData.endLocation,
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
    const [error, setError] = useState('');

    const fetchPosts = useCallback(async () => {
        const response = await fetch(POSTS_ENDPOINT);
        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadPosts = async () => {
            setIsLoading(true);
            try {
                const loadedPosts = await fetchPosts();
                if (isMounted) {
                    setPosts(loadedPosts);
                    setError('');
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load rides'
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadPosts();

        return () => {
            isMounted = false;
        };
    }, [fetchPosts]);


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
    }, []);

    return {
        posts,
        addPost,
        removePost,
        postCount: posts.length,
        isLoading,
        error,
    };
};
