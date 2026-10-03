import { describe, expect, it } from 'vitest';
import { getSky, getWeatherIllustration, getWeatherKind, isNight } from './weatherIllustration';

describe('getWeatherKind', () => {
  it('maps OpenWeather icon groups to weather kinds', () => {
    expect(getWeatherKind('01d')).toBe('clear');
    expect(getWeatherKind('02n')).toBe('partly-cloudy');
    expect(getWeatherKind('03d')).toBe('cloudy');
    expect(getWeatherKind('04d')).toBe('cloudy');
    expect(getWeatherKind('09d')).toBe('drizzle');
    expect(getWeatherKind('10d')).toBe('rain');
    expect(getWeatherKind('11d')).toBe('thunderstorm');
    expect(getWeatherKind('13d')).toBe('snow');
    expect(getWeatherKind('50d')).toBe('mist');
  });

  it('treats unknown codes as cloudy', () => {
    expect(getWeatherKind('99d')).toBe('cloudy');
  });
});

describe('isNight', () => {
  it('reads the day/night suffix', () => {
    expect(isNight('01n')).toBe(true);
    expect(isNight('01d')).toBe(false);
  });
});

describe('getWeatherIllustration', () => {
  it('shows the sun or moon for a clear sky', () => {
    expect(getWeatherIllustration('01d')).toMatch(/clear-day/);
    expect(getWeatherIllustration('01n')).toMatch(/clear-night/);
  });

  it('shows the sun or moon behind a cloud for few clouds', () => {
    expect(getWeatherIllustration('02d')).toMatch(/partly-cloudy-day/);
    expect(getWeatherIllustration('02n')).toMatch(/partly-cloudy-night/);
  });

  it('shows the sun shower by day and the rain cloud at night when it rains', () => {
    expect(getWeatherIllustration('10d')).toMatch(/sun/);
    expect(getWeatherIllustration('10n')).toMatch(/cloud\./);
  });

  it('uses the same art day and night for the other kinds', () => {
    const expected = {
      '03': /cloudy/,
      '04': /cloudy/,
      '09': /cloud\./,
      '11': /thunderstorms/,
      '13': /snow/,
      '50': /mist/,
    };
    for (const [group, image] of Object.entries(expected)) {
      expect(getWeatherIllustration(`${group}d`)).toMatch(image);
      expect(getWeatherIllustration(`${group}n`)).toMatch(image);
    }
  });
});

describe('getSky', () => {
  it('follows the weather by day', () => {
    expect(getSky('01d')).toBe('clear');
    expect(getSky('04d')).toBe('clouds');
    expect(getSky('10d')).toBe('rain');
    expect(getSky('13d')).toBe('snow');
  });

  it('is night after dark, except during storms', () => {
    expect(getSky('01n')).toBe('night');
    expect(getSky('10n')).toBe('night');
    expect(getSky('11n')).toBe('storm');
  });
});
