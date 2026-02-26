import React from 'react';
import { MapPin, Calendar, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PostCard = ({ post }) => {
    const { _id, title, description, user, trip, type = 'request' } = post;
    const isOffer = type === 'offer';

    return (
        <div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow'>
            {/* Ride type badge */}
            <div className='flex justify-center mb-4'>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${isOffer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isOffer ? 'Offering' : 'Requesting'}
                </span>
            </div>

            {/* Header with user info and post ID */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
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
                        {trip.startLocation?.title && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-green-600' />
                                <span className='text-gray-600'>
                                    From: {trip.startLocation.title}
                                </span>
                            </div>
                        )}
                        {trip.endLocation?.title && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-red-600' />
                                <span className='text-gray-600'>
                                    To: {trip.endLocation.title}
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
