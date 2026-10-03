import { describe, expect, it, vi } from 'vitest';
import { createApiResponse, getRequestedQuery, jsonResponse, mockFetch } from '../test/fixtures';
import { fetchCurrentWeather, getWeatherIconUrl, WeatherApiError } from './weatherApi';

const TOKYO = { city: 'Tokyo', countryCode: 'JP' };

describe('fetchCurrentWeather', () => {
  it('calls OpenWeather with the query, metric units and API key', async () => {
    const fetchMock = mockFetch(jsonResponse(createApiResponse()));

    await fetchCurrentWeather(TOKYO);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.openweathermap.org/data/2.5/weather');
    expect(url.searchParams.get('q')).toBe('Tokyo,JP');
    expect(url.searchParams.get('units')).toBe('metric');
    expect(url.searchParams.get('appid')).toBe('test-api-key');
  });

  it('searches by country name when no city is given', async () => {
    const fetchMock = mockFetch(
      jsonResponse(createApiResponse({ name: 'Singapore', country: 'SG' })),
    );

    await fetchCurrentWeather({ city: '', countryCode: 'SG' });

    expect(getRequestedQuery(fetchMock)).toBe('Singapore');
  });

  it('maps the API response to a WeatherReport', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2022-09-01T01:41:00.000Z'));
    mockFetch(jsonResponse(createApiResponse()));

    await expect(fetchCurrentWeather(TOKYO)).resolves.toEqual({
      city: 'Johor Bahru',
      countryCode: 'MY',
      condition: 'Clouds',
      description: 'scattered clouds',
      iconCode: '03d',
      temperature: 30.6,
      temperatureMin: 29.2,
      temperatureMax: 31.8,
      humidity: 58,
      retrievedAt: '2022-09-01T01:41:00.000Z',
    });
  });

  it('falls back to the requested country code if the response has none', async () => {
    const body = { ...createApiResponse(), sys: {} };
    mockFetch(jsonResponse(body));

    const report = await fetchCurrentWeather(TOKYO);

    expect(report.countryCode).toBe('JP');
  });

  it.each([
    [404, 'not-found', /not found/i],
    [400, 'not-found', /not found/i],
    [401, 'invalid-key', /API key/],
    [429, 'rate-limited', /too many requests/i],
    [500, 'unknown', /unavailable/i],
  ])('turns HTTP %i into a "%s" error', async (status, kind, message) => {
    mockFetch(jsonResponse({ cod: String(status), message: 'error' }, status));

    const error = await fetchCurrentWeather(TOKYO).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WeatherApiError);
    expect(error).toMatchObject({ kind });
    expect((error as Error).message).toMatch(message);
  });

  it('reports a network failure', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({
      kind: 'network',
      message: expect.stringMatching(/unable to reach/i),
    });
  });

  it('rejects an unexpected response body', async () => {
    mockFetch(jsonResponse({ hello: 'world' }));

    await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({ kind: 'unknown' });
  });

  it('rejects a body that is not JSON', async () => {
    mockFetch(new Response('<html>oops</html>', { status: 200 }));

    await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({ kind: 'unknown' });
  });

  it('fails fast without calling the API when no key is configured', async () => {
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
    const fetchMock = mockFetch();

    await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({ kind: 'missing-key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-throws the abort error when the request is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    mockFetch(new DOMException('Aborted', 'AbortError'));

    await expect(fetchCurrentWeather(TOKYO, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('getWeatherIconUrl', () => {
  it('builds the large icon URL', () => {
    expect(getWeatherIconUrl('03d')).toBe('https://openweathermap.org/img/wn/03d@4x.png');
  });
});
