import type { Page } from '@playwright/test';

/** Sample places the fake API knows about. Anything else is "not found". */
const PLACES = [
  {
    name: 'Johor Bahru',
    state: 'Johor',
    country: 'MY',
    lat: 1.46,
    lon: 103.76,
    temp: 30.6,
    condition: 'Clouds',
  },
  {
    name: 'Osaka',
    state: 'Osaka Prefecture',
    country: 'JP',
    lat: 34.69,
    lon: 135.5,
    temp: 24.1,
    condition: 'Clear',
  },
  {
    name: 'Tokyo',
    state: 'Tokyo',
    country: 'JP',
    lat: 35.68,
    lon: 139.76,
    temp: 22.7,
    condition: 'Clouds',
  },
  {
    name: 'Seoul',
    state: 'Seoul',
    country: 'KR',
    lat: 37.57,
    lon: 126.98,
    temp: 18.2,
    condition: 'Rain',
  },
];

type Place = (typeof PLACES)[number];

/** A transparent 1×1 PNG, served in place of OpenWeather's weather icons. */
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Matches a place by name (and country code, when the query has one). */
function findPlaces(q: string, matchName: (placeName: string, text: string) => boolean) {
  const [text = '', countryCode = ''] = q.toLowerCase().split(',');
  return PLACES.filter(
    (place) =>
      matchName(place.name.toLowerCase(), text.trim()) &&
      (!countryCode || place.country.toLowerCase() === countryCode),
  );
}

function toGeocodingPlace({ name, state, country, lat, lon }: Place) {
  return { name, state, country, lat, lon };
}

function toWeatherResponse(place: Place) {
  return {
    // Like the real API, a search by coordinates is named after a nearby station.
    name: `${place.name} Station`,
    coord: { lat: place.lat, lon: place.lon },
    sys: { country: place.country },
    weather: [{ main: place.condition, description: 'sample weather', icon: '03d' }],
    main: { temp: place.temp, temp_min: place.temp - 2, temp_max: place.temp + 2, humidity: 58 },
  };
}

/**
 * Intercepts every OpenWeather request made by the page and answers with sample
 * data, so tests are fast, deterministic and need no API key.
 * @returns every name looked up in the geocoding API (its `q`), for assertions.
 */
export async function mockOpenWeather(page: Page): Promise<string[]> {
  const lookedUpNames: string[] = [];

  await page.route('https://api.openweathermap.org/**', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') ?? '';

    // Geocoding API (suggestions and typed searches): names starting with the text.
    if (url.pathname.startsWith('/geo/')) {
      lookedUpNames.push(q);
      const places = findPlaces(q, (name, text) => name.startsWith(text));
      return route.fulfill({ json: places.map(toGeocodingPlace) });
    }

    // Current weather API, by coordinates.
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));
    const place = PLACES.find((candidate) => candidate.lat === lat && candidate.lon === lon);
    if (!place) {
      return route.fulfill({ status: 404, json: { cod: '404', message: 'city not found' } });
    }
    return route.fulfill({ json: toWeatherResponse(place) });
  });

  await page.route('https://openweathermap.org/img/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
  );

  return lookedUpNames;
}
