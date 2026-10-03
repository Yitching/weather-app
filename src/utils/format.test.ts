import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatIsoDateTime,
  formatRelativeTime,
  formatTemperature,
  formatTime,
  formatWindSpeed,
} from './format';

const NOW = new Date(2022, 8, 1, 21, 30);

describe('formatTime', () => {
  it('uses a 12-hour clock without a leading zero', () => {
    expect(formatTime(new Date(2022, 8, 1, 9, 41))).toBe('9:41 AM');
    expect(formatTime(new Date(2021, 2, 16, 15, 5))).toBe('3:05 PM');
  });

  it('shows midnight as 12 AM and noon as 12 PM', () => {
    expect(formatTime(new Date(2024, 0, 1, 0, 0))).toBe('12:00 AM');
    expect(formatTime(new Date(2024, 0, 1, 12, 30))).toBe('12:30 PM');
  });
});

describe('formatDateTime', () => {
  it('spells out the weekday and month', () => {
    expect(formatDateTime(new Date(2022, 8, 1, 9, 41), NOW)).toBe('Thu, 1 Sep · 9:41 AM');
  });

  it('adds the year when it is not the current one', () => {
    expect(formatDateTime(new Date(2021, 2, 16, 15, 5), NOW)).toBe('Tue, 16 Mar 2021 · 3:05 PM');
  });
});

describe('formatIsoDateTime', () => {
  it('formats a valid ISO string in local time', () => {
    const iso = new Date(2022, 8, 1, 21, 7).toISOString();
    expect(formatIsoDateTime(iso, NOW)).toBe('Thu, 1 Sep · 9:07 PM');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatIsoDateTime('not-a-date')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

  it('says "Just now" within the first minute', () => {
    expect(formatRelativeTime(ago(20_000), NOW)).toBe('Just now');
  });

  it('counts minutes within the first hour', () => {
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe('5 min ago');
    expect(formatRelativeTime(ago(59 * 60_000), NOW)).toBe('59 min ago');
  });

  it('shows the time for earlier today and yesterday', () => {
    expect(formatRelativeTime(new Date(2022, 8, 1, 9, 41).toISOString(), NOW)).toBe(
      'Today · 9:41 AM',
    );
    expect(formatRelativeTime(new Date(2022, 7, 31, 23, 0).toISOString(), NOW)).toBe(
      'Yesterday · 11:00 PM',
    );
  });

  it('falls back to the full date for older times', () => {
    expect(formatRelativeTime(new Date(2022, 7, 20, 8, 0).toISOString(), NOW)).toBe(
      'Sat, 20 Aug · 8:00 AM',
    );
  });

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });
});

describe('formatTemperature', () => {
  it('rounds to the nearest whole degree', () => {
    expect(formatTemperature(25.6)).toBe('26°');
    expect(formatTemperature(25.4)).toBe('25°');
  });

  it('handles negative temperatures without showing "-0"', () => {
    expect(formatTemperature(-3.7)).toBe('-4°');
    expect(formatTemperature(-0.3)).toBe('0°');
  });
});

describe('formatWindSpeed', () => {
  it('converts m/s to whole km/h', () => {
    expect(formatWindSpeed(3.1)).toBe('11 km/h');
    expect(formatWindSpeed(0)).toBe('0 km/h');
  });
});
