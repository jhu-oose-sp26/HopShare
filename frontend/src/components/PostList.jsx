import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import PostCard from './PostCard';
import { Button } from '@/components/ui/button';


const PostList = ({
    posts,
    isLoading = false,
    error = '',
    onDeletePost,
    onUpdatePost,
    coords,
    routeSearch,
    heading = 'Available Rides',
    subheading = '',
    emptyTitle = 'No rides available yet.',
    emptyDescription = 'Try to create a ride with the above button!',
    showActions = false,
    currentUser,
    onRefresh,
    lastUpdatedAt = null,
}) => {
    const [dateOrder, setDateOrder] = useState('asc');
    const [timeOrder, setTimeOrder] = useState('asc');
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const locationEnabled = coords !== null;

    const filteredPosts = [...posts].sort((a, b) => {
        const dateA = a.trip?.date || '';
        const dateB = b.trip?.date || '';
        if (dateA !== dateB) {
            return dateOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        }
        const timeA = a.trip?.time || '00:00';
        const timeB = b.trip?.time || '00:00';
        return timeOrder === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
    });

    return (
        <div className='container mx-auto px-6 py-8 max-w-6xl'>
            {!locationEnabled && (
                <p className="mb-4 text-sm text-red-600">
                    Location is turned off. Distance filtering will not work. Please enable and reload.
                </p>
            )}

            <div className='mb-6'>
                <div className="flex justify-between items-center mb-2">
                    <h2 className='text-xl font-semibold text-gray-900'>
                        {heading}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                        {onRefresh ? (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={async () => {
                                    setIsManualRefreshing(true);
                                    try { await onRefresh(); } catch { /* ignore */ }
                                    setIsManualRefreshing(false);
                                }}
                                disabled={isLoading || isManualRefreshing}
                            >
                                <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                                Refresh Posts
                            </Button>
                        ) : null}
                        <button
                            onClick={() => setDateOrder(o => o === 'asc' ? 'desc' : 'asc')}
                            className="px-2 py-1 rounded border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-500"
                        >
                            Date {dateOrder === 'asc' ? '↑' : '↓'}
                        </button>
                        <button
                            onClick={() => setTimeOrder(o => o === 'asc' ? 'desc' : 'asc')}
                            className="px-2 py-1 rounded border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-500"
                        >
                            Time {timeOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                <p className="text-gray-600">
                    {subheading ||
                        (isLoading
                            ? 'Loading rides...'
                            : `${filteredPosts.length} ride${
                                  filteredPosts.length === 1 ? '' : 's'
                              } available`)}
                </p>
                {lastUpdatedAt ? (
                    <p className='mt-1 text-xs text-gray-400'>
                        Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
                    </p>
                ) : null}
            </div>

            {error && (
                <p className='mb-4 text-sm text-red-600'>{error}</p>
            )}

            {isLoading ? (
                <div className='flex flex-col items-center justify-center py-20 gap-4'>
                    <div className='w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin' />
                    <p className='text-sm text-gray-400 animate-pulse'>Loading rides...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className='text-center py-12'>
                    <p className='text-gray-500 text-lg'>{emptyTitle}</p>
                    <p className='text-gray-400'>{emptyDescription}</p>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className='text-center py-12'>
                    <p className='text-gray-500 text-lg'>
                        No rides match the current filters.
                    </p>
                    <p className='text-gray-400'>
                        Adjust the ride type or distance filter to see more
                        results.
                    </p>
                </div>
            ) : (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post._id}
                            post={post}
                            onDelete={() => onDeletePost?.(post._id)}
                            onUpdate={(formData) => onUpdatePost?.(post._id, formData)}
                            coords={coords}
                            showActions={showActions}
                            currentUser={currentUser}
                            routeSearch={routeSearch}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PostList;
