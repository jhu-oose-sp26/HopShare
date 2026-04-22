import { useState, useEffect, useCallback } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function useFriends(userId) {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFriends = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [friendsRes, incomingRes, sentRes] = await Promise.all([
        fetch(`${API_ROOT}/friends/${userId}`),
        fetch(`${API_ROOT}/friends/${userId}/requests/incoming`),
        fetch(`${API_ROOT}/friends/${userId}/requests/sent`),
      ]);

      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends || []);
      }
      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setIncomingRequests(data.requests || []);
      }
      if (sentRes.ok) {
        const data = await sentRes.json();
        setSentRequests(data.requests || []);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Send a friend request (does NOT immediately add as friend)
  const sendFriendRequest = useCallback(async (friendId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send friend request');
    }

    setSentRequests(prev => [...prev, { senderId: userId, receiverId: friendId }]);
  }, [userId]);

  // Keep addFriend as an alias for sendFriendRequest for backwards compat
  const addFriend = sendFriendRequest;

  const acceptRequest = useCallback(async (requestId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/requests/${requestId}/accept`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to accept request');
    }

    const data = await response.json();
    if (data.friend) {
      setFriends(prev => [...prev, data.friend]);
    }
    setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
  }, [userId]);

  const rejectRequest = useCallback(async (requestId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/requests/${requestId}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to reject request');
    }

    setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
  }, [userId]);

  const cancelRequest = useCallback(async (requestId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/requests/${requestId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to cancel request');
    }

    setSentRequests(prev => prev.filter(r => r._id !== requestId));
  }, [userId]);

  const removeFriend = useCallback(async (friendId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/remove/${friendId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to remove friend');
    }

    setFriends(prev => prev.filter(f => f._id !== friendId));
  }, [userId]);

  const isFriend = useCallback((friendId) => {
    return friends.some(f => f._id === friendId || f._id?.toString() === friendId);
  }, [friends]);

  const hasSentRequest = useCallback((targetUserId) => {
    return sentRequests.some(r => r.receiverId === targetUserId);
  }, [sentRequests]);

  const hasIncomingRequest = useCallback((targetUserId) => {
    return incomingRequests.find(r => r.sender?._id === targetUserId || r.sender?._id?.toString() === targetUserId);
  }, [incomingRequests]);

  const checkFriendship = useCallback(async (friendId) => {
    if (!userId) return false;
    const response = await fetch(`${API_ROOT}/friends/${userId}/check/${friendId}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.isFriend;
  }, [userId]);

  return {
    friends,
    incomingRequests,
    sentRequests,
    isLoading,
    error,
    addFriend,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    checkFriendship,
    isFriend,
    hasSentRequest,
    hasIncomingRequest,
    refreshFriends: fetchFriends,
  };
}

export function useFriendPosts(userId) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFriendPosts = useCallback(async () => {
    if (!userId) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_ROOT}/friends/${userId}/posts`);

      if (!response.ok) {
        throw new Error('Failed to fetch friend posts');
      }

      const data = await response.json();
      setPosts(data.posts || []);
      setError('');
    } catch (err) {
      setError(err.message);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriendPosts();
  }, [fetchFriendPosts]);

  return {
    posts,
    isLoading,
    error,
    refreshPosts: fetchFriendPosts,
  };
}
