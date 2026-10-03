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

/** Replaces global fetch with a mock and returns it for assertions. */
export function mockFetch(...responses: Array<Response | Error | DOMException>) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Response) fetchMock.mockResolvedValueOnce(response);
    else fetchMock.mockRejectedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Reads the `q` search param from the n-th fetch call. */
export function getRequestedQuery(fetchMock: ReturnType<typeof mockFetch>, callIndex = 0) {
  const url = fetchMock.mock.calls[callIndex]?.[0];
  return new URL(String(url)).searchParams.get('q');
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
