import { useEffect, useState } from 'react';
import LocationAutocomplete from './LocationAutocomplete';
import { format, parse } from 'date-fns';
import {
    MapPin,
    Calendar as CalendarIcon,
    Clock,
    User,
    Mail,
    Phone,
    MessageCircle,
    CarFront,
    Users,
    DollarSign,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

const inputBase =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function SubmitBox({ onSubmit, coords, initialData = null, isEdit = false }) {
    const [name, setName] = useState(initialData?.name ?? '');
    const [email, setEmail] = useState(initialData?.email ?? '');
    const [phone, setPhone] = useState(initialData?.phone ?? '');
    const [startTitle, setStartTitle] = useState(initialData?.startTitle ?? '');
    const [startLatitude, setStartLatitude] = useState(initialData?.startLatitude ?? '');
    const [startLongitude, setStartLongitude] = useState(initialData?.startLongitude ?? '');
    const [endTitle, setEndTitle] = useState(initialData?.endTitle ?? '');
    const [endLatitude, setEndLatitude] = useState(initialData?.endLatitude ?? '');
    const [endLongitude, setEndLongitude] = useState(initialData?.endLongitude ?? '');
    const [date, setDate] = useState(initialData?.date ?? '');
    const [time, setTime] = useState(initialData?.time ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [type, setType] = useState(initialData?.type ?? 'request');
    const [maxRiders, setMaxRiders] = useState(initialData?.maxRiders ?? 4);
    const [suggestedPrice, setSuggestedPrice] = useState(initialData?.suggestedPrice ?? '');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setName(initialData?.name ?? '');
        setEmail(initialData?.email ?? '');
        setPhone(initialData?.phone ?? '');
        setStartTitle(initialData?.startTitle ?? '');
        setStartLatitude(initialData?.startLatitude ?? '');
        setStartLongitude(initialData?.startLongitude ?? '');
        setEndTitle(initialData?.endTitle ?? '');
        setEndLatitude(initialData?.endLatitude ?? '');
        setEndLongitude(initialData?.endLongitude ?? '');
        setDate(initialData?.date ?? '');
        setTime(initialData?.time ?? '');
        setDescription(initialData?.description ?? '');
        setType(initialData?.type ?? 'request');
        setMaxRiders(initialData?.maxRiders ?? 4);
        setSuggestedPrice(initialData?.suggestedPrice ?? '');
        setSubmitError('');
        setIsSubmitting(false);
    }, [initialData]);

    const handleStartChange = (nextValue) => {
        setStartTitle(nextValue);
        setStartLatitude('');
        setStartLongitude('');
    };

    const handleEndChange = (nextValue) => {
        setEndTitle(nextValue);
        setEndLatitude('');
        setEndLongitude('');
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date) {
            setSubmitError('Please select a date.');
            return;
        }

        const formData = {
            name,
            email,
            phone,
            startTitle,
            startLatitude,
            startLongitude,
            endTitle,
            endLatitude,
            endLongitude,
            date,
            time,
            description,
            type,
            maxRiders: Number(maxRiders),
            suggestedPrice: type === 'offer' ? suggestedPrice : '',
        };

        setSubmitError('');
        setIsSubmitting(true);

        try {
            await onSubmit?.(formData);

            // Clear form after successful submit (only for new posts, not edits)
            if (!initialData) {
                setName('');
                setEmail('');
                setPhone('');
                setStartTitle('');
                setStartLatitude('');
                setStartLongitude('');
                setEndTitle('');
                setEndLatitude('');
                setEndLongitude('');
                setDate('');
                setTime('');
                setDescription('');
                setType('request');
                setMaxRiders(4);
                setSuggestedPrice('');
            }
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : 'Failed to submit ride'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='rounded-xl border border-border bg-card p-6 shadow-sm w-full max-w-[700px]'>
            <h2 className='text-lg font-semibold text-card-foreground'>
                Share a ride
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
                Enter your trip details to offer or request a ride.
            </p>

            <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
                <div className='space-y-2'>
                    <label
                        htmlFor='submit-ride-type'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <CarFront className='size-4 text-muted-foreground' />
                        Ride type
                    </label>
                    <select
                        id='submit-ride-type'
                        className={inputBase}
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value='request'>Requesting a rideshare split</option>
                        <option value='offer'>Offering a ride</option>
                    </select>
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-name'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <User className='size-4 text-muted-foreground' />
                        Name
                    </label>
                    <input
                        id='submit-name'
                        type='text'
                        className={inputBase}
                        placeholder='Your name'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isEdit}
                    />
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-email'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <Mail className='size-4 text-muted-foreground' />
                        Email
                    </label>
                    <input
                        id='submit-email'
                        type='email'
                        className={inputBase}
                        placeholder='Your email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isEdit}
                    />
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-phone'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <Phone className='size-4 text-muted-foreground' />
                        Phone
                    </label>
                    <input
                        id='submit-phone'
                        type='tel'
                        className={inputBase}
                        placeholder='Your phone number (optional)'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-start'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <MapPin className='size-4 text-muted-foreground' />
                        Start location
                    </label>
                    <LocationAutocomplete
                        id='submit-start'
                        value={startTitle}
                        onChange={handleStartChange}
                        onSelect={(s) => { setStartLatitude(s.latitude); setStartLongitude(s.longitude); }}
                        placeholder='e.g. Homewood Campus, Baltimore'
                        coords={coords}
                        required
                    />
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-end'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <MapPin className='size-4 text-muted-foreground' />
                        End location
                    </label>
                    <LocationAutocomplete
                        id='submit-end'
                        value={endTitle}
                        onChange={handleEndChange}
                        onSelect={(s) => { setEndLatitude(s.latitude); setEndLongitude(s.longitude); }}
                        placeholder='e.g. BWI Airport'
                        coords={coords}
                        required
                    />
                </div>

                <div className='grid gap-4 sm:grid-cols-3'>
                    <div className='space-y-2'>
                        <label
                            htmlFor='submit-date'
                            className='flex items-center gap-2 text-sm font-medium text-foreground'
                        >
                            <CalendarIcon className='size-4 text-muted-foreground' />
                            Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id='submit-date'
                                    variant='outline'
                                    className={cn(
                                        'w-full justify-start text-left font-normal h-9',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    {date
                                        ? format(
                                              parse(
                                                  date,
                                                  'yyyy-MM-dd',
                                                  new Date()
                                              ),
                                              'MMM d, yyyy'
                                          )
                                        : 'Pick a date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                side='bottom'
                                sideOffset={4}
                                align='center'
                                className="p-0 w-full"
                                style={{ minWidth: '100%' }}
                            >
                                <div className="rounded-md border border-input overflow-hidden">
                                    <Calendar
                                        mode='single'
                                        selected={date ? parse(date,'yyyy-MM-dd', new Date()): undefined}
                                        onSelect={(selected) => {
                                            if (selected) setDate(format(selected, 'yyyy-MM-dd'));
                                        }}
                                        numberOfWeeks={7}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className='space-y-2'>
                        <label
                            htmlFor='submit-time'
                            className='flex items-center gap-2 text-sm font-medium text-foreground'
                        >
                            <Clock className='size-4 text-muted-foreground' />
                            Time
                        </label>
                        <input
                            id='submit-time'
                            type='time'
                            className={inputBase}
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <label
                            htmlFor='submit-max-riders'
                            className='flex items-center gap-2 text-sm font-medium text-foreground'
                        >
                            <Users className='size-4 text-muted-foreground' />
                            Max riders <span className='text-red-500'>*</span>
                        </label>
                        <input
                            id='submit-max-riders'
                            type='number'
                            min='1'
                            max='20'
                            className={inputBase}
                            value={maxRiders}
                            onChange={(e) => setMaxRiders(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className='space-y-2'>
                    <label
                        htmlFor='submit-description'
                        className='flex items-center gap-2 text-sm font-medium text-foreground'
                    >
                        <MessageCircle className='size-4 text-muted-foreground' />
                        Description
                    </label>
                    <textarea
                        id='submit-description'
                        className={inputBase}
                        placeholder='Describe your trip (optional)'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                    />
                    <p className='text-xs text-muted-foreground text-right'>
                        {description.length}/500
                    </p>
                </div>
                {type === 'offer' && (
                    <div className='space-y-2'>
                        <label
                            htmlFor='submit-price'
                            className='flex items-center gap-2 text-sm font-medium text-foreground'
                        >
                            <DollarSign className='size-4 text-muted-foreground' />
                            Suggested total price
                            <span className='text-xs text-muted-foreground font-normal'>(optional)</span>
                            <HoverCard openDelay={100} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                    <span className='cursor-pointer text-muted-foreground hover:text-foreground'>
                                        <Info className='size-3.5' />
                                    </span>
                                </HoverCardTrigger>
                                <HoverCardContent className='w-64 text-sm text-muted-foreground font-normal'>
                                    Total price you are requesting for the ride. This will be split between the riders.
                                </HoverCardContent>
                            </HoverCard>
                        </label>
                        <div className='relative'>
                            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>$</span>
                            <input
                                id='submit-price'
                                type='number'
                                min='0'
                                step='0.01'
                                className={`${inputBase} pl-7`}
                                placeholder='0.00'
                                value={suggestedPrice}
                                onChange={(e) => setSuggestedPrice(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {submitError && (
                    <p className='text-sm text-red-600'>{submitError}</p>
                )}
                <div className='pt-2'>
                    <Button
                        type='submit'
                        size='lg'
                        className='w-full sm:w-auto'
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default SubmitBox;
