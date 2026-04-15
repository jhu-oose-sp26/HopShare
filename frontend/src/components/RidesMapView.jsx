import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function AutoFit({ points }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
        fitted.current = true;
      }
    } catch {
      // ignore
    }
  }, [map, points]);

  return null;
}

function RidesMapView({ posts }) {
  const rides = posts.filter(
    (p) =>
      p.trip?.startLocation?.gps_coordinates?.latitude &&
      p.trip?.endLocation?.gps_coordinates?.latitude,
  );

  const allPoints = rides.flatMap((p) => [
    [p.trip.startLocation.gps_coordinates.latitude, p.trip.startLocation.gps_coordinates.longitude],
    [p.trip.endLocation.gps_coordinates.latitude,   p.trip.endLocation.gps_coordinates.longitude],
  ]);

  const center = allPoints.length > 0
    ? [allPoints[0][0], allPoints[0][1]]
    : [39.3289, -76.6205]; // JHU Homewood campus

  return (
    <div className='container mx-auto px-6 py-8 max-w-6xl'>
      <div className='mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>Map View</h2>
        <p className='text-sm text-gray-500 mt-1'>
          {rides.length} ride{rides.length === 1 ? '' : 's'} with location data
          {posts.length - rides.length > 0 &&
            ` · ${posts.length - rides.length} hidden (no coordinates)`}
        </p>
      </div>

      {rides.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-500 text-lg'>No rides with location data to display.</p>
        </div>
      ) : (
        <div className='rounded-xl overflow-hidden border border-gray-200 shadow-sm' style={{ height: '520px' }}>
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <AutoFit points={allPoints} />

            {rides.map((post, idx) => {
              const start = post.trip.startLocation.gps_coordinates;
              const end   = post.trip.endLocation.gps_coordinates;
              const startLatLng = [start.latitude, start.longitude];
              const endLatLng   = [end.latitude,   end.longitude];
              const color = LINE_COLORS[idx % LINE_COLORS.length];
              const label = post.trip?.startLocation?.title
                ? `${post.trip.startLocation.title} → ${post.trip.endLocation?.title ?? '?'}`
                : post.title ?? 'Ride';
              const dateTime = [post.trip?.date, post.trip?.time].filter(Boolean).join(' · ');

              // Midpoint for the arrowhead
              const midLat = (start.latitude  + end.latitude)  / 2;
              const midLng = (start.longitude + end.longitude) / 2;
              const arrowBearing = bearing(start.latitude, start.longitude, end.latitude, end.longitude);
              const arrowIcon = makeArrow(color, arrowBearing);

              return (
                <span key={post._id}>
                  <Polyline
                    positions={[startLatLng, endLatLng]}
                    pathOptions={{ color, weight: 3, opacity: 0.75 }}
                  />
                  {/* Directional arrow at midpoint */}
                  <Marker position={[midLat, midLng]} icon={arrowIcon} interactive={false} />
                  <Marker position={startLatLng} icon={START_ICON}>
                    <Popup>
                      <div className='text-sm'>
                        <p className='font-semibold'>{label}</p>
                        {dateTime && <p className='text-gray-500'>{dateTime}</p>}
                        <p className='text-green-700 mt-1'>Start: {post.trip.startLocation.title}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Marker position={endLatLng} icon={END_ICON}>
                    <Popup>
                      <div className='text-sm'>
                        <p className='font-semibold'>{label}</p>
                        {dateTime && <p className='text-gray-500'>{dateTime}</p>}
                        <p className='text-red-700 mt-1'>End: {post.trip.endLocation.title}</p>
                      </div>
                    </Popup>
                  </Marker>
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
          <span className='inline-block w-4 h-0.5 bg-blue-600'></span> Route (arrow shows direction)
        </span>
      </div>
    </div>
  );
}

export default RidesMapView;
