import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ROOT, getWeatherForecast } from './weatherService';

describe('weatherService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 1, 12));
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ temp: 22, condition: 'Sunny' }),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete global.fetch;
    });

    it('defaults weather requests to the deployed app API path', async () => {
        await getWeatherForecast(39.33, -76.62, '2026-05-01');

        const requestUrl = global.fetch.mock.calls[0][0];
        expect(API_ROOT).toBe('/api');
        expect(requestUrl).toBe('/api/weather/forecast?lat=39.33&lon=-76.62&date=2026-05-01&time=12%3A00');
    });

    it('accepts zero coordinates as valid weather coordinates', async () => {
        const result = await getWeatherForecast(0, 0, '2026-05-02');

        expect(result).toEqual({ temp: 22, condition: 'Sunny' });
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/weather/forecast?lat=0&lon=0&date=2026-05-02&time=12%3A00'
        );
    });

    it('skips weather requests more than 14 calendar days away', async () => {
        const result = await getWeatherForecast(39.33, -76.62, '2026-05-16');

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
