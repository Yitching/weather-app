import type { Page } from '@playwright/test';

/** Sample places the fake API knows about. Anything else returns 404 "city not found". */
const PLACES = [
  { name: 'Johor Bahru', state: 'Johor', country: 'MY', temp: 30.6, condition: 'Clouds' },
  { name: 'Osaka', state: 'Osaka Prefecture', country: 'JP', temp: 24.1, condition: 'Clear' },
  { name: 'Tokyo', state: 'Tokyo', country: 'JP', temp: 22.7, condition: 'Clouds' },
  { name: 'Seoul', state: 'Seoul', country: 'KR', temp: 18.2, condition: 'Rain' },
];

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

/**
 * Intercepts every OpenWeather request made by the page and answers with sample
 * data, so tests are fast, deterministic and need no API key.
 * @returns the `q` values of weather requests, for assertions.
 */
export async function mockOpenWeather(page: Page): Promise<string[]> {
  const weatherQueries: string[] = [];

  await page.route('https://api.openweathermap.org/**', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') ?? '';

    // City suggestions (geocoding API): places whose name starts with the text.
    if (url.pathname.startsWith('/geo/')) {
      const places = findPlaces(q, (name, text) => name.startsWith(text));
      return route.fulfill({
        json: places.map(({ name, state, country }) => ({ name, state, country })),
      });
    }

    // Current weather API: exact name match.
    weatherQueries.push(q);
    const [place] = findPlaces(q, (name, text) => name === text);
    if (!place) {
      return route.fulfill({ status: 404, json: { cod: '404', message: 'city not found' } });
    }
    return route.fulfill({
      json: {
        name: place.name,
        sys: { country: place.country },
        weather: [{ main: place.condition, description: 'sample weather', icon: '03d' }],
        main: {
          temp: place.temp,
          temp_min: place.temp - 2,
          temp_max: place.temp + 2,
          humidity: 58,
        },
      },
    });
  });

  await page.route('https://openweathermap.org/img/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
  );

  return weatherQueries;
}
