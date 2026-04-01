import { calculateDistance } from './RouteMap';
import RouteMap from './RouteMap';
import WeatherDisplay from './WeatherDisplay';
import WeatherForecastDialog from './WeatherForecastDialog';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

const PostCard = ({ post, onDelete, onUpdate, coords, showActions = false, routeSearch, distanceFilter, currentUser }) => {
    const { _id, title, description, user, trip, type = 'request', createdAt } = post;
    const navigate = useNavigate();
    const isOffer = type === 'offer';

    const [editOpen, setEditOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [weatherForecastOpen, setWeatherForecastOpen] = useState(false);
    const [selectedWeatherLocation, setSelectedWeatherLocation] = useState(null);
    const [message, setMessage] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [activeMapTab, setActiveMapTab] = useState("route"); // "route" or "distance"

    // Function to handle weather forecast dialog opening
    const openWeatherForecast = (location) => {
        setSelectedWeatherLocation(location);
        setWeatherForecastOpen(true);
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
        <div className={`relative rounded-xl border border-gray-200 bg-white px-6 pb-6 shadow-sm hover:shadow-md transition-shadow ${showActions ? 'pt-10' : 'pt-6'}`}>
            {showActions && (
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
                </>
            )}

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
            <p className='text-sm text-gray-500 mb-4 wrap-break-word'>
                {user.googleId ? (
                    <button
                        onClick={() => navigate(`/user/${user.googleId}`)}
                        className='text-blue-600 hover:text-blue-800 hover:underline font-medium break-all'
                    >
                        {user.name.length > 40 ? `${user.name.slice(0, 40)}...` : user.name}
                    </button>
                ) : (
                    <span className='text-gray-700 font-medium break-all cursor-not-allowed'>
                        {user.name}
                    </span>
                )}
                {' · '}
                <span className='break-all'>
                    {user.email.length > 40 ? `${user.email.slice(0, 40)}...` : user.email}
                </span>
            </p>

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
                                    <img
                                        src={user?.avatar || user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=e5e7eb&color=374151&size=64`}
                                        alt={user?.name || 'User'}
                                        className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=e5e7eb&color=374151&size=64`;
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        {user.googleId ? (
                                            <button
                                                onClick={() => navigate(`/user/${user.googleId}`)}
                                                className='text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm break-all'
                                            >
                                                {user?.name || '—'}
                                            </button>
                                        ) : (
                                            <span className='text-gray-700 font-medium text-sm break-all cursor-not-allowed'>
                                                {user?.name || '—'}
                                            </span>
                                        )}
                                        <div className='text-xs text-gray-500 break-all'>{user?.email || '—'}</div>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 text-gray-700'>
                                    <Phone className='w-4 h-4 text-gray-400 shrink-0' />
                                    <span className="text-sm">{user?.phone || '—'}</span>
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
                                                        searchRadius={distanceFilter !== Infinity ? distanceFilter : 10}
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
