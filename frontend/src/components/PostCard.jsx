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

const PostCard = ({ post, onDelete, onUpdate, coords }) => {
    const { _id, title, description, user, trip, type = 'request' } = post;
    const isOffer = type === 'offer';
    const startLocationLabel =
        typeof trip?.startLocation === 'string'
            ? trip.startLocation
            : trip?.startLocation?.title || '';
    const endLocationLabel =
        typeof trip?.endLocation === 'string'
            ? trip.endLocation
            : trip?.endLocation?.title || '';
    const startLat = Number(trip?.startLocation?.gps_coordinates?.latitude);
    const startLng = Number(trip?.startLocation?.gps_coordinates?.longitude);
    const endLat = Number(trip?.endLocation?.gps_coordinates?.latitude);
    const endLng = Number(trip?.endLocation?.gps_coordinates?.longitude);
    const hasStartCoords = Number.isFinite(startLat) && Number.isFinite(startLng);
    const hasEndCoords = Number.isFinite(endLat) && Number.isFinite(endLng);
    const hasRouteCoords = hasStartCoords && hasEndCoords;

    const mapEmbedUrl = hasRouteCoords
        ? `https://maps.google.com/maps?output=embed&saddr=${startLat},${startLng}&daddr=${endLat},${endLng}`
        : hasStartCoords
          ? `https://maps.google.com/maps?q=${startLat},${startLng}&z=14&output=embed`
          : hasEndCoords
            ? `https://maps.google.com/maps?q=${endLat},${endLng}&z=14&output=embed`
            : '';

    const mapsRouteUrl = hasRouteCoords
        ? `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}`
        : '';

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
                        {startLocationLabel && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-green-600' />
                                <span className='text-gray-600'>
                                    From: {startLocationLabel}
                                </span>
                            </div>
                        )}
                        {endLocationLabel && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-red-600' />
                                <span className='text-gray-600'>
                                    To: {endLocationLabel}
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

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant='outline' size='sm'>
                            Details
                        </Button>
                    </DialogTrigger>

                    <DialogContent className='sm:max-w-[560px]'>
                        <DialogHeader>
                            <DialogTitle>Ride Details</DialogTitle>
                            <DialogDescription>
                                Full trip and contact info for this post.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4 text-sm'>
                            <div>
                                <p className='font-medium text-gray-900'>Title</p>
                                <p className='text-gray-600'>{title}</p>
                            </div>

                            {description && (
                                <div>
                                    <p className='font-medium text-gray-900'>Description</p>
                                    <p className='text-gray-600'>{description}</p>
                                </div>
                            )}

                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div>
                                    <p className='font-medium text-gray-900'>Rider</p>
                                    <p className='text-gray-600'>{user?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className='font-medium text-gray-900'>Email</p>
                                    <p className='text-gray-600'>{user?.email || 'N/A'}</p>
                                </div>
                            </div>

                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div>
                                    <p className='font-medium text-gray-900'>From</p>
                                    <p className='text-gray-600'>
                                        {startLocationLabel || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className='font-medium text-gray-900'>To</p>
                                    <p className='text-gray-600'>
                                        {endLocationLabel || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div>
                                    <p className='font-medium text-gray-900'>Date</p>
                                    <p className='text-gray-600'>{trip?.date || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className='font-medium text-gray-900'>Time</p>
                                    <p className='text-gray-600'>{trip?.time || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <p className='font-medium text-gray-900'>Post ID</p>
                                <p className='text-gray-600'>#{_id?.slice(-6) || 'N/A'}</p>
                            </div>

                            <div>
                                <p className='font-medium text-gray-900 mb-2'>Map</p>
                                {mapEmbedUrl ? (
                                    <div className='space-y-2'>
                                        <div className='h-56 w-full overflow-hidden rounded-md border border-gray-200'>
                                            <iframe
                                                title={`Trip map for post ${_id || 'unknown'}`}
                                                src={mapEmbedUrl}
                                                loading='lazy'
                                                className='h-full w-full'
                                                referrerPolicy='no-referrer-when-downgrade'
                                            />
                                        </div>
                                        {mapsRouteUrl && (
                                            <a
                                                href={mapsRouteUrl}
                                                target='_blank'
                                                rel='noreferrer'
                                                className='text-sm text-blue-600 hover:underline'
                                            >
                                                Open route in Google Maps
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <p className='text-gray-600'>
                                        Map preview is unavailable because coordinates were not saved for this post.
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

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
