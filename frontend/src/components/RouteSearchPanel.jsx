import { useState } from 'react';
import { MapPin, Search, Route, CircleDot } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import { Button } from '@/components/ui/button';

const inputBase =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function RouteSearchPanel({
    coords,
    hasSearched,
    matchCount,
    searchRadiusKm,
    posts = [],
    onClearSearch,
    onRequestRide,
    onSearch,
}) {
    const [startTitle, setStartTitle] = useState('');
    const [startLatitude, setStartLatitude] = useState('');
    const [startLongitude, setStartLongitude] = useState('');
    const [endTitle, setEndTitle] = useState('');
    const [endLatitude, setEndLatitude] = useState('');
    const [endLongitude, setEndLongitude] = useState('');
    const [radiusKm, setRadiusKm] = useState('5');
    const [formError, setFormError] = useState('');

    const requestRideData = {
        type: 'request',
        startTitle,
        startLatitude,
        startLongitude,
        endTitle,
        endLatitude,
        endLongitude,
    };

    const handleStartChange = (nextValue) => {
        setStartTitle(nextValue);
        setStartLatitude('');
        setStartLongitude('');
        setFormError('');
        if (hasSearched) {
            onClearSearch?.();
        }
    };

    const handleEndChange = (nextValue) => {
        setEndTitle(nextValue);
        setEndLatitude('');
        setEndLongitude('');
        setFormError('');
        if (hasSearched) {
            onClearSearch?.();
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const normalizedRadiusKm = Number(radiusKm);
        if (!Number.isFinite(normalizedRadiusKm) || normalizedRadiusKm <= 0) {
            setFormError('Enter a radius greater than 0 km.');
            return;
        }

        if (!startLatitude || !startLongitude || !endLatitude || !endLongitude) {
            setFormError(
                'Select both the start and end from the location suggestions.'
            );
            return;
        }

        setFormError('');
        onSearch?.({
            start: {
                title: startTitle,
                latitude: Number(startLatitude),
                longitude: Number(startLongitude),
            },
            end: {
                title: endTitle,
                latitude: Number(endLatitude),
                longitude: Number(endLongitude),
            },
            radiusKm: normalizedRadiusKm,
        });
    };

    const handleClear = () => {
        setStartTitle('');
        setStartLatitude('');
        setStartLongitude('');
        setEndTitle('');
        setEndLatitude('');
        setEndLongitude('');
        setRadiusKm('5');
        setFormError('');
        onClearSearch?.();
    };

    // Prepare user route data for map
    const getUserRoute = () => {
        if (!startLatitude || !startLongitude || !endLatitude || !endLongitude) {
            return null;
        }

        const start = {
            lat: Number(startLatitude),
            lng: Number(startLongitude),
            title: startTitle
        };

        const end = {
            lat: Number(endLatitude),
            lng: Number(endLongitude),
            title: endTitle
        };

        // Calculate center point for map
        const center = {
            lat: (start.lat + end.lat) / 2,
            lng: (start.lng + end.lng) / 2
        };

        return { start, end, center };
    };

    const userRoute = getUserRoute();
    const canShowMap = userRoute !== null;

    return (
        <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                <div>
                    <h2 className='mt-2 text-2xl font-semibold text-slate-900'>
                        Find nearby routes before posting
                    </h2>
                    <p className='mt-2 max-w-2xl text-sm text-slate-600'>
                        Input your start and end, and see if there are any existing rides with similar routes. <br/>
                        You can also adjust the radius to widen or narrow your search.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
                <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto_auto] xl:items-end'>
                    <div className='space-y-2'>
                        <label
                            htmlFor='route-search-start'
                            className='flex items-center gap-2 text-sm font-medium text-slate-900'
                        >
                            <MapPin className='size-4 text-emerald-600' />
                            Start
                        </label>
                        <LocationAutocomplete
                            id='route-search-start'
                            value={startTitle}
                            onChange={handleStartChange}
                            onSelect={(selection) => {
                                setStartLatitude(selection.latitude);
                                setStartLongitude(selection.longitude);
                                setFormError('');
                            }}
                            placeholder='e.g. Homewood Campus'
                            coords={coords}
                            required
                        />
                    </div>

                    <div className='space-y-2'>
                        <label
                            htmlFor='route-search-end'
                            className='flex items-center gap-2 text-sm font-medium text-slate-900'
                        >
                            <MapPin className='size-4 text-rose-600' />
                            End
                        </label>
                        <LocationAutocomplete
                            id='route-search-end'
                            value={endTitle}
                            onChange={handleEndChange}
                            onSelect={(selection) => {
                                setEndLatitude(selection.latitude);
                                setEndLongitude(selection.longitude);
                                setFormError('');
                            }}
                            placeholder='e.g. BWI Airport'
                            coords={coords}
                            required
                        />
                    </div>

                    <div className='space-y-2'>
                        <label
                            htmlFor='route-search-radius'
                            className='flex items-center gap-2 text-sm font-medium text-slate-900'
                        >
                            <Route className='size-4 text-slate-500' />
                            Radius (km)
                        </label>
                        <input
                            id='route-search-radius'
                            type='number'
                            min='0.1'
                            step='0.1'
                            className={inputBase}
                            value={radiusKm}
                            onChange={(event) => {
                                setRadiusKm(event.target.value);
                                setFormError('');
                                if (hasSearched) {
                                    onClearSearch?.();
                                }
                            }}
                            required
                        />
                    </div>

                    <div className='xl:self-end'>
                        <Button type='submit' className='w-full xl:w-auto'>
                            <Search className='mr-2 size-4' />
                            Search routes
                        </Button>
                    </div>

                    <div className='xl:self-end'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={handleClear}
                            className='w-full xl:w-auto'
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {formError && (
                    <p className='text-sm text-red-600'>{formError}</p>
                )}

                {hasSearched && matchCount === 0 && !formError && (
                    <div className='flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                            <p className='text-sm font-medium text-amber-950'>
                                No existing ride matched this route.
                            </p>
                            <p className='text-sm text-amber-800'>
                                Try to create a new ride request with the button on your right!
                            </p>
                        </div>
                        <Button
                            type='button'
                            onClick={() => onRequestRide?.(requestRideData)}
                        >
                            Request ride
                        </Button>
                    </div>
                )}
            </form>
        </section>
    );
}

export default RouteSearchPanel;
