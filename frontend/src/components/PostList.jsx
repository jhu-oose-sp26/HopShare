import React, { useState } from 'react';
import PostCard from './PostCard';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PostList = ({ posts, isLoading = false, error = '', onDeletePost, onUpdatePost, coords }) => {
    const [filter, setFilter] = useState("all");

    const filteredPosts = posts.filter((post) => {
        if (filter === "all") return true;
        return post.type === filter;
    });

    return (
        <div className='container mx-auto px-6 py-8 max-w-6xl'>
            <div className='mb-6'>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                    Available Rides
                </h2>

                <div className="flex justify-between items-center">
                    <p className='text-gray-600'>
                        {isLoading ? 'Loading rides...' : `${filteredPosts.length} rides available`}
                    </p>

                    <ToggleGroup
                        type="single"
                        value={filter}
                        onValueChange={(value) => value && setFilter(value)}
                    >
                        <ToggleGroupItem value="all" className="data-[state=on]:bg-black data-[state=on]:text-white">
                            All
                        </ToggleGroupItem>

                        <ToggleGroupItem value="offer" className="data-[state=on]:bg-black data-[state=on]:text-white">
                            Offering
                        </ToggleGroupItem>

                        <ToggleGroupItem value="request" className="data-[state=on]:bg-black data-[state=on]:text-white">
                            Requesting
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
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
                    <p className='text-gray-500 text-lg'>
                        No rides available yet.
                    </p>
                    <p className='text-gray-400'>
                        Be the first to create a ride above!
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PostList;
