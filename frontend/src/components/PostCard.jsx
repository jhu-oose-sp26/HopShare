import React, { useMemo, useState } from 'react';

function formatTime(time) {
    if (!time) return time;
    const [hourStr, minute] = time.split(':');
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return time;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${period}`;
}
import { MapPin, Calendar, Clock, MessageCircle, Pencil, Trash2, Info, User, Mail, Phone, Navigation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import SubmitBox from './SubmitBox';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const NOTIFICATIONS_ENDPOINT = `${API_ROOT}/notifications`;

const PostCard = ({ post, onDelete, onUpdate, coords, currentUser }) => {
    const { _id, title, description, user, trip, type = 'request', createdAt } = post;
    const isOffer = type === 'offer';

    const [editOpen, setEditOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [message, setMessage] = useState('');
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
        <div className='relative rounded-xl border border-gray-200 bg-white px-6 pt-10 pb-6 shadow-sm hover:shadow-md transition-shadow'>
            {/* Edit button — top left */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                    <button className='absolute top-3 left-3 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'>
                        <Pencil className='w-4 h-4' />
                    </button>
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

            {/* Delete button — top right */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                    <button className='absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors'>
                        <Trash2 className='w-4 h-4' />
                    </button>
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
                        <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header: badge + title + ID */}
            <div className='flex items-start justify-between mb-3'>
                <div className='flex items-center gap-2 flex-wrap'>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${isOffer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isOffer ? 'Offering' : 'Requesting'}
                    </span>
                    <h3 className='font-semibold text-gray-900 break-words'>{title}</h3>
                </div>
                <span className='text-xs text-gray-400 shrink-0 ml-2'>#{_id?.slice(-6)}</span>
            </div>
            <p className='text-sm text-gray-500 mb-4 truncate'>{user.name} · {user.email}</p>

            {/* Post content */}
            <p className='text-gray-700 mb-4 break-words'>
                {description.length > 100
                ? `${description.slice(0, 100)}...`
                : description}
            </p>

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
                                <span className='text-gray-600 break-words'>
                                    From: {trip.startLocation.title}
                                </span>
                            </div>
                        )}
                        {trip.endLocation?.title && (
                            <div className='flex items-center gap-2 text-sm'>
                                <MapPin className='w-4 h-4 text-red-600' />
                                <span className='text-gray-600 break-words'>
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
                                        {formatTime(trip.time)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className='flex flex-wrap gap-2'>
                {/* Contact Dialog */}

                <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                    <DialogTrigger asChild>
                        <Button variant='default' size='sm' className='flex-1'>
                            <MessageCircle className='w-4 h-4 mr-1' />
                            Contact
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="truncate max-w-[20rem]">
                                Contact {user?.name}
                            </DialogTitle>
                            <DialogDescription>
                                Send a message about this ride.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your message..."
                            className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                setContactOpen(false);
                                setMessage('');
                                }}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={async () => {
                                console.log('Send message:', {
                                    to: user?.email,
                                    message,
                                    postId: _id,
                                });
                                console.log(post.user)
                                await fetch(NOTIFICATIONS_ENDPOINT, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        recipientEmail: post.user.email,
                                        senderName: currentUser.name,
                                        senderId: currentUser._id,
                                        message,
                                        postId: post._id,
                                    }),
                                });

                                setContactOpen(false);
                                setMessage('');
                                }}
                                disabled={!message.trim()}
                            >
                                Send Message
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Details Dialog */}
                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <DialogTrigger asChild>
                        <Button variant='outline' size='sm'>
                            <Info className='w-4 h-4 mr-1' />
                            Details
                        </Button>
                    </DialogTrigger>

                    <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
                        <DialogHeader>
                            <div className='flex items-center gap-3'>
                                <DialogTitle className='text-lg font-bold'>{title}</DialogTitle>
                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${isOffer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isOffer ? 'Offering' : 'Requesting'}
                                </span>
                            </div>
                            {createdAt && (
                                <p className='text-xs text-gray-400 flex items-center gap-1 mt-1'>
                                    <Clock className='w-3 h-3' />
                                    Posted {new Date(createdAt).toLocaleString()}
                                </p>
                            )}
                        </DialogHeader>

                        <div className='space-y-3 text-sm'>
                            {/* Poster info */}
                            <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Contact</p>
                                <div className='flex items-center gap-2 text-gray-700'>
                                    <User className='w-4 h-4 text-gray-400 shrink-0' />
                                    <span>{user?.name || '—'}</span>
                                </div>
                                <div className='flex items-center gap-2 text-gray-700'>
                                    <Mail className='w-4 h-4 text-gray-400 shrink-0' />
                                    <span>{user?.email || '—'}</span>
                                </div>
                                <div className='flex items-center gap-2 text-gray-700'>
                                    <Phone className='w-4 h-4 text-gray-400 shrink-0' />
                                    <span>{user?.phone || '—'}</span>
                                </div>
                            </div>

                            {/* Description */}
                            {description && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Description</p>
                                    <p className='text-gray-700 break-words whitespace-pre-wrap'>{description}</p>
                                </div>
                            )}

                            {/* Trip details */}
                            {trip && (
                                <>
                                    <div className='bg-gray-50 rounded-lg p-3 space-y-3'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Route</p>

                                        {/* Start */}
                                        <div className='flex gap-3'>
                                            <div className='flex flex-col items-center pt-0.5'>
                                                <MapPin className='w-4 h-4 text-green-500 shrink-0' />
                                                <div className='w-px flex-1 bg-gray-300 my-1' />
                                            </div>
                                            <div className='pb-2'>
                                                <p className='text-xs text-gray-400 mb-0.5'>From</p>
                                                {trip.startLocation?.title
                                                    ? <a
                                                        href={
                                                            trip.startLocation.gps_coordinates?.latitude != null
                                                                ? `https://www.google.com/maps?q=${trip.startLocation.gps_coordinates.latitude},${trip.startLocation.gps_coordinates.longitude}`
                                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.startLocation.title)}`
                                                        }
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1'
                                                    >
                                                        {trip.startLocation.title}
                                                        <ExternalLink className='w-3 h-3' />
                                                    </a>
                                                    : <span className='font-medium text-gray-700'>—</span>}
                                                {trip.startLocation?.gps_coordinates?.latitude != null && (
                                                    <p className='text-xs text-gray-400 mt-0.5 font-mono'>
                                                        {trip.startLocation.gps_coordinates.latitude}, {trip.startLocation.gps_coordinates.longitude}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* End */}
                                        <div className='flex gap-3'>
                                            <MapPin className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                                            <div>
                                                <p className='text-xs text-gray-400 mb-0.5'>To</p>
                                                {trip.endLocation?.title
                                                    ? <a
                                                        href={
                                                            trip.endLocation.gps_coordinates?.latitude != null
                                                                ? `https://www.google.com/maps?q=${trip.endLocation.gps_coordinates.latitude},${trip.endLocation.gps_coordinates.longitude}`
                                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.endLocation.title)}`
                                                        }
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1'
                                                    >
                                                        {trip.endLocation.title}
                                                        <ExternalLink className='w-3 h-3' />
                                                    </a>
                                                    : <span className='font-medium text-gray-700'>—</span>}
                                                {trip.endLocation?.gps_coordinates?.latitude != null && (
                                                    <p className='text-xs text-gray-400 mt-0.5 font-mono'>
                                                        {trip.endLocation.gps_coordinates.latitude}, {trip.endLocation.gps_coordinates.longitude}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Route map */}
                                    {trip.startLocation?.gps_coordinates?.latitude != null &&
                                     trip.endLocation?.gps_coordinates?.latitude != null && (
                                        <div className='rounded-lg overflow-hidden border border-gray-200 h-80'>
                                            <iframe
                                                title='Route map'
                                                src={`https://maps.google.com/maps?output=embed&saddr=${trip.startLocation.gps_coordinates.latitude},${trip.startLocation.gps_coordinates.longitude}&daddr=${trip.endLocation.gps_coordinates.latitude},${trip.endLocation.gps_coordinates.longitude}`}
                                                className='w-full h-full'
                                                loading='lazy'
                                                referrerPolicy='no-referrer-when-downgrade'
                                            />
                                        </div>
                                    )}

                                    {/* Date & Time */}
                                    {(trip.date || trip.time) && (
                                        <div className='bg-gray-50 rounded-lg p-3 flex gap-4'>
                                            {trip.date && (
                                                <div className='flex items-center gap-2 text-gray-700'>
                                                    <Calendar className='w-4 h-4 text-gray-400 shrink-0' />
                                                    <span>{trip.date}</span>
                                                </div>
                                            )}
                                            {trip.time && (
                                                <div className='flex items-center gap-2 text-gray-700'>
                                                    <Clock className='w-4 h-4 text-gray-400 shrink-0' />
                                                    <span>{formatTime(trip.time)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Directions button */}
                                    {(trip.startLocation?.title || trip.startLocation?.gps_coordinates?.latitude != null) &&
                                     (trip.endLocation?.title || trip.endLocation?.gps_coordinates?.latitude != null) && (
                                        <a
                                            href={(() => {
                                                const start = trip.startLocation.gps_coordinates?.latitude != null
                                                    ? `${trip.startLocation.gps_coordinates.latitude},${trip.startLocation.gps_coordinates.longitude}`
                                                    : encodeURIComponent(trip.startLocation.title);
                                                const end = trip.endLocation.gps_coordinates?.latitude != null
                                                    ? `${trip.endLocation.gps_coordinates.latitude},${trip.endLocation.gps_coordinates.longitude}`
                                                    : encodeURIComponent(trip.endLocation.title);
                                                return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}`;
                                            })()}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 transition-colors'
                                        >
                                            <Navigation className='w-4 h-4' />
                                            Open Route in Google Maps
                                        </a>
                                    )}
                                </>
                            )}
                        </div>

                        <DialogClose asChild>
                            <Button variant='outline' className='w-full'>Close</Button>
                        </DialogClose>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
};

export default PostCard;
