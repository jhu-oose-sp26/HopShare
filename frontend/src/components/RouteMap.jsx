import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const startIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

const endIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

function FitBounds({ positions }) {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(positions, { padding: [32, 32] });
    }, [map, positions]);
    return null;
}

export default function RouteMap({ start, end }) {
    const positions = [
        [start.latitude, start.longitude],
        [end.latitude, end.longitude],
    ];
    const center = [
        (start.latitude + end.latitude) / 2,
        (start.longitude + end.longitude) / 2,
    ];

    return (
        <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '200px', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <Marker position={positions[0]} icon={startIcon} />
            <Marker position={positions[1]} icon={endIcon} />
            <Polyline positions={positions} color='#3b82f6' weight={3} dashArray='6 4' />
            <FitBounds positions={positions} />
        </MapContainer>
    );
}
