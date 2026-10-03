const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats a date in the style used by the mockup, in the user's local time.
 * @example formatDateTime(new Date(2022, 8, 1, 9, 41)) // "01-09-2022 09:41am"
 */
export function formatDateTime(date: Date): string {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const period = hours24 < 12 ? 'am' : 'pm';

  return `${day}-${month}-${year} ${pad(hours12)}:${pad(date.getMinutes())}${period}`;
}

/** Same as {@link formatDateTime} but accepts an ISO string; returns "" for invalid input. */
export function formatIsoDateTime(isoString: string): string {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? '' : formatDateTime(date);
}

/** Rounds to a whole degree, e.g. 25.6 → "26°". Avoids showing "-0°". */
export function formatTemperature(celsius: number): string {
  const rounded = Math.round(celsius);
  return `${rounded === 0 ? 0 : rounded}°`;
}
