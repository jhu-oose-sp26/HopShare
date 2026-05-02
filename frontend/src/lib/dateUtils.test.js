import { describe, expect, it } from 'vitest';
import { formatDateOnly, getCalendarDayDiff, parseDateOnly } from './dateUtils';

describe('parseDateOnly', () => {
    it('parses YYYY-MM-DD strings as local calendar dates', () => {
        const parsed = parseDateOnly('2026-05-01');

        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(4);
        expect(parsed.getDate()).toBe(1);
    });
});

describe('getCalendarDayDiff', () => {
    it('treats the same YYYY-MM-DD calendar date as today', () => {
        const diff = getCalendarDayDiff('2026-05-01', new Date(2026, 4, 1, 15));

        expect(diff).toBe(0);
    });
});

describe('formatDateOnly', () => {
    it('formats dates without shifting through UTC', () => {
        expect(formatDateOnly(new Date(2026, 4, 1, 23))).toBe('2026-05-01');
    });
});
