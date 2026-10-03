import { vi } from 'vitest';
import type { SearchHistoryEntry, WeatherReport } from '../types/weather';

/** A realistic OpenWeather "current weather" response body. */
export function createApiResponse(overrides: { name?: string; country?: string } = {}) {
  return {
    name: overrides.name ?? 'Johor Bahru',
    sys: { country: overrides.country ?? 'MY' },
    weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
    main: { temp: 30.6, feels_like: 35.1, temp_min: 29.2, temp_max: 31.8, humidity: 58 },
    wind: { speed: 3.1, deg: 120 },
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
const getQ = (input: unknown) => new URL(String(input)).searchParams.get('q') ?? '';

/** By default the geocoding API "knows" any searched city: "Osaka,JP" → Osaka, JP. */
function echoPlace(input: unknown) {
  const [name = '', countryCode = ''] = getQ(input).split(',');
  return [createGeocodingPlace(name, countryCode)];
}

interface MockFetchOptions {
  /**
   * Reply to geocoding requests (suggestions and typed searches alike).
   * Defaults to one place named as searched.
   */
  places?: unknown;
}

/**
 * Replaces global fetch with a mock and returns it for assertions.
 * Weather requests receive `weatherReplies` in order; geocoding requests receive
 * `options.places`.
 */
export function mockOpenWeather({ places }: MockFetchOptions, ...weatherReplies: MockReply[]) {
  const queue = [...weatherReplies];
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (isGeocodingRequest(input)) return jsonResponse(places ?? echoPlace(input));
    const reply = queue.shift();
    if (reply === undefined) throw new TypeError('No mocked weather response left');
    if (reply instanceof Response) return reply;
    throw reply;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** {@link mockOpenWeather} where the geocoding API knows these places. */
export function mockFetchWithSuggestions(places: unknown, ...weatherReplies: MockReply[]) {
  return mockOpenWeather({ places }, ...weatherReplies);
}

/** {@link mockOpenWeather} where every searched city exists. */
export function mockFetch(...weatherReplies: MockReply[]) {
  return mockOpenWeather({}, ...weatherReplies);
}

type FetchMock = ReturnType<typeof mockFetch>;

/** Only the weather requests (geocoding requests are left out). */
export function getWeatherCalls(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([input]) => !isGeocodingRequest(input));
}

/** Only the geocoding requests (suggestions and typed searches' place lookups). */
export function getSuggestionCalls(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([input]) => isGeocodingRequest(input));
}

/** The `q` of the n-th geocoding request: what was looked up by name. */
export function getRequestedQuery(fetchMock: FetchMock, callIndex = 0) {
  const url = getSuggestionCalls(fetchMock)[callIndex]?.[0];
  return url === undefined ? null : getQ(url);
}

/** The `lat,lon` of the n-th weather request, or null if it searched by name. */
export function getRequestedCoordinates(fetchMock: FetchMock, callIndex = 0) {
  const url = new URL(String(getWeatherCalls(fetchMock)[callIndex]?.[0]));
  const lat = url.searchParams.get('lat');
  return lat === null ? null : `${lat},${url.searchParams.get('lon')}`;
}

/** A realistic OpenWeather geocoding ("direct") response item. */
export function createGeocodingPlace(
  name: string,
  country: string,
  state?: string,
  coordinates = { lat: 1.46, lon: 103.76 },
) {
  return { name, country, state, ...coordinates, local_names: { en: name } };
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
    feelsLike: 35.1,
    windSpeed: 3.1,
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
