export function parseDateOnly(date) {
    if (date instanceof Date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    if (typeof date === 'string') {
        const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
    }

    const parsed = new Date(date);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getCalendarDayDiff(date, baseDate = new Date()) {
    const targetDate = parseDateOnly(date);
    const today = parseDateOnly(baseDate);

    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
}

export function formatDateOnly(date) {
    const localDate = parseDateOnly(date);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
