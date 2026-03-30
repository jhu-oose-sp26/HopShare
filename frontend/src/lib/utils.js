import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  let R = 6371; // Radius of the earth in km
  let dLat = deg2rad(lat2-lat1);  // deg2rad below
  let dLon = deg2rad(lon2-lon1); 
  let a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  let d = R * c;
  return d; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function toFiniteCoordinate(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

export function getCoordinatePair(coords) {
    if (!coords) return null;

    const latitude = toFiniteCoordinate(
        coords.latitude ?? coords.lat ?? coords?.gps_coordinates?.latitude
    );
    const longitude = toFiniteCoordinate(
        coords.longitude ?? coords.lng ?? coords?.gps_coordinates?.longitude
    );

    if (latitude === null || longitude === null) {
        return null;
    }

    return { latitude, longitude };
}

export function getRouteCenter(start, end) {
    const startCoords = getCoordinatePair(start);
    const endCoords = getCoordinatePair(end);

    if (!startCoords || !endCoords) {
        return null;
    }

    return {
        latitude: (startCoords.latitude + endCoords.latitude) / 2,
        longitude: (startCoords.longitude + endCoords.longitude) / 2,
    };
}

export function filterPostsByRouteRadius(posts, route, radiusKm) {
    const searchCenter = getRouteCenter(route?.start, route?.end);
    const maxDistanceKm = Number(radiusKm);

    if (!searchCenter || !Number.isFinite(maxDistanceKm) || maxDistanceKm < 0) {
        return [];
    }

    return posts
        .map((post) => {
            const postCenter = getRouteCenter(
                post?.trip?.startLocation?.gps_coordinates,
                post?.trip?.endLocation?.gps_coordinates
            );

            if (!postCenter) {
                return null;
            }

            const routeDistanceKm = getDistanceFromLatLonInKm(
                searchCenter.latitude,
                searchCenter.longitude,
                postCenter.latitude,
                postCenter.longitude
            );

            if (routeDistanceKm > maxDistanceKm) {
                return null;
            }

            return { post, routeDistanceKm };
        })
        .filter(Boolean)
        .sort((left, right) => left.routeDistanceKm - right.routeDistanceKm)
        .map(({ post }) => post);
}
