import { useState, useEffect, useCallback } from 'react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function useFriends(userId) {
  const [friends, setFriends] = useState([]);
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
      const response = await fetch(`${API_ROOT}/friends/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const data = await response.json();
      setFriends(data.friends || []);
      setError('');
    } catch (err) {
      setError(err.message);
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const addFriend = useCallback(async (friendId) => {
    if (!userId) return;

    const response = await fetch(`${API_ROOT}/friends/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add friend');
    }

    const data = await response.json();
    setFriends(prev => [...prev, data.friend]);
    return data.friend;
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

  const checkFriendship = useCallback(async (friendId) => {
    if (!userId) return false;

    const response = await fetch(`${API_ROOT}/friends/${userId}/check/${friendId}`);
    
    if (!response.ok) return false;

    const data = await response.json();
    return data.isFriend;
  }, [userId]);

  const isFriend = useCallback((friendId) => {
    return friends.some(f => f._id === friendId);
  }, [friends]);

  return {
    friends,
    isLoading,
    error,
    addFriend,
    removeFriend,
    checkFriendship,
    isFriend,
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