import { describe, expect, it, vi } from 'vitest';
import {
  createApiResponse,
  createGeocodingPlace,
  getRequestedCoordinates,
  getSuggestionCalls,
  getWeatherCalls,
  jsonResponse,
  mockFetch,
  mockOpenWeather,
} from '../test/fixtures';
import { fetchCitySuggestions, fetchCurrentWeather, WeatherApiError } from './weatherApi';

const TOKYO = { city: 'Tokyo', countryCode: 'JP' };
const TOKYO_PLACE = createGeocodingPlace('Tokyo', 'JP', 'Tokyo', { lat: 35.68, lon: 139.76 });

describe('fetchCurrentWeather', () => {
  describe('a city search', () => {
    it('looks the city up in the geocoding API, then gets the weather at its coordinates', async () => {
      const fetchMock = mockOpenWeather(
        { places: [TOKYO_PLACE] },
        jsonResponse(createApiResponse()),
      );

      await fetchCurrentWeather(TOKYO);

      const [lookup, weather] = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
      expect(lookup?.origin + '' + lookup?.pathname).toBe(
        'https://api.openweathermap.org/geo/1.0/direct',
      );
      expect(lookup?.searchParams.get('q')).toBe('Tokyo,JP');
      expect(lookup?.searchParams.get('limit')).toBe('5');
      expect(lookup?.searchParams.get('appid')).toBe('test-api-key');
      expect(weather?.origin + '' + weather?.pathname).toBe(
        'https://api.openweathermap.org/data/2.5/weather',
      );
      expect(weather?.searchParams.get('lat')).toBe('35.68');
      expect(weather?.searchParams.get('lon')).toBe('139.76');
      expect(weather?.searchParams.get('units')).toBe('metric');
      expect(weather?.searchParams.has('q')).toBe(false);
    });

    it('names the report after the geocoding place, not the weather station', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2022-09-01T01:41:00.000Z'));
      // By coordinates, the weather API answers with the nearest station's name.
      mockOpenWeather(
        { places: [TOKYO_PLACE] },
        jsonResponse(createApiResponse({ name: 'Marunouchi', country: 'JP' })),
      );

      await expect(fetchCurrentWeather(TOKYO)).resolves.toEqual({
        city: 'Tokyo',
        countryCode: 'JP',
        condition: 'Clouds',
        description: 'scattered clouds',
        iconCode: '03d',
        temperature: 30.6,
        temperatureMin: 29.2,
        temperatureMax: 31.8,
        humidity: 58,
        feelsLike: 35.1,
        windSpeed: 3.1,
        retrievedAt: '2022-09-01T01:41:00.000Z',
        coordinates: { lat: 35.68, lon: 139.76 },
      });
    });

    it('works for names only the geocoding API knows ("Jeonju-si")', async () => {
      const place = createGeocodingPlace('Jeonju-si', 'KR', undefined, { lat: 35.82, lon: 127.15 });
      mockOpenWeather(
        { places: [place] },
        jsonResponse(createApiResponse({ name: 'Jeonju', country: 'KR' })),
      );

      await expect(
        fetchCurrentWeather({ city: 'Jeonju-si', countryCode: 'KR' }),
      ).resolves.toMatchObject({ city: 'Jeonju-si', countryCode: 'KR' });
    });

    it('takes the first place whose name starts with the typed city', async () => {
      mockOpenWeather(
        {
          places: [
            createGeocodingPlace('Laon', 'FR'), // a loose match: left out
            createGeocodingPlace('London', 'GB', 'England', { lat: 51.5, lon: -0.13 }),
          ],
        },
        jsonResponse(createApiResponse()),
      );

      await expect(fetchCurrentWeather({ city: 'lond', countryCode: '' })).resolves.toMatchObject({
        city: 'London',
        countryCode: 'GB',
      });
    });

    it('also accepts a match in another language', async () => {
      const seoul = { ...createGeocodingPlace('Seoul', 'KR'), local_names: { ko: '서울' } };
      mockOpenWeather({ places: [seoul] }, jsonResponse(createApiResponse()));

      await expect(fetchCurrentWeather({ city: '서울', countryCode: '' })).resolves.toMatchObject({
        city: 'Seoul',
      });
    });

    it('is "not found" when the geocoding API only has loose matches ("xxx" → Trenta)', async () => {
      const trenta = { ...createGeocodingPlace('Trenta', 'IT'), local_names: { it: 'Trenta' } };
      const fetchMock = mockOpenWeather({ places: [trenta] });

      await expect(fetchCurrentWeather({ city: 'xxx', countryCode: '' })).rejects.toMatchObject({
        kind: 'not-found',
      });
      expect(getWeatherCalls(fetchMock)).toHaveLength(0);
    });

    it('is "not found" when the geocoding API has no such place', async () => {
      const fetchMock = mockOpenWeather({ places: [] });

      await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({
        kind: 'not-found',
        message: 'Not found. Please check the city and country.',
      });
      expect(getWeatherCalls(fetchMock)).toHaveLength(0);
    });

    it('ignores malformed places in the geocoding response', async () => {
      mockOpenWeather({ places: [{ name: 'Tokyo', country: 'JP' }] }); // no coordinates

      await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({ kind: 'not-found' });
    });

    describe('a whole country', () => {
      const KOREA = { city: 'Seoul', countryCode: 'KR', countryName: 'South Korea' };
      const HONG_KONG = { city: 'City of Victoria', countryCode: 'HK', countryName: 'hong kong' };

      it('gets the weather for its capital', async () => {
        const fetchMock = mockOpenWeather(
          { places: [createGeocodingPlace('Seoul', 'KR')] },
          jsonResponse(createApiResponse()),
        );

        await expect(fetchCurrentWeather(KOREA)).resolves.toMatchObject({
          city: 'Seoul',
          countryCode: 'KR',
        });
        expect(getSuggestionCalls(fetchMock)).toHaveLength(1);
      });

      it("tries the country's own name when OpenWeather doesn't know the capital", async () => {
        const fetchMock = vi.fn<typeof fetch>(async (input) => {
          const q = new URL(String(input)).searchParams.get('q');
          if (q === 'hong kong,HK') return jsonResponse([createGeocodingPlace('Hong Kong', 'HK')]);
          if (String(input).includes('/geo/')) return jsonResponse([]);
          return jsonResponse(createApiResponse());
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchCurrentWeather(HONG_KONG)).resolves.toMatchObject({
          city: 'Hong Kong',
          countryCode: 'HK',
        });
      });

      it('finds territories OpenWeather files under another country, by their region', async () => {
        const fetchMock = vi.fn<typeof fetch>(async (input) => {
          const q = new URL(String(input)).searchParams.get('q');
          if (q === 'hong kong') {
            return jsonResponse([
              createGeocodingPlace('Hong Kong', 'GH', 'Greater Accra Region'), // wrong place
              createGeocodingPlace('Hong Kong Island', 'CN', 'Hong Kong'),
            ]);
          }
          if (String(input).includes('/geo/')) return jsonResponse([]);
          return jsonResponse(createApiResponse());
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchCurrentWeather(HONG_KONG)).resolves.toMatchObject({
          city: 'Hong Kong Island',
          countryCode: 'CN',
        });
      });

      it('asks for a city when neither is found', async () => {
        mockOpenWeather({ places: [] });

        await expect(fetchCurrentWeather(HONG_KONG)).rejects.toMatchObject({
          kind: 'not-found',
          message: 'Please type a city in Hong Kong SAR China.',
        });
      });
    });

    it('skips the lookup when the coordinates are already known', async () => {
      const fetchMock = mockFetch(jsonResponse(createApiResponse()));

      const report = await fetchCurrentWeather({
        city: 'Springfield',
        countryCode: 'US',
        coordinates: { lat: 39.8, lon: -89.64 },
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getRequestedCoordinates(fetchMock)).toBe('39.8,-89.64');
      expect(report).toMatchObject({
        city: 'Springfield',
        countryCode: 'US',
        coordinates: { lat: 39.8, lon: -89.64 },
      });
    });
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

  it('reports an error from the geocoding lookup too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({}, 401))),
    );

    await expect(fetchCurrentWeather(TOKYO)).rejects.toMatchObject({ kind: 'invalid-key' });
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
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('Aborted', 'AbortError'))),
    );

    await expect(fetchCurrentWeather(TOKYO, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('fetchCitySuggestions', () => {
  it('calls the geocoding API with the text and a result limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([]))),
    );

    await fetchCitySuggestions({ city: 'Joh', countryCode: '' });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.openweathermap.org/geo/1.0/direct');
    expect(url.searchParams.get('q')).toBe('Joh');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('appid')).toBe('test-api-key');
  });

  it('narrows the search to a country when one is given', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([]))),
    );

    await fetchCitySuggestions({ city: 'Joh', countryCode: 'MY' });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    expect(url.searchParams.get('q')).toBe('Joh,MY');
  });

  it('labels the capital of a searched country', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([createGeocodingPlace('Tokyo', 'JP', 'Tokyo')]))),
    );

    const [tokyo] = await fetchCitySuggestions({
      city: 'Tokyo',
      countryCode: 'JP',
      countryName: 'Japan',
    });

    expect(tokyo).toMatchObject({ city: 'Tokyo', note: 'Capital of Japan' });
  });

  it('leaves out places whose name does not start with the typed text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse([createGeocodingPlace('Laon', 'FR'), createGeocodingPlace('London', 'GB')]),
        ),
      ),
    );

    const suggestions = await fetchCitySuggestions({ city: 'Lon', countryCode: '' });

    expect(suggestions.map((suggestion) => suggestion.city)).toEqual(['London']);
  });

  it('maps places with their coordinates, and removes duplicates and malformed entries', async () => {
    const places = [
      createGeocodingPlace('Johor Bahru', 'MY', 'Johor'),
      createGeocodingPlace('Johor Bahru', 'MY', 'Johor'), // duplicate
      createGeocodingPlace('Johor', 'MY', undefined, { lat: 2, lon: 103.5 }), // no state
      { name: 'Broken' }, // no country
      { name: 'Nowhere', country: 'MY' }, // no coordinates: could not be searched
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(places))),
    );

    await expect(fetchCitySuggestions({ city: 'Joh', countryCode: '' })).resolves.toEqual([
      {
        id: 'johor bahru|johor|my',
        city: 'Johor Bahru',
        state: 'Johor',
        countryCode: 'MY',
        coordinates: { lat: 1.46, lon: 103.76 },
      },
      {
        id: 'johor||my',
        city: 'Johor',
        state: '',
        countryCode: 'MY',
        coordinates: { lat: 2, lon: 103.5 },
      },
    ]);
  });

  it('returns no suggestions for an unexpected response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ cod: 200 }))),
    );

    await expect(fetchCitySuggestions({ city: 'Joh', countryCode: '' })).resolves.toEqual([]);
  });

  it('throws a WeatherApiError when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({}, 401))),
    );

    await expect(fetchCitySuggestions({ city: 'Joh', countryCode: '' })).rejects.toMatchObject({
      kind: 'invalid-key',
    });
  });
});
