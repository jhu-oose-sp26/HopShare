import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import PostCard from '@/components/PostCard';

// Fix default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const makePin = (color, letter) =>
  L.divIcon({
    html: `<svg width="22" height="36" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="7" fill="#fff"/>
      <text x="12.5" y="17" text-anchor="middle" font-size="9" font-weight="bold" fill="${color}">${letter}</text>
    </svg>`,
    className: '',
    iconSize: [22, 36],
    iconAnchor: [11, 36],
    popupAnchor: [0, -36],
  });

const START_ICON = makePin('#16a34a', 'S');
const END_ICON   = makePin('#dc2626', 'E');

// Palette of distinct colours for route lines
const LINE_COLORS = [
  '#2563eb', '#9333ea', '#ea580c', '#0891b2',
  '#65a30d', '#db2777', '#d97706', '#0d9488',
];

// Returns compass bearing in degrees (0 = north, 90 = east, …) from point A to point B.
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Creates a rotated arrowhead divIcon pointing in the given compass bearing.
function makeArrow(color, deg) {
  // SVG arrow points "up" (north). We rotate it by the bearing so it points in
  // the direction of travel.
  return L.divIcon({
    html: `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"
                style="transform: rotate(${deg}deg); display:block;">
      <polygon points="10,1 18,18 10,13 2,18" fill="${color}" opacity="0.9"/>
    </svg>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}



function RidesMapView({ posts, currentUser, coords, routeSearch, onDeletePost, onUpdatePost }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const ridesWithCoords = posts.filter(
    (p) =>
      p.trip?.startLocation?.gps_coordinates?.latitude &&
      p.trip?.endLocation?.gps_coordinates?.latitude,
  );

  const rides = ridesWithCoords.filter((p) => {
    const date = p.trip?.date ?? '';
    if (fromDate && date < fromDate) return false;
    if (toDate   && date > toDate)   return false;
    return true;
  });

  const allPoints = rides.flatMap((p) => [
    [p.trip.startLocation.gps_coordinates.latitude, p.trip.startLocation.gps_coordinates.longitude],
    [p.trip.endLocation.gps_coordinates.latitude,   p.trip.endLocation.gps_coordinates.longitude],
  ]);

  const searchStart = routeSearch?.start
    ? [Number(routeSearch.start.latitude), Number(routeSearch.start.longitude)]
    : null;
  const searchEnd = routeSearch?.end
    ? [Number(routeSearch.end.latitude), Number(routeSearch.end.longitude)]
    : null;
  const searchRadiusMeters = Number(routeSearch?.radiusKm) > 0
    ? Number(routeSearch.radiusKm) * 1000
    : null;

  const center = searchStart && searchEnd
    ? [
      (searchStart[0] + searchEnd[0]) / 2,
      (searchStart[1] + searchEnd[1]) / 2,
    ]
    : coords
      ? [coords.lat, coords.lng]
      : allPoints.length > 0
        ? [allPoints[0][0], allPoints[0][1]]
        : [39.3289, -76.6205]; // JHU Homewood campus fallback
  const initialZoom = coords ? 9 : 11; // zoom 9 ≈ 100 km radius

  return (
    <div className='container mx-auto px-6 py-8 max-w-6xl'>
      <div className='mb-4 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold text-gray-900'>Map View</h2>
          <p className='text-sm text-gray-500 mt-1'>
            {rides.length} ride{rides.length === 1 ? '' : 's'} shown
            {ridesWithCoords.length - rides.length > 0 &&
              ` · ${ridesWithCoords.length - rides.length} filtered out`}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3 text-sm'>
          <div className='flex items-center gap-2'>
            <label className='text-gray-600 whitespace-nowrap'>From</label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className={cn('w-36 justify-start text-left font-normal h-9', !fromDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {fromDate ? format(parse(fromDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent side='bottom' align='start' className='p-0 w-auto' style={{ zIndex: 1000 }}>
                <Calendar
                  mode='single'
                  selected={fromDate ? parse(fromDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setFromDate(format(d, 'yyyy-MM-dd'));
                    setFromOpen(false);
                    setToOpen(true);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className='flex items-center gap-2'>
            <label className='text-gray-600 whitespace-nowrap'>To</label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className={cn('w-36 justify-start text-left font-normal h-9', !toDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {toDate ? format(parse(toDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent side='bottom' align='start' className='p-0 w-auto' style={{ zIndex: 1000 }}>
                <Calendar
                  mode='single'
                  selected={toDate ? parse(toDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setToDate(format(d, 'yyyy-MM-dd'));
                    setToOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className='text-xs text-gray-500 hover:text-gray-800 underline'
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {rides.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-500 text-lg'>No rides with location data to display.</p>
        </div>
      ) : (
        <div className='rounded-xl overflow-hidden border border-gray-200 shadow-sm' style={{ height: '520px', position: 'relative', zIndex: 0 }}>
          <MapContainer
            center={center}
            zoom={initialZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Route-search overlay for map tab filter context */}
            {searchStart && searchRadiusMeters ? (
              <>
                <Marker position={searchStart} icon={START_ICON} />
                <Circle
                  center={searchStart}
                  radius={searchRadiusMeters}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.08, weight: 2 }}
                />
              </>
            ) : null}
            {searchEnd && searchRadiusMeters ? (
              <>
                <Marker position={searchEnd} icon={END_ICON} />
                <Circle
                  center={searchEnd}
                  radius={searchRadiusMeters}
                  pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.08, weight: 2 }}
                />
              </>
            ) : null}

            {rides.map((post, idx) => {
              const start = post.trip.startLocation.gps_coordinates;
              const end   = post.trip.endLocation.gps_coordinates;
              const startLatLng = [start.latitude, start.longitude];
              const endLatLng   = [end.latitude,   end.longitude];
              const color = LINE_COLORS[idx % LINE_COLORS.length];
              const arrowBearing = bearing(start.latitude, start.longitude, end.latitude, end.longitude);
              const arrowIcon = makeArrow(color, arrowBearing);
              const arrowPositions = [0.25, 0.5, 0.75].map((t) => [
                start.latitude  + t * (end.latitude  - start.latitude),
                start.longitude + t * (end.longitude - start.longitude),
              ]);

              const open = () => setSelectedPost(post);

              return (
                <span key={post._id}>
                  <Polyline
                    positions={[startLatLng, endLatLng]}
                    pathOptions={{ color, weight: 4, opacity: 0.8 }}
                    eventHandlers={{ click: open }}
                  />
                  {arrowPositions.map((pos, i) => (
                    <Marker key={i} position={pos} icon={arrowIcon} interactive={false} />
                  ))}
                  <Marker position={startLatLng} icon={START_ICON} eventHandlers={{ click: open }} />
                  <Marker position={endLatLng} icon={END_ICON} eventHandlers={{ click: open }} />
                </span>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Legend */}
      <div className='mt-3 flex items-center gap-4 text-xs text-gray-500'>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-3 h-3 rounded-full bg-green-600'></span> Start
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-3 h-3 rounded-full bg-red-600'></span> End
        </span>
        <span className='flex items-center gap-1'>
          <span className='inline-block w-4 h-0.5 bg-blue-600'></span> Route (click to view details)
        </span>
      </div>

      {/* Ride detail sheet */}
      <Sheet open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <SheetContent side='right' className='w-[92vw] sm:w-120 overflow-y-auto px-2'>
          <SheetHeader className='px-2'>
            <SheetTitle>Ride Details</SheetTitle>
          </SheetHeader>
          <div className='mt-4 px-2 pb-6'>
            {selectedPost && (
              <PostCard
                post={selectedPost}
                coords={coords}
                currentUser={currentUser}
                showActions={currentUser?.email === selectedPost?.user?.email}
                onDelete={() => { onDeletePost?.(selectedPost._id); setSelectedPost(null); }}
                onUpdate={(formData) => onUpdatePost?.(selectedPost._id, formData)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default RidesMapView;
