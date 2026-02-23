import React from 'react';
import PostCard from './PostCard';

const PostList = ({ posts }) => {
    return (
        <div className='container mx-auto px-6 py-8 max-w-6xl'>
            <div className='mb-6'>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                    Available Rides
                </h2>
                <p className='text-gray-600'>{posts.length} rides available</p>
            </div>

            {posts.length === 0 ? (
                <div className='text-center py-12'>
                    <p className='text-gray-500 text-lg'>
                        No rides available yet.
                    </p>
                    <p className='text-gray-400'>
                        Be the first to create a ride above!
                    </p>
                </div>
            ) : (
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PostList;
