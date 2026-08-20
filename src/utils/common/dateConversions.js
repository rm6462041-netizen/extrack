import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

/**
 * Convert a native JS Date to a CalendarDate from @internationalized/date.
 * Returns null if the input is falsy or invalid.
 */
export function jsDateToCalendarDate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Convert a CalendarDate from @internationalized/date to a native JS Date.
 * Returns null if the input is falsy.
 */
export function calendarDateToJsDate(calendarDate) {
  if (!calendarDate) return null;
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
}

/**
 * Convert an app-style date range { from, to } (JS Dates) to react-aria style { start, end } (CalendarDates).
 * Returns null if both from and to are falsy.
 */
export function jsDateRangeToCalendarRange(range) {
  if (!range) return null;
  const start = jsDateToCalendarDate(range.from);
  const end = jsDateToCalendarDate(range.to);
  if (!start && !end) return null;
  return { start, end };
}

/**
 * Convert a react-aria style date range { start, end } (CalendarDates) to app-style { from, to } (JS Dates).
 * Returns { from: null, to: null } if the input is falsy.
 */
export function calendarRangeToJsDateRange(range) {
  if (!range) return { from: null, to: null };
  return {
    from: calendarDateToJsDate(range.start),
    to: calendarDateToJsDate(range.end),
  };
}
