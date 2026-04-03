import React from 'react';
import PostCard from './PostCard';


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
    currentUser
}) => {
    const locationEnabled = coords !== null;
    const filteredPosts = posts;

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
                </div>

                <p className="text-gray-600">
                    {subheading ||
                        (isLoading
                            ? 'Loading rides...'
                            : `${filteredPosts.length} ride${
                                  filteredPosts.length === 1 ? '' : 's'
                              } available`)}
                </p>
            </div>

            {error && (
                <p className='mb-4 text-sm text-red-600'>{error}</p>
            )}

            {isLoading ? (
                <div className='text-center py-12'>
                    <p className='text-gray-500 text-lg'>Loading rides...</p>
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
