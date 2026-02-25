import { useState } from 'react';
import { format, parse } from 'date-fns';
import {
    MapPin,
    Calendar as CalendarIcon,
    Clock,
    User,
    Mail,
    Phone,
    MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const inputBase =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function SubmitBox({ onSubmit }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!date) return;

        const formData = {
            name,
            email,
            phone,
            startLocation,
            endLocation,
            date,
            time,
            description,
        };

        // debug formData
        console.log(formData);
        onSubmit?.(formData);

        // Clear form
        setName('');
        setEmail('');
        setPhone('');
        setStartLocation('');
        setEndLocation('');
        setDate('');
        setTime('');
        setDescription('');
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
                        placeholder='Your phone number'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
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
                    <input
                        id='submit-start'
                        type='text'
                        className={inputBase}
                        placeholder='e.g. Homewood Campus, Baltimore'
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
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
                    <input
                        id='submit-end'
                        type='text'
                        className={inputBase}
                        placeholder='e.g. BWI Airport'
                        value={endLocation}
                        onChange={(e) => setEndLocation(e.target.value)}
                        required
                    />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
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
                        placeholder='Describe your trip'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>
                <div className='pt-2'>
                    <Button
                        type='submit'
                        size='lg'
                        className='w-full sm:w-auto'
                    >
                        Submit
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default SubmitBox;
