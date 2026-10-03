import { describe, expect, it } from 'vitest';
import { formatDateTime, formatIsoDateTime, formatTemperature } from './format';

describe('formatDateTime', () => {
  it('formats a morning time like the mockup', () => {
    expect(formatDateTime(new Date(2022, 8, 1, 9, 41))).toBe('01-09-2022 09:41am');
  });

  it('formats an afternoon time with pm', () => {
    expect(formatDateTime(new Date(2021, 2, 16, 15, 5))).toBe('16-03-2021 03:05pm');
  });

  it('shows midnight as 12am and noon as 12pm', () => {
    expect(formatDateTime(new Date(2024, 0, 1, 0, 0))).toBe('01-01-2024 12:00am');
    expect(formatDateTime(new Date(2024, 0, 1, 12, 30))).toBe('01-01-2024 12:30pm');
  });
});

describe('formatIsoDateTime', () => {
  it('formats a valid ISO string in local time', () => {
    const iso = new Date(2022, 8, 1, 21, 7).toISOString();
    expect(formatIsoDateTime(iso)).toBe('01-09-2022 09:07pm');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatIsoDateTime('not-a-date')).toBe('');
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
