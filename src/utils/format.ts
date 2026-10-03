const pad = (value: number): string => String(value).padStart(2, '0');

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Parses an ISO string; returns null for invalid input. */
function parseIso(isoString: string): Date | null {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 12-hour clock time in the user's local time.
 * @example formatTime(new Date(2022, 8, 1, 21, 5)) // "9:05 PM"
 */
export function formatTime(date: Date): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const period = hours24 < 12 ? 'AM' : 'PM';
  return `${hours12}:${pad(date.getMinutes())} ${period}`;
}

/**
 * Day, date and time. The month is spelled out so the date is never ambiguous
 * (03-10 could be 3 October or March 10). The year is only shown when it isn't `now`'s.
 * @example formatDateTime(new Date(2022, 8, 1, 9, 41)) // "Thu, 1 Sep 2022 · 9:41 AM"
 */
export function formatDateTime(date: Date, now: Date = new Date()): string {
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  const day = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
  return `${day} · ${formatTime(date)}`;
}

/** Same as {@link formatDateTime} but accepts an ISO string; returns "" for invalid input. */
export function formatIsoDateTime(isoString: string, now?: Date): string {
  const date = parseIso(isoString);
  return date ? formatDateTime(date, now) : '';
}

/**
 * How long ago, for recent times ("Just now", "5 min ago", "Today · 9:41 AM"),
 * falling back to the full date. Returns "" for invalid input.
 */
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const date = parseIso(isoString);
  if (!date) return '';

  const elapsed = now.getTime() - date.getTime();
  if (elapsed >= 0 && elapsed < MINUTE_MS) return 'Just now';
  if (elapsed >= 0 && elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (isSameDay(date, now)) return `Today · ${formatTime(date)}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `Yesterday · ${formatTime(date)}`;

  return formatDateTime(date, now);
}

/** Rounds to a whole degree, e.g. 25.6 → "26°". Avoids showing "-0°". */
export function formatTemperature(celsius: number): string {
  const rounded = Math.round(celsius);
  return `${rounded === 0 ? 0 : rounded}°`;
}

/** Converts OpenWeather's m/s to the more familiar km/h, e.g. 3.1 → "11 km/h". */
export function formatWindSpeed(metresPerSecond: number): string {
  return `${Math.round(metresPerSecond * 3.6)} km/h`;
}
