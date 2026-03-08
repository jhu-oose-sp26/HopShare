import React, { useState } from 'react';
import PostCard from './PostCard';
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { getDistanceFromLatLonInKm } from "@/lib/utils";

const PostList = ({ posts, isLoading = false, error = '', onDeletePost, onUpdatePost, coords }) => {
    const [typeFilter, setTypeFilter] = useState("all");
    const [distanceFilter, setDistanceFilter] = useState("all");

    const hasActiveFilters = typeFilter !== "all" || distanceFilter !== "all";

    const distanceOptions = [
        { value: 0.5, label: "500m" },
        { value: 1, label: "1 km" },
        { value: 5, label: "5 km" },
        { value: 10, label: "10 km" }
    ];

    const filteredPosts = posts.filter((post) => {
        if (typeFilter !== "all" && post.type !== typeFilter) {
            return false;
        }

        if (distanceFilter !== "all" && coords && post.trip?.startLocation?.gps_coordinates) {
            const distance = getDistanceFromLatLonInKm(
                coords.lat,
                coords.lng,
                post.trip.startLocation.gps_coordinates.latitude,
                post.trip.startLocation.gps_coordinates.longitude
            );

            if (distance > distanceFilter) {
                return false;
            }
        }

        return true;
    });
    //style for each filter button
    const filterItemStyle = "border border-gray-300 data-[state=on]:bg-black data-[state=on]:text-white";

    return (
        <div className='container mx-auto px-6 py-8 max-w-6xl'>
            <div className='mb-6'>
                <div className="flex justify-between items-center mb-2">
                    <h2 className='text-xl font-semibold text-gray-900'>
                        Available Rides
                    </h2>
                   {/*Filters Menu*/}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="relative">
                                Filters

                                {hasActiveFilters && (
                                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-64">

                            <DropdownMenuLabel>Ride Type</DropdownMenuLabel>

                            <ToggleGroup
                                type="single"
                                value={typeFilter}
                                onValueChange={(v) => v && setTypeFilter(v)}
                            >
                                <ToggleGroupItem value="all" className={filterItemStyle}>All</ToggleGroupItem>
                                <ToggleGroupItem value="offer" className={filterItemStyle}>Offering</ToggleGroupItem>
                                <ToggleGroupItem value="request" className={filterItemStyle}>Requesting</ToggleGroupItem>
                            </ToggleGroup>

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel>Distance from Current Location</DropdownMenuLabel>

                            <ToggleGroup
                                type="single"
                                value={distanceFilter}
                                onValueChange={(v) => v && setDistanceFilter(v)}
                            >
                                {distanceOptions.map((option) => (
                                        <ToggleGroupItem
                                            key={option.value}
                                            value={option.value}
                                            className={filterItemStyle}
                                        >
                                            {option.label}
                                        </ToggleGroupItem>
                                ))}
                            </ToggleGroup>

                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                 <p className="text-gray-600">
                        {isLoading ? "Loading rides..." : `${filteredPosts.length} rides available`}
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
