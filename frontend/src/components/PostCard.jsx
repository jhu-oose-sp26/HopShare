import React from 'react';
import { MapPin, Calendar, Clock, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PostCard = ({ post }) => {
    const { _id, title, description, user, trip } = post;

    return (
        <div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow'>
            {/* Header with user info and post ID */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                        <User className='w-5 h-5 text-blue-600' />
                    </div>
                    <div>
                        <h3 className='font-semibold text-gray-900'>{title}</h3>
                        <p className='text-sm text-gray-500'>
                            {user.name} ({user.email})
                        </p>
                    </div>
                </div>
                <span className='text-xs text-gray-400'>#{_id?.slice(-6)}</span>
            </div>

            {/* Post content */}
            <p className='text-gray-700 mb-4'>{description}</p>

            {/* Trip details (if exists) */}
            {trip && (
                <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>
                        Trip Details
                    </h4>
                    <div className='space-y-2'>
                        {trip.startLocation && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-green-600' />
                                <span className='text-gray-600'>
                                    From: {trip.startLocation}
                                </span>
                            </div>
                        )}
                        {trip.endLocation && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-red-600' />
                                <span className='text-gray-600'>
                                    To: {trip.endLocation}
                                </span>
                            </div>
                        )}
                        <div className='flex items-center gap-4'>
                            {trip.date && (
                                <div className='flex items-center gap-1 text-sm'>
                                    <Calendar className='w-4 h-4 text-gray-500' />
                                    <span className='text-gray-600'>
                                        {trip.date}
                                    </span>
                                </div>
                            )}
                            {trip.time && (
                                <div className='flex items-center gap-1 text-sm'>
                                    <Clock className='w-4 h-4 text-gray-500' />
                                    <span className='text-gray-600'>
                                        {trip.time}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className='flex gap-2'>
                <Button variant='default' size='sm' className='flex-1'>
                    <MessageCircle className='w-4 h-4 mr-1' />
                    Contact
                </Button>
                <Button variant='outline' size='sm'>
                    Details
                </Button>
            </div>
        </div>
    );
};

export default PostCard;
