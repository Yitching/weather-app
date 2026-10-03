import { vi } from 'vitest';
import type { SearchHistoryEntry, WeatherReport } from '../types/weather';

/** A realistic OpenWeather "current weather" response body. */
export function createApiResponse(overrides: { name?: string; country?: string } = {}) {
  return {
    name: overrides.name ?? 'Johor Bahru',
    sys: { country: overrides.country ?? 'MY' },
    weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
    main: { temp: 30.6, feels_like: 35.1, temp_min: 29.2, temp_max: 31.8, humidity: 58 },
    cod: 200,
  };
}

/** Builds a `fetch` Response with a JSON body. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type MockReply = Response | Error | DOMException;

const isGeocodingRequest = (input: unknown) => String(input).includes('/geo/1.0/');

/**
 * Replaces global fetch with a mock and returns it for assertions.
 * Weather requests receive `weatherReplies` in order; city-suggestion
 * (geocoding) requests always receive `suggestions`.
 */
export function mockFetchWithSuggestions(suggestions: unknown, ...weatherReplies: MockReply[]) {
  const queue = [...weatherReplies];
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (isGeocodingRequest(input)) return jsonResponse(suggestions);
    const reply = queue.shift();
    if (reply === undefined) throw new TypeError('No mocked weather response left');
    if (reply instanceof Response) return reply;
    throw reply;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Same as {@link mockFetchWithSuggestions}, with no city suggestions. */
export function mockFetch(...weatherReplies: MockReply[]) {
  return mockFetchWithSuggestions([], ...weatherReplies);
}

type FetchMock = ReturnType<typeof mockFetch>;

/** Only the weather requests (suggestion lookups are left out). */
export function getWeatherCalls(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([input]) => !isGeocodingRequest(input));
}

/** Only the city-suggestion requests. */
export function getSuggestionCalls(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([input]) => isGeocodingRequest(input));
}

/** Reads the `q` search param from the n-th weather request. */
export function getRequestedQuery(fetchMock: FetchMock, callIndex = 0) {
  const url = getWeatherCalls(fetchMock)[callIndex]?.[0];
  return new URL(String(url)).searchParams.get('q');
}

/** A realistic OpenWeather geocoding ("direct") response item. */
export function createGeocodingPlace(name: string, country: string, state?: string) {
  return { name, country, state, lat: 1.46, lon: 103.76, local_names: { en: name } };
}

export function createReport(overrides: Partial<WeatherReport> = {}): WeatherReport {
  return {
    city: 'Johor Bahru',
    countryCode: 'MY',
    condition: 'Clouds',
    description: 'scattered clouds',
    iconCode: '03d',
    temperature: 30.6,
    temperatureMin: 29.2,
    temperatureMax: 31.8,
    humidity: 58,
    retrievedAt: new Date(2022, 8, 1, 9, 41).toISOString(),
    ...overrides,
  };
}

export function createHistoryEntry(
  overrides: Partial<SearchHistoryEntry> = {},
): SearchHistoryEntry {
  const city = overrides.city ?? 'Osaka';
  const countryCode = overrides.countryCode ?? 'JP';
  return {
    id: `${city}|${countryCode}`.toLowerCase(),
    city,
    countryCode,
    searchedAt: new Date(2022, 8, 1, 9, 41).toISOString(),
    ...overrides,
  };
}
