import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import PostCard from '@/components/PostCard';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function StarredPage({ currentUser }) {
  const [starredPosts, setStarredPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStarred = useCallback(async () => {
    if (!currentUser?.email) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_ROOT}/posts/starred?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) throw new Error('Failed to load starred rides');
      setStarredPosts(await res.json());
    } catch (err) {
      setError(err.message || 'Failed to load starred rides');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => { fetchStarred(); }, [fetchStarred]);

  const handleStarChange = (postId, starred) => {
    if (!starred) {
      setStarredPosts(prev => prev.filter(p => p._id !== postId));
    }
  };

  return (
    <div className='min-h-screen bg-white pb-20'>
      <div className='container mx-auto px-6 py-8 max-w-6xl'>
        <div className='flex items-center gap-3 mb-6'>
          <Star className='w-7 h-7 fill-yellow-400 text-yellow-400' />
          <h1 className='text-3xl font-bold text-gray-900'>Starred Rides</h1>
        </div>

        {isLoading ? (
          <div className='flex justify-center py-16'>
            <div className='w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin' />
          </div>
        ) : error ? (
          <p className='text-red-500 text-sm'>{error}</p>
        ) : starredPosts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <Star className='w-12 h-12 text-gray-200 mb-4' />
            <p className='text-gray-500 font-medium'>No starred rides yet</p>
            <p className='text-gray-400 text-sm mt-1'>Tap the star on any ride to save it here</p>
          </div>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {starredPosts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                initialStarred={true}
                onStarChange={handleStarChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StarredPage;
