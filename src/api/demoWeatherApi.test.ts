import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_SUGGESTIONS_DELAY_MS,
  DEMO_WEATHER_DELAY_MS,
  fetchDemoCitySuggestions,
  fetchDemoWeather,
} from './demoWeatherApi';
import type { LocationQuery } from '../types/weather';
import { WeatherApiError } from './weatherApi';

/** Runs a demo request to completion without waiting in real time. */
async function settle<T>(promise: Promise<T>, delayMs: number): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.advanceTimersByTimeAsync(delayMs);
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

const weather = (query: LocationQuery) => settle(fetchDemoWeather(query), DEMO_WEATHER_DELAY_MS);

const suggestions = (city: string, countryCode = '') =>
  settle(fetchDemoCitySuggestions({ city, countryCode }), DEMO_SUGGESTIONS_DELAY_MS);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2022-09-01T01:41:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchDemoWeather', () => {
  it('returns sample weather for a known city and country, without any network call', async () => {
    await expect(weather({ city: 'Tokyo', countryCode: 'JP' })).resolves.toEqual({
      city: 'Tokyo',
      countryCode: 'JP',
      condition: 'Clouds',
      description: 'broken clouds',
      iconCode: '04d',
      temperature: 22.7,
      temperatureMin: 20.1,
      temperatureMax: 24.3,
      humidity: 64,
      feelsLike: 22.9,
      windSpeed: 3.6,
      // Stamped when the (simulated) response arrives, after the delay.
      retrievedAt: new Date(Date.UTC(2022, 8, 1, 1, 41) + DEMO_WEATHER_DELAY_MS).toISOString(),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores case and accents in the city name', async () => {
    await expect(weather({ city: '  sao PAULO ', countryCode: '' })).resolves.toMatchObject({
      city: 'São Paulo',
    });
  });

  it('uses the country to pick between places with the same name', async () => {
    await expect(weather({ city: 'London', countryCode: 'CA' })).resolves.toMatchObject({
      description: 'overcast clouds',
    });
  });

  it.each([
    ['an unknown city', { city: 'Atlantis', countryCode: '' }],
    ['a known city in the wrong country', { city: 'Tokyo', countryCode: 'KR' }],
  ])('throws a "not-found" error for %s', async (_label, query) => {
    const error = await weather(query).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WeatherApiError);
    expect(error).toMatchObject({ kind: 'not-found', message: /not found in the demo data/i });
  });

  it('rejects with an AbortError when cancelled', async () => {
    const controller = new AbortController();
    const request = fetchDemoWeather({ city: 'Tokyo', countryCode: '' }, controller.signal);

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects straight away if already cancelled', async () => {
    const request = fetchDemoWeather({ city: 'Tokyo', countryCode: '' }, AbortSignal.abort());

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('fetchDemoCitySuggestions', () => {
  it('suggests places whose name starts with the text', async () => {
    await expect(suggestions('jo')).resolves.toEqual([
      { id: 'johor bahru|johor|my', city: 'Johor Bahru', state: 'Johor', countryCode: 'MY' },
    ]);
  });

  it('can be narrowed to one country', async () => {
    const all = await suggestions('Lon');
    const inCanada = await suggestions('Lon', 'ca');

    expect(all.map((place) => place.countryCode)).toEqual(['GB', 'CA']);
    expect(inCanada).toEqual([
      { id: 'london|ontario|ca', city: 'London', state: 'Ontario', countryCode: 'CA' },
    ]);
  });

  it('returns nothing when no place matches', async () => {
    await expect(suggestions('zz')).resolves.toEqual([]);
  });
});
