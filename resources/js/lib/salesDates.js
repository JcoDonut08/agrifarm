const timeZone = 'Asia/Manila';
const calendarFormatter = new Intl.DateTimeFormat('en-PH', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
});

export function deliveryDate(order) {
    if (order.status !== 'delivered' || !order.delivered_at) return null;
    const date = new Date(order.delivered_at);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function orderActivityDate(order) {
    if (order.status === 'delivered') return deliveryDate(order);
    const date = new Date(order.created_at);
    return Number.isNaN(date.getTime()) ? null : date;
}

// Calendar-only dates keep existing chart bucket calculations in Philippine
// time even when the browser runs in another timezone. Never persist these.
export function manilaCalendarDate(value = new Date()) {
    if (!value) return null;
    const parts = calendarFormatter.formatToParts(value);
    const part = type => Number(parts.find(item => item.type === type).value);
    return new Date(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
}

export function manilaInputDate(value = new Date()) {
    const date = manilaCalendarDate(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function salesReportRange(from, to) {
    const today = manilaInputDate();
    const start = new Date(`${from || `${today.slice(0, 7)}-01`}T00:00:00+08:00`);
    const lastDay = new Date(`${to || today}T00:00:00+08:00`);
    return { start, end: new Date(Math.max(start.getTime(), lastDay.getTime()) + 86400000) };
}
