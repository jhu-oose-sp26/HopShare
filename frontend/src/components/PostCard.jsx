import React, { useMemo, useState } from 'react';
import { MapPin, Calendar, Clock, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import SubmitBox from './SubmitBox';
import { getDistanceFromLatLonInKm } from '@/lib/utils';

const PostCard = ({ post, onDelete, onUpdate, coords }) => {
    const { _id, title, description, user, trip, type = 'request' } = post;
    const isOffer = type === 'offer';

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Build initialData for SubmitBox from existing post
    const initialData = useMemo(() => ({
        type: type ?? 'request',
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        startTitle: trip?.startLocation?.title ?? '',
        startLatitude: trip?.startLocation?.gps_coordinates?.latitude ?? '',
        startLongitude: trip?.startLocation?.gps_coordinates?.longitude ?? '',
        endTitle: trip?.endLocation?.title ?? '',
        endLatitude: trip?.endLocation?.gps_coordinates?.latitude ?? '',
        endLongitude: trip?.endLocation?.gps_coordinates?.longitude ?? '',
        date: trip?.date ?? '',
        time: trip?.time ?? '',
        description: description ?? '',
    }), [type, user, trip, description]);

    const handleEditSubmit = async (formData) => {
        await onUpdate?.(formData);
        setEditOpen(false);
    };

    const handleDelete = async () => {
        setDeleteError('');
        setIsDeleting(true);

        try {
            await onDelete?.();
            setDeleteOpen(false);
        } catch (err) {
            setDeleteError(
                err instanceof Error ? err.message : 'Failed to delete ride'
            );
        } finally {
            setIsDeleting(false);
        }
    };

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
            <div className='flex flex-wrap gap-2'>
                <Button variant='default' size='sm' className='flex-1'>
                    <MessageCircle className='w-4 h-4 mr-1' />
                    Contact
                </Button>

                {/* Edit Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant='outline' size='sm'>
                            <Pencil className='w-4 h-4 mr-1' />
                            Edit
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Ride</DialogTitle>
                        </DialogHeader>

                        <SubmitBox
                            onSubmit={handleEditSubmit}
                            coords={coords}
                            initialData={initialData}
                        />
                    </DialogContent>
                </Dialog>

                <Button variant='outline' size='sm'>
                    Details
                </Button>

                <h1>
                    {(Math.round(getDistanceFromLatLonInKm(initialData.startLatitude,
                        initialData.startLongitude,
                        initialData.endLatitude,
                        initialData.endLongitude)*100))/100}
                </h1>
                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogTrigger asChild>
                        <Button variant='destructive' size='sm'>
                            <Trash2 className='w-4 h-4 mr-1' />
                            Delete
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Delete Ride</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this ride? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        {deleteError && (
                            <p className='text-sm text-red-600'>{deleteError}</p>
                        )}

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setDeleteOpen(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant='destructive'
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default PostCard;
