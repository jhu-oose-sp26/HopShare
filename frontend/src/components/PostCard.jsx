import { calculateDistance } from './RouteMap';
import RouteMap from './RouteMap';
import WeatherDisplay from './WeatherDisplay';
import WeatherForecastDialog from './WeatherForecastDialog';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTime, formatDate } from '@/lib/utils';
import { MapPin, Calendar, Clock, MessageCircle, Pencil, Trash2, Info, User, Mail, Phone, Navigation, ExternalLink, UserPlus, Users, UserMinus, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
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

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const NOTIFICATIONS_ENDPOINT = `${API_ROOT}/notifications`;

const PostCard = ({ post, onDelete, onUpdate, coords, showActions = false, routeSearch, distanceFilter, currentUser, initialStarred = false, onStarChange }) => {
    const { _id, title, description, user, trip, type = 'request', createdAt, suggestedPrice } = post;
    const navigate = useNavigate();
    const isOffer = type === 'offer';
    const truncatedDescription = description 
    ? (description.length > 50 ? `${description.slice(0, 50)}...` : description)
    : '';
    const displayName = user?.name || 'User';
    const displayEmail = user?.email || '—';
    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e5e7eb&color=374151&size=64`;
    const avatarSrc = user?.avatar || user?.picture || avatarFallback;
    const [editOpen, setEditOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [joinListMessageOpen, setJoinListMessageOpen] = useState(false);
    const [offerMessageOpen, setOfferMessageOpen] = useState(false);
    const [weatherForecastOpen, setWeatherForecastOpen] = useState(false);
    const [offerConfirmOpen, setOfferConfirmOpen] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [selectedWeatherLocation, setSelectedWeatherLocation] = useState(null);
    const [joinListMessage, setJoinListMessage] = useState('');
    const [offerMessage, setOfferMessage] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [activeMapTab, setActiveMapTab] = useState("route"); // "route" or "distance"
    // "Take" button — persisted in post.pendingDrivers / post.drivers
    const [driverList, setDriverList] = useState(() => post.drivers || []);
    const [joinRequested, setJoinRequested] = useState(() => {
        if (!currentUser) return false;
        return (post.drivers || []).some(d => d.email === currentUser.email)
            || (post.pendingDrivers || []).some(d => d.email === currentUser.email);
    });
    // Rider list — persisted in post.riderList
    const [listMembers, setListMembers] = useState(() => post.riderList || []);
    const listJoined = currentUser ? listMembers.some(u => u.email === currentUser.email) : false;
    const isDriverListMember = currentUser ? driverList.some(d => d.email === currentUser.email) : false;
    const [listJoinLoading, setListJoinLoading] = useState(false);
    const [listJoinError, setListJoinError] = useState('');
    const [listRequestSent, setListRequestSent] = useState(() => {
        if (!currentUser) return false;
        return (post.pendingJoins || []).includes(currentUser.email);
    });
    const [isStarred, setIsStarred] = useState(initialStarred);

    const handleStarToggle = async () => {
        if (!currentUser) return;
        const next = !isStarred;
        setIsStarred(next);
        try {
            await fetch(`${API_ROOT}/posts/${_id}/star`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email }),
            });
            onStarChange?.(_id, next);
        } catch {
            setIsStarred(!next);
        }
    };

    const maxRiders = post.maxRiders ?? null;
    const isFull = maxRiders != null && listMembers.length >= maxRiders;
    const isOwner = currentUser && post.user?.email && currentUser.email === post.user.email;
    const canManagePost = showActions && isOwner;
    const riderRequestStatus = !currentUser || isOwner || !isOffer
        ? null
        : listJoined
            ? {
                badgeClassName: 'bg-green-100 text-green-700',
                title: 'Request accepted',
                description: 'You are on the rider list for this trip.',
            }
            : listRequestSent
                ? {
                    badgeClassName: 'bg-amber-100 text-amber-700',
                    title: 'Awaiting poster approval',
                    description: 'Your join request has been sent and is waiting for the poster to respond.',
                }
                : null;

    useEffect(() => {
        setDriverList(post.drivers || []);
        setListMembers(post.riderList || []);

        if (!currentUser) {
            setJoinRequested(false);
            setListRequestSent(false);
            return;
        }

        setJoinRequested(
            (post.drivers || []).some(d => d.email === currentUser.email)
            || (post.pendingDrivers || []).some(d => d.email === currentUser.email)
        );
        setListRequestSent((post.pendingJoins || []).includes(currentUser.email));
    }, [post.drivers, post.pendingDrivers, post.pendingJoins, post.riderList, currentUser]);

    // Function to handle weather forecast dialog opening
    const openWeatherForecast = (location) => {
        setSelectedWeatherLocation(location);
        setWeatherForecastOpen(true);
    };

    // Function to handle chatting
    const handleChatClick = async () => {
        try {
            const viewerEmail = encodeURIComponent(currentUser?.email || '');
            const response = await fetch(`${API_ROOT}/chat/${_id}?viewerEmail=${viewerEmail}`);
            if (!response.ok) {
                throw new Error('Failed to get/create chat');
            }
            const chat = await response.json();
            navigate("/chat", { state: { chatId: chat._id, postId: _id } });
        } catch (error) {
            console.error('Error opening chat:', error);
            // Fallback to navigate without chat
            navigate("/chat", { state: { postId: _id } });
        }
    };

    // Calculate distances from user's route to post's locations
    const getDistanceToPost = () => {
        if (!routeSearch || !trip) return null;
        
        const distances = {};
        
        // Distance from user's start to post's start
        if (routeSearch.start && trip.startLocation?.gps_coordinates) {
            const startLat = Number(routeSearch.start.latitude);
            const startLng = Number(routeSearch.start.longitude);
            const postStartLat = Number(trip.startLocation.gps_coordinates.latitude);
            const postStartLng = Number(trip.startLocation.gps_coordinates.longitude);
            
            if (isFinite(startLat) && isFinite(startLng) && isFinite(postStartLat) && isFinite(postStartLng)) {
                distances.startToStart = calculateDistance(startLat, startLng, postStartLat, postStartLng);
            }
        }
        
        // Distance from user's end to post's end
        if (routeSearch.end && trip.endLocation?.gps_coordinates) {
            const endLat = Number(routeSearch.end.latitude);
            const endLng = Number(routeSearch.end.longitude);
            const postEndLat = Number(trip.endLocation.gps_coordinates.latitude);
            const postEndLng = Number(trip.endLocation.gps_coordinates.longitude);
            
            if (isFinite(endLat) && isFinite(endLng) && isFinite(postEndLat) && isFinite(postEndLng)) {
                distances.endToEnd = calculateDistance(endLat, endLng, postEndLat, postEndLng);
            }
        }
        
        return distances;
    };

    const distances = getDistanceToPost();
    
    // Prepare route data for the map
    const getPostRoute = () => {
        if (!trip?.startLocation?.gps_coordinates || !trip?.endLocation?.gps_coordinates) {
            return null;
        }
        
        return {
            start: {
                lat: Number(trip.startLocation.gps_coordinates.latitude),
                lng: Number(trip.startLocation.gps_coordinates.longitude),
                title: trip.startLocation.title || 'Start Location'
            },
            end: {
                lat: Number(trip.endLocation.gps_coordinates.latitude),
                lng: Number(trip.endLocation.gps_coordinates.longitude),
                title: trip.endLocation.title || 'End Location'
            }
        };
    };
    
    const postRoute = getPostRoute();
    
    // Prepare user route for map if routeSearch is available
    const getUserRouteForMap = () => {
        if (!routeSearch) return null;
        
        return {
            start: routeSearch.start ? {
                lat: Number(routeSearch.start.latitude),
                lng: Number(routeSearch.start.longitude),
                title: routeSearch.start.title || 'Your Start'
            } : null,
            end: routeSearch.end ? {
                lat: Number(routeSearch.end.latitude),
                lng: Number(routeSearch.end.longitude),
                title: routeSearch.end.title || 'Your Destination'
            } : null
        };
    };
    
    const userRouteForMap = getUserRouteForMap();

    // Check if weather should be displayed (within 14 days and not in the past)
    const shouldShowWeather = () => {
        if (!trip?.date) return false;
        
        const targetDate = new Date(trip.date);
        const today = new Date();
        
        // Reset time to start of day for accurate day comparison
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        // Only show weather for dates that are today or in the future, and within 14 days
        return diffDays >= 0 && diffDays <= 14;
    };

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
        maxRiders: post.maxRiders ?? '',
    }), [type, user, trip, description, post.maxRiders]);

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
        <div className={`relative rounded-xl border border-gray-200 bg-white px-6 pb-6 shadow-sm hover:shadow-md transition-shadow ${canManagePost ? 'pt-10' : 'pt-6'}`}>
            {/* Star button — top right, visible to all logged-in users */}
            {currentUser && (
                <button
                    className='absolute top-3 right-3 p-1.5 rounded-md transition-colors hover:bg-yellow-50'
                    onClick={handleStarToggle}
                    aria-label={isStarred ? 'Unstar ride' : 'Star ride'}
                >
                    <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                </button>
            )}
            {canManagePost && (
                <>
                    {/* Edit button — top left */}
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogTrigger asChild>
                            <button className='absolute top-3 left-3 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'>
                                <Pencil className='w-4 h-4' />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                            <DialogDescription className="sr-only">
                                Edit ride post form
                            </DialogDescription>
                            <DialogHeader>
                                <DialogTitle>Edit Ride</DialogTitle>
                            </DialogHeader>
                            <SubmitBox
                                onSubmit={handleEditSubmit}
                                coords={coords}
                                initialData={initialData}
                                isEdit={true}
                            />
                        </DialogContent>
                    </Dialog>

                    {/* Delete button — shifted left to make room for star */}
                    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <DialogTrigger asChild>
                            <button className='absolute top-3 right-9 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors'>
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
                </>
            )}

            {/* Header: poster info + badge + title + ID */}
            <div className='flex items-start justify-between gap-3 mb-3'>
                <div className='flex items-start gap-3 min-w-0 flex-1'>
                    {user?.googleId ? (
                        <button
                            onClick={() => navigate(`/user/${user.googleId}`)}
                            className='shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            aria-label={`View ${displayName}'s profile`}
                        >
                            <img
                                src={avatarSrc}
                                alt={displayName}
                                className='w-11 h-11 rounded-full border border-gray-200 object-cover'
                                onError={(e) => {
                                    e.target.src = avatarFallback;
                                }}
                            />
                        </button>
                    ) : (
                        <img
                            src={avatarSrc}
                            alt={displayName}
                            className='w-11 h-11 rounded-full border border-gray-200 object-cover shrink-0'
                            onError={(e) => {
                                e.target.src = avatarFallback;
                            }}
                        />
                    )}
                    <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2 flex-wrap mb-1'>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${isOffer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isOffer ? 'Offering' : 'Requesting'}
                            </span>
                            <h3 className='font-semibold text-gray-900 break-words'>{title || 'Untitled'}</h3>
                        </div>
                        <p className='text-sm text-gray-500 wrap-break-word'>
                            {user?.googleId ? (
                                <button
                                    onClick={() => navigate(`/user/${user.googleId}`)}
                                    className='text-blue-600 hover:text-blue-800 hover:underline font-medium break-all'
                                >
                                    {displayName.length > 25 ? `${displayName.slice(0, 25)}...` : displayName}
                                </button>
                            ) : (
                                <span className='text-gray-700 font-medium break-all cursor-not-allowed'>
                                    {displayName.length > 25 ? `${displayName.slice(0, 25)}...` : displayName}
                                </span>
                            )}
                            {' · '}
                            <span className='break-all'>
                                {displayEmail.length > 25 ? `${displayEmail.slice(0, 25)}...` : displayEmail}
                            </span>
                        </p>
                    </div>
                </div>
                {/* <span className='text-xs text-gray-400 shrink-0'>#{_id?.slice(-6)}</span> */}
            </div>

            {/* Post content */}
            {truncatedDescription && (
                <p className='text-gray-700 mb-4 break-all'>
                    {truncatedDescription}
                </p>
            )}

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
                        
                        {/* Weather forecast for start location - only for dates within 14 days */}
                        {trip.startLocation?.gps_coordinates && trip.date && shouldShowWeather() && (
                            <div className='mt-3'>
                                <div className='text-xs font-medium text-gray-700 mb-2'>Weather at departure:</div>
                                <WeatherDisplay 
                                    latitude={trip.startLocation.gps_coordinates.latitude}
                                    longitude={trip.startLocation.gps_coordinates.longitude}
                                    date={trip.date}
                                    time={trip.time || '12:00'}
                                    location={trip.startLocation.title}
                                    compact={true}
                                />
                            </div>
                        )}
                        
                        {/* Weather forecast for end location - only for dates within 14 days */}
                        {trip.endLocation?.gps_coordinates && trip.date && shouldShowWeather() && (
                            <div className='mt-2'>
                                <div className='text-xs font-medium text-gray-700 mb-2'>Weather at destination:</div>
                                <WeatherDisplay 
                                    latitude={trip.endLocation.gps_coordinates.latitude}
                                    longitude={trip.endLocation.gps_coordinates.longitude}
                                    date={trip.date}
                                    time={trip.time || '12:00'}
                                    location={trip.endLocation.title}
                                    compact={true}
                                />
                            </div>
                        )}
                        
                        <div className='flex items-center gap-4 mt-3'>
                            {trip.date && (
                                <div className='flex items-center gap-1 text-sm'>
                                    <Calendar className='w-4 h-4 text-gray-500' />
                                    <span className='text-gray-600'>
                                        {formatDate(trip.date)}
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

            {riderRequestStatus && (
                <div className='mb-4 rounded-lg border border-gray-200 bg-slate-50 px-4 py-3'>
                    <div className='flex items-center gap-2'>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${riderRequestStatus.badgeClassName}`}>
                            Rider Request Status
                        </span>
                        <p className='text-sm font-medium text-gray-900'>{riderRequestStatus.title}</p>
                    </div>
                    <p className='mt-1 text-sm text-gray-600'>{riderRequestStatus.description}</p>
                </div>
            )}

            {/* Driver status */}
            {(() => {
                const driver = driverList[0];
                return (
                    <div className='flex items-center gap-2 mb-4 text-sm'>
                        <User className='w-4 h-4 text-gray-400 shrink-0' />
                        {driver ? (
                            <span className='text-gray-700'>
                                Driver:{' '}
                                {driver.googleId ? (
                                    <button
                                        onClick={() => navigate(`/user/${driver.googleId}`)}
                                        className='font-medium text-blue-600 hover:underline hover:text-blue-800'
                                    >
                                        {driver.name || driver.email}
                                    </button>
                                ) : (
                                    <span className='font-medium'>{driver.name || driver.email}</span>
                                )}
                            </span>
                        ) : (
                            <span className='flex items-center gap-2'>
                                <span className='text-gray-400 italic'>No driver yet</span>
                                <HoverCard openDelay={100} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <span className='cursor-pointer text-gray-400 hover:text-gray-600'>
                                            <Info className='w-3.5 h-3.5' />
                                        </span>
                                    </HoverCardTrigger>
                                    <HoverCardContent className='w-72 text-sm text-gray-600'>
                                        There are no Blue Jays available to take this ride. Please coordinate to take an Uber or Lyft for this trip.
                                    </HoverCardContent>
                                </HoverCard>
                                {currentUser && !isOwner && !isOffer && !driverList.some(d => d.email === currentUser.email) && (
                                    <>
                                        <button
                                            className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                                                joinRequested
                                                    ? 'text-gray-400 border-gray-200 cursor-default'
                                                    : 'text-blue-600 border-blue-300 hover:bg-blue-50'
                                            }`}
                                            disabled={joinRequested}
                                            onClick={() => {
                                                if (!joinRequested) {
                                                    setOfferMessage('');
                                                    setOfferConfirmOpen(true);
                                                }
                                            }}
                                        >
                                            {joinRequested ? 'Request Sent' : 'Offer to drive'}
                                        </button>
                                        <Dialog open={offerConfirmOpen} onOpenChange={setOfferConfirmOpen}>
                                            <DialogContent className='max-w-sm'>
                                                <DialogHeader>
                                                    <DialogTitle>Offer to be a driver?</DialogTitle>
                                                </DialogHeader>
                                                <p className='text-sm text-gray-600'>
                                                    You are offering to drive from{' '}
                                                    <span className='font-medium'>{post.trip?.startLocation?.title || 'start'}</span>
                                                    {' '}to{' '}
                                                    <span className='font-medium'>{post.trip?.endLocation?.title || 'destination'}</span>.
                                                    The ride poster will be notified and can accept or decline.
                                                </p>
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={offerMessage}
                                                        onChange={(e) => setOfferMessage(e.target.value)}
                                                        placeholder="Optional message (e.g., 'I can pick you up early' or 'I can drive for $5', leave blank to skip)"
                                                        className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <DialogFooter className='gap-2'>
                                                    <Button variant='outline' size='sm' onClick={() => {
                                                        setOfferConfirmOpen(false);
                                                        setOfferMessage('');
                                                    }}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        className='bg-blue-600 hover:bg-blue-700'
                                                        onClick={async () => {
                                                            setOfferConfirmOpen(false);
                                                            setJoinRequested(true);
                                                            const takeRes = await fetch(`${API_ROOT}/posts/${post._id}/take`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    name: currentUser.name,
                                                                    email: currentUser.email,
                                                                    picture: currentUser.picture || null,
                                                                    avatar: currentUser.avatar || null,
                                                                    googleId: currentUser.googleId || null,
                                                                }),
                                                            });
                                                            const takeData = await takeRes.json().catch(() => ({}));
                                                            if (takeData.alreadyTaken) { setJoinRequested(true); return; }
                                                            if (!takeRes.ok) return;

                                                            const baseMsg = `${currentUser.name} can take you from ${post.trip?.startLocation?.title || 'start'} to ${post.trip?.endLocation?.title || 'destination'}.`;
                                                            const finalMsg = offerMessage.trim() ? `${baseMsg}\n\nMessage: _${offerMessage}_` : baseMsg;
                                                            await fetch(NOTIFICATIONS_ENDPOINT, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    recipientEmail: post.user.email,
                                                                    senderName: currentUser.name,
                                                                    senderId: currentUser._id,
                                                                    message: finalMsg,
                                                                    postId: post._id,
                                                                    type: 'ride_request',
                                                                }),
                                                            });
                                                            for (const member of listMembers) {
                                                                if (member.email !== currentUser.email) {
                                                                    await fetch(NOTIFICATIONS_ENDPOINT, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({
                                                                            recipientEmail: member.email,
                                                                            senderName: currentUser.name,
                                                                            senderId: currentUser._id,
                                                                            message: `${currentUser.name} is offering to drive from ${post.trip?.startLocation?.title || 'start'} to ${post.trip?.endLocation?.title || 'destination'}.${offerMessage.trim() ? ` _${currentUser.name} says: ${offerMessage}_` : ''} Check the post for details!`,
                                                                            postId: post._id,
                                                                            type: 'ride_request',
                                                                        }),
                                                                    });
                                                                }
                                                            }
                                                            setOfferMessage('');
                                                        }}
                                                    >
                                                        Confirm
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                );
            })()}

            {/* Sharing status */}
            <div className='flex items-center gap-2 mb-4 text-sm flex-wrap'>
                <Users className='w-4 h-4 text-gray-400 shrink-0' />
                {listMembers.length === 0 ? (
                    maxRiders != null ? (
                        <span className='text-gray-400 italic'>0 / {maxRiders} riders</span>
                    ) : (
                        <span className='text-gray-400 italic'>No sharing people yet</span>
                    )
                ) : maxRiders != null ? (
                    <span className={isFull ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {listMembers.length} / {maxRiders} riders{isFull ? ' — Full' : ''}
                    </span>
                ) : listMembers.length > 1 ? (
                    <span className='text-gray-700'>{listMembers.length} riders sharing this trip</span>
                ) : (
                    <span className='text-gray-700'>1 rider sharing this trip</span>
                )}
                {currentUser && !isOwner && !listJoined && (
                    <button
                        className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                            listRequestSent
                                ? 'border-gray-300 text-gray-400 cursor-default'
                                : 'border-green-500 text-green-600 hover:bg-green-50'
                        }`}
                        disabled={listRequestSent || listJoinLoading}
                        onClick={() => {
                            if (listRequestSent) return;
                            setJoinListMessage('');
                            setJoinListMessageOpen(true);
                        }}
                    >
                        {listJoinLoading ? 'Sending…' : listRequestSent ? 'Awaiting Approval' : '+ Join'}
                    </button>
                )}
                {currentUser && !isOwner && listJoined && (
                    <button
                        className='text-xs px-2 py-0.5 rounded border font-medium transition-colors border-red-300 text-red-500 hover:bg-red-50'
                        onClick={() => setRemoveConfirm({
                            open: true,
                            title: 'Leave Rider List?',
                            message: 'Are you sure you want to leave the rider list for this ride? You will need to be re-accepted if you request to join the ride again.',
                            onConfirm: async () => {
                                const res = await fetch(`${API_ROOT}/posts/${post._id}/remove-member`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        email: currentUser.email,
                                        name: currentUser.name,
                                        actorEmail: currentUser.email,
                                        actorName: currentUser.name,
                                        actorId: currentUser._id,
                                    }),
                                });
                                if (res.ok) {
                                    setListMembers(prev => prev.filter(m => m.email !== currentUser.email));
                                }
                            },
                        })}
                    >
                        − Leave
                    </button>
                )}
            </div>

            {/* Action buttons */}
            <div className='flex flex-wrap gap-2'>
                {showActions && currentUser && (isOwner || listJoined || isDriverListMember) ? (
                    <Button
                        variant='default'
                        size='sm'
                        className='w-full'
                        onClick={handleChatClick}
                    >
                        <MessageCircle className='w-4 h-4 mr-1' />
                        Chat
                    </Button>
                ) : null}

                {/* Join the rider list — only for non-owners */}
                {currentUser && !isOwner && (
                    <div className='flex-1 flex flex-col gap-1'>
                        {!listJoined && <Button
                            variant={listJoined || listRequestSent || isFull ? 'outline' : 'default'}
                            size='sm'
                            className={`w-full ${listJoined || listRequestSent || isFull ? 'text-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                            disabled={listJoined || listRequestSent || listJoinLoading || isFull}
                            onClick={async () => {
                                setListJoinError('');
                                setListJoinLoading(true);
                                try {
                                    const res = await fetch(`${API_ROOT}/posts/${post._id}/join`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            email: currentUser.email,
                                            senderName: currentUser.name,
                                            senderId: currentUser._id,
                                        }),
                                    });
                                    if (res.ok) {
                                        setListRequestSent(true);
                                    } else {
                                        const data = await res.json().catch(() => ({}));
                                        setListJoinError(data.error || 'Failed to send request. Please try again.');
                                    }
                                } catch (err) {
                                    setListJoinError('Network error. Please try again.');
                                } finally {
                                    setListJoinLoading(false);
                                }
                            }}
                        >
                            {listJoinLoading ? (
                                'Sending...'
                            ) : listJoined ? (
                                <><CheckCircle className='w-4 h-4 mr-1' />Request Accepted</>
                            ) : listRequestSent ? (
                                <><CheckCircle className='w-4 h-4 mr-1' />Awaiting Approval</>
                            ) : isFull ? (
                                <><Users className='w-4 h-4 mr-1' />Ride Full</>
                            ) : (
                                <><Users className='w-4 h-4 mr-1' />Join the Rider List</>
                            )}
                        </Button>}
                        {listJoinError && <p className='text-xs text-red-500'>{listJoinError}</p>}
                    </div>
                )}

                {/* Join Rider List Message Dialog */}
                <Dialog open={joinListMessageOpen} onOpenChange={setJoinListMessageOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="truncate max-w-[20rem]">
                                Join Rider List
                            </DialogTitle>
                            <DialogDescription>
                                Add an optional message with your request.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <textarea
                                value={joinListMessage}
                                onChange={(e) => setJoinListMessage(e.target.value)}
                                placeholder="Optional message (e.g., 'I'm flexible with pickup time')"
                                className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setJoinListMessageOpen(false);
                                    setJoinListMessage('');
                                }}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={async () => {
                                    setListJoinError('');
                                    setListJoinLoading(true);
                                    try {
                                        const res = await fetch(`${API_ROOT}/posts/${post._id}/join`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                email: currentUser.email,
                                                senderName: currentUser.name,
                                                senderId: currentUser._id,
                                                message: joinListMessage.trim() || '',
                                            }),
                                        });
                                        if (res.ok) {
                                            setListRequestSent(true);
                                            setJoinListMessageOpen(false);
                                            setJoinListMessage('');
                                        } else {
                                            const data = await res.json().catch(() => ({}));
                                            setListJoinError(data.error || 'Failed to send request. Please try again.');
                                        }
                                    } catch (err) {
                                        setListJoinError('Network error. Please try again.');
                                    } finally {
                                        setListJoinLoading(false);
                                    }
                                }}
                                disabled={listJoinLoading}
                                className='bg-green-600 hover:bg-green-700'
                            >
                                {listJoinLoading ? 'Sending...' : 'Send Request'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Leave as driver — only if current user is an accepted driver */}
                {currentUser && !isOwner && driverList.some(d => d.email === currentUser.email) && (
                    <Button
                        variant='outline'
                        size='sm'
                        className='flex-1 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700'
                        onClick={() => setRemoveConfirm({
                            open: true,
                            title: 'Leave as Driver?',
                            message: 'Are you sure you want to remove yourself as the driver for this ride?',
                            onConfirm: async () => {
                                const res = await fetch(`${API_ROOT}/posts/${post._id}/remove-driver`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: currentUser.email }),
                                });
                                if (res.ok) {
                                    setDriverList(prev => prev.filter(d => d.email !== currentUser.email));
                                    setJoinRequested(false);
                                }
                            },
                        })}
                    >
                        <UserMinus className='w-4 h-4 mr-1' />Leave as Driver
                    </Button>
                )}


                {/* Details Dialog */}
                <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setShowCode(false); }}>
                    <DialogTrigger asChild>
                        <Button variant='outline' size='sm' className='w-full'>
                            <Info className='w-4 h-4 mr-1' />
                            Details
                        </Button>
                    </DialogTrigger>

                    <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
                        <DialogDescription className="sr-only">
                            Detailed view of ride post
                        </DialogDescription>
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
                                <div className='flex items-center gap-3'>
                                    {user?.googleId ? (
                                        <button
                                            onClick={() => navigate(`/user/${user.googleId}`)}
                                            className='shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                            aria-label={`View ${displayName}'s profile`}
                                        >
                                            <img
                                                src={avatarSrc}
                                                alt={displayName}
                                                className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                                                onError={(e) => {
                                                    e.target.src = avatarFallback;
                                                }}
                                            />
                                        </button>
                                    ) : (
                                        <img
                                            src={avatarSrc}
                                            alt={displayName}
                                            className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                                            onError={(e) => {
                                                e.target.src = avatarFallback;
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {user?.googleId ? (
                                            <button
                                                onClick={() => navigate(`/user/${user.googleId}`)}
                                                className='text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm break-all'
                                            >
                                                {displayName}
                                            </button>
                                        ) : (
                                            <span className='text-gray-700 font-medium text-sm break-all cursor-not-allowed'>
                                                {displayName}
                                            </span>
                                        )}
                                        <div className='text-xs text-gray-500 break-all'>{displayEmail}</div>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 text-gray-700'>
                                    <Phone className='w-4 h-4 text-gray-400 shrink-0' />
                                    <span className="text-sm">{user?.phone || '—'}</span>
                                </div>
                            </div>

                            {/* Driver */}
                            <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Driver</p>
                                {driverList.length > 0 ? driverList.map((driver) => (
                                    <div key={driver.email} className='flex items-center gap-3'>
                                        <img
                                            src={driver.avatar || driver.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=e5e7eb&color=374151&size=64`}
                                            alt={driver.name || 'Driver'}
                                            className='w-10 h-10 rounded-full border border-gray-200 object-cover'
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=e5e7eb&color=374151&size=64`; }}
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-medium text-sm break-all'>{driver.name || '—'}</p>
                                            <p className='text-xs text-gray-500 break-all'>{driver.email || '—'}</p>
                                        </div>
                                        {isOwner && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                className='shrink-0 text-xs text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700'
                                                onClick={() => setRemoveConfirm({
                                                    open: true,
                                                    title: 'Remove Driver?',
                                                    message: `Are you sure you want to remove ${driver.name || driver.email} as the driver? The driver will be notified and the new driver will need to be re-accepted.`,
                                                    onConfirm: async () => {
                                                        const res = await fetch(`${API_ROOT}/posts/${post._id}/remove-driver`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ email: driver.email }),
                                                        });
                                                        if (res.ok) setDriverList(prev => prev.filter(d => d.email !== driver.email));
                                                    },
                                                })}
                                            >
                                                <UserMinus className='w-3 h-3 mr-1' />Remove
                                            </Button>
                                        )}
                                    </div>
                                )) : (
                                    <p className='text-gray-400 italic text-sm'>No driver yet</p>
                                )}
                            </div>

                            {/* Description */}
                            {description && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Description</p>
                                    <p className='text-gray-700 break-all whitespace-pre-wrap'>{description}</p>
                                </div>
                            )}

                            {isOffer && suggestedPrice != null && suggestedPrice !== '' && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Suggested Price</p>
                                    <div className='flex items-center gap-2 text-sm'>
                                        <span className='text-gray-400 shrink-0 font-medium'>$</span>
                                        <span className='text-gray-700'>
                                            Suggested price: <span className='font-medium text-green-700'>${Number(suggestedPrice).toFixed(2)}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!isOffer && driverList.length === 0 && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Price Estimation</p>
                                    <div className='flex items-center gap-2 text-sm'>
                                        <ExternalLink className='w-4 h-4 text-gray-400 shrink-0' />
                                        <a
                                            href='https://www.uber.com/global/en/price-estimate/'
                                            target='_blank'
                                            rel='noreferrer'
                                            className='font-medium text-blue-600 hover:text-blue-800 hover:underline'
                                        >
                                            See price estimation here
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Rider List */}
                            <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                                    Rider List
                                    {listMembers.length > 1 && (
                                        <span className='ml-2 text-gray-500 font-normal normal-case'>({listMembers.length} people sharing)</span>
                                    )}
                                </p>
                                {listMembers.length === 0 ? (
                                    <p className='text-xs text-gray-400 italic'>No sharing people yet.</p>
                                ) : (
                                    <div className='space-y-2'>
                                        {listMembers.map((member, idx) => (
                                            <div key={idx} className='flex items-center justify-between gap-3'>
                                                <div className='flex items-center gap-2'>
                                                    <img
                                                        src={member.avatar || member.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=e5e7eb&color=374151&size=64`}
                                                        alt={member.name || 'User'}
                                                        className='w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0'
                                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=e5e7eb&color=374151&size=64`; }}
                                                    />
                                                    <div className='min-w-0'>
                                                        {member.googleId ? (
                                                            <button
                                                                onClick={() => navigate(`/user/${member.googleId}`)}
                                                                className='text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm truncate block'
                                                            >
                                                                {member.name || '—'}
                                                            </button>
                                                        ) : (
                                                            <span className='text-gray-800 font-medium text-sm'>{member.name || '—'}</span>
                                                        )}
                                                        <div className='text-xs text-gray-500 truncate'>{member.email}</div>
                                                    </div>
                                                </div>
                                                {/* Remove button — for post owner on both offer and request */}
                                                {isOwner && (
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        className='shrink-0 text-xs text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700'
                                                        onClick={() => setRemoveConfirm({
                                                            open: true,
                                                            title: 'Remove Rider?',
                                                            message: `Are you sure you want to remove ${member.name || member.email} from the rider list? The rider will be notified and will need to be re-accepted to join the ride again.`,
                                                            onConfirm: async () => {
                                                                const res = await fetch(`${API_ROOT}/posts/${post._id}/remove-member`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        email: member.email,
                                                                        name: member.name,
                                                                        actorEmail: currentUser?.email,
                                                                        actorName: currentUser?.name,
                                                                        actorId: currentUser?._id,
                                                                    }),
                                                                });
                                                                if (!res.ok) return;
                                                                setListMembers(prev => prev.filter(m => m.email !== member.email));
                                                            },
                                                        })}
                                                    >
                                                        <UserMinus className='w-3 h-3 mr-1' />Remove
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Confirmation Code — only visible to the post owner */}
                            {canManagePost && post.confirmationCode && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Confirmation Code</p>
                                    <p className='text-xs text-gray-500'>Share this code with your riders to confirm the trip.</p>
                                    {showCode ? (
                                        <>
                                            <span className='text-3xl font-bold tracking-widest text-gray-900 font-mono block text-center py-2'>
                                                {post.confirmationCode}
                                            </span>
                                            <Button variant='outline' size='sm' className='w-full' onClick={() => setShowCode(false)}>
                                                Hide Code
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant='outline' size='sm' className='w-full' onClick={() => setShowCode(true)}>
                                            Show Code
                                        </Button>
                                    )}
                                </div>
                            )}

                            {riderRequestStatus && (
                                <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Your Request Status</p>
                                    <div className='flex items-center gap-2'>
                                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${riderRequestStatus.badgeClassName}`}>
                                            {riderRequestStatus.title}
                                        </span>
                                    </div>
                                    <p className='text-sm text-gray-600'>{riderRequestStatus.description}</p>
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
                                                {distances?.startToStart !== undefined && (
                                                    <p className='text-xs text-blue-600 font-medium mt-1'>
                                                        📍 {distances.startToStart.toFixed(2)} km from your start
                                                    </p>
                                                )}
                                                {/* Weather for start location */}
                                                {shouldShowWeather() && trip.startLocation?.gps_coordinates?.latitude != null && (
                                                    <div 
                                                        className="mt-2 cursor-pointer hover:bg-gray-100 rounded p-2 transition-colors"
                                                        onClick={() => openWeatherForecast({
                                                            lat: trip.startLocation.gps_coordinates.latitude,
                                                            lng: trip.startLocation.gps_coordinates.longitude,
                                                            title: trip.startLocation.title,
                                                            date: trip.date,
                                                            time: trip.time
                                                        })}
                                                    >
                                                        <WeatherDisplay
                                                            latitude={trip.startLocation.gps_coordinates.latitude}
                                                            longitude={trip.startLocation.gps_coordinates.longitude}
                                                            date={trip.date}
                                                            time={trip.time}
                                                            location={trip.startLocation.title}
                                                            compact={true}
                                                        />
                                                    </div>
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
                                                {distances?.endToEnd !== undefined && (
                                                    <p className='text-xs text-blue-600 font-medium mt-1'>
                                                        🎯 {distances.endToEnd.toFixed(2)} km from your destination
                                                    </p>
                                                )}
                                                {/* Weather for end location */}
                                                {shouldShowWeather() && trip.endLocation?.gps_coordinates?.latitude != null && (
                                                    <div 
                                                        className="mt-2 cursor-pointer hover:bg-gray-100 rounded p-2 transition-colors"
                                                        onClick={() => openWeatherForecast({
                                                            lat: trip.endLocation.gps_coordinates.latitude,
                                                            lng: trip.endLocation.gps_coordinates.longitude,
                                                            title: trip.endLocation.title,
                                                            date: trip.date,
                                                            time: trip.time
                                                        })}
                                                    >
                                                        <WeatherDisplay
                                                            latitude={trip.endLocation.gps_coordinates.latitude}
                                                            longitude={trip.endLocation.gps_coordinates.longitude}
                                                            date={trip.date}
                                                            time={trip.time}
                                                            location={trip.endLocation.title}
                                                            compact={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map Tabs */}
                                    {((trip.startLocation?.gps_coordinates?.latitude != null &&
                                      trip.endLocation?.gps_coordinates?.latitude != null) || postRoute) && (
                                        <div className='bg-gray-50 rounded-lg p-3'>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Maps</p>
                                                <ToggleGroup
                                                    type="single"
                                                    value={activeMapTab}
                                                    onValueChange={(value) => value && setActiveMapTab(value)}
                                                    size="sm"
                                                >
                                                    <ToggleGroupItem value="route" className="text-xs">Route</ToggleGroupItem>
                                                    <ToggleGroupItem value="distance" className="text-xs">Distance</ToggleGroupItem>
                                                </ToggleGroup>
                                            </div>

                                            {/* Route Tab Content */}
                                            {activeMapTab === "route" && (
                                                trip.startLocation?.gps_coordinates?.latitude != null &&
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
                                                )
                                            )}

                                            {/* Distance Tab Content */}
                                            {activeMapTab === "distance" && postRoute && (
                                                <div className="space-y-3">
                                                    <RouteMap
                                                        userRoute={userRouteForMap}
                                                        posts={[post]}
                                                        searchRadius={routeSearch?.radiusKm ?? (distanceFilter !== Infinity ? distanceFilter : 10)}
                                                        className="h-80"
                                                        showZoomControls={true}
                                                    />
                                                    
                                                    {/* Walking Navigation Buttons */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        {trip.startLocation?.gps_coordinates && userRouteForMap?.start && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1 text-xs"
                                                                disabled={!distances?.startToStart || distances.startToStart < 0.01}
                                                                onClick={() => {
                                                                    const walkingUrl = `https://maps.google.com/maps?saddr=${userRouteForMap.start.lat},${userRouteForMap.start.lng}&daddr=${trip.startLocation.gps_coordinates.latitude},${trip.startLocation.gps_coordinates.longitude}&dirflg=w`;
                                                                    window.open(walkingUrl, '_blank');
                                                                }}
                                                            >
                                                                <Navigation className="w-3 h-3" />
                                                                Walk to pickup
                                                                {distances?.startToStart !== undefined && ` (${distances.startToStart.toFixed(2)}km)`}
                                                            </Button>
                                                        )}
                                                        {trip.endLocation?.gps_coordinates && userRouteForMap?.end && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1 text-xs"
                                                                disabled={!distances?.endToEnd || distances.endToEnd < 0.01}
                                                                onClick={() => {
                                                                    const walkingUrl = `https://maps.google.com/maps?saddr=${trip.endLocation.gps_coordinates.latitude},${trip.endLocation.gps_coordinates.longitude}&daddr=${userRouteForMap.end.lat},${userRouteForMap.end.lng}&dirflg=w`;
                                                                    window.open(walkingUrl, '_blank');
                                                                }}
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                Walk from dropoff
                                                                {distances?.endToEnd !== undefined && ` (${distances.endToEnd.toFixed(2)}km)`}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Date & Time */}
                                    {(trip.date || trip.time) && (
                                        <div className='bg-gray-50 rounded-lg p-3 flex gap-4'>
                                            {trip.date && (
                                                <div className='flex items-center gap-2 text-gray-700'>
                                                    <Calendar className='w-4 h-4 text-gray-400 shrink-0' />
                                                    <span>{formatDate(trip.date)}</span>
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

                {/* Remove confirmation dialog */}
                <Dialog open={removeConfirm.open} onOpenChange={(open) => !open && setRemoveConfirm(prev => ({ ...prev, open: false }))}>
                    <DialogContent className='max-w-sm'>
                        <DialogHeader>
                            <DialogTitle>{removeConfirm.title}</DialogTitle>
                        </DialogHeader>
                        <p className='text-sm text-gray-600'>{removeConfirm.message}</p>
                        <DialogFooter className='gap-2'>
                            <Button variant='outline' size='sm' onClick={() => setRemoveConfirm(prev => ({ ...prev, open: false }))}>
                                Cancel
                            </Button>
                            <Button
                                variant='destructive'
                                size='sm'
                                onClick={async () => {
                                    setRemoveConfirm(prev => ({ ...prev, open: false }));
                                    await removeConfirm.onConfirm?.();
                                }}
                            >
                                Confirm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Weather Forecast Dialog */}
                <WeatherForecastDialog
                    open={weatherForecastOpen}
                    onOpenChange={setWeatherForecastOpen}
                    latitude={selectedWeatherLocation?.lat}
                    longitude={selectedWeatherLocation?.lng}
                    location={selectedWeatherLocation?.title}
                    currentDate={selectedWeatherLocation?.date}
                />

            </div>
        </div>
    );
};

export default PostCard;
