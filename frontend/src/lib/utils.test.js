import { describe, expect, it } from 'vitest';
import { filterPostsByRouteRadius, getRouteCenter } from './utils';

describe('getRouteCenter', () => {
    it('returns the midpoint between two coordinates', () => {
        const center = getRouteCenter(
            { latitude: '39.33', longitude: '-76.62' },
            { latitude: '39.19', longitude: '-76.67' }
        );

        expect(center?.latitude).toBeCloseTo(39.26);
        expect(center?.longitude).toBeCloseTo(-76.645);
    });
});

describe('filterPostsByRouteRadius', () => {
    it('returns posts only when both start and end are within the requested radius', () => {
        const posts = [
            {
                _id: 'closest',
                trip: {
                    startLocation: {
                        gps_coordinates: { latitude: 39.33, longitude: -76.62 },
                    },
                    endLocation: {
                        gps_coordinates: { latitude: 39.19, longitude: -76.67 },
                    },
                },
            },
            {
                _id: 'start-only-match',
                trip: {
                    startLocation: {
                        gps_coordinates: { latitude: 39.315, longitude: -76.615 },
                    },
                    endLocation: {
                        gps_coordinates: { latitude: 38.85, longitude: -77.04 },
                    },
                },
            },
            {
                _id: 'far',
                trip: {
                    startLocation: {
                        gps_coordinates: { latitude: 38.85, longitude: -77.04 },
                    },
                    endLocation: {
                        gps_coordinates: { latitude: 38.9, longitude: -77.01 },
                    },
                },
            },
            {
                _id: 'missing-coordinates',
                trip: {
                    startLocation: { gps_coordinates: null },
                    endLocation: { gps_coordinates: null },
                },
            },
        ];

        expect(
            filterPostsByRouteRadius(
                posts,
                {
                    start: { latitude: 39.31, longitude: -76.61 },
                    end: { latitude: 39.2, longitude: -76.68 },
                },
                10
            )
        ).toEqual([posts[0]]);
    });

    it('sorts matching posts by nearest worst endpoint distance', () => {
        const posts = [
            {
                _id: 'second',
                trip: {
                    startLocation: {
                        gps_coordinates: { latitude: 39.4, longitude: -76.62 },
                    },
                    endLocation: {
                        gps_coordinates: { latitude: 39.18, longitude: -76.64 },
                    },
                },
            },
            {
                _id: 'first',
                trip: {
                    startLocation: {
                        gps_coordinates: { latitude: 39.32, longitude: -76.62 },
                    },
                    endLocation: {
                        gps_coordinates: { latitude: 39.2, longitude: -76.67 },
                    },
                },
            },
        ];

        expect(
            filterPostsByRouteRadius(
                posts,
                {
                    start: { latitude: 39.31, longitude: -76.61 },
                    end: { latitude: 39.2, longitude: -76.68 },
                },
                20
            ).map((post) => post._id)
        ).toEqual(['first', 'second']);
    });
});
