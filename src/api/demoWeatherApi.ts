import type { CitySuggestion, LocationQuery, WeatherReport } from '../types/weather';
import { getCountryName } from '../utils/country';
import { WeatherApiError } from './weatherApi';

/**
 * Pretend network time, so demo mode shows the same loading states as the real API.
 * Suggestions are already debounced, so they wait less.
 */
export const DEMO_WEATHER_DELAY_MS = 400;
export const DEMO_SUGGESTIONS_DELAY_MS = 100;
const MAX_SUGGESTIONS = 5;

interface DemoPlace {
  /** State / province, shown in city suggestions. */
  state: string;
  weather: Omit<WeatherReport, 'retrievedAt'>;
}

/** Fixed sample weather for a few well-known places. */
// prettier-ignore
export const DEMO_PLACES: readonly DemoPlace[] = [
  place('Singapore', '', 'SG', 'Thunderstorm', 'thunderstorm', '11d', 29.4, 27.8, 31.2, 82, 35.2, 4.6),
  place('Kuala Lumpur', 'Kuala Lumpur', 'MY', 'Rain', 'light rain', '10d', 28.1, 25.9, 32.0, 79, 32.4, 2.1),
  place('Johor Bahru', 'Johor', 'MY', 'Clouds', 'scattered clouds', '03d', 30.6, 29.2, 31.8, 58, 35.1, 3.1),
  place('Tokyo', 'Tokyo', 'JP', 'Clouds', 'broken clouds', '04d', 22.7, 20.1, 24.3, 64, 22.9, 3.6),
  place('Osaka', 'Osaka Prefecture', 'JP', 'Clear', 'clear sky', '01d', 24.1, 21.5, 26.0, 55, 24.0, 2.6),
  place('Seoul', 'Seoul', 'KR', 'Rain', 'moderate rain', '10d', 18.2, 16.0, 19.8, 88, 18.4, 5.1),
  place('Bangkok', 'Bangkok', 'TH', 'Clouds', 'few clouds', '02d', 33.0, 27.5, 34.6, 66, 39.8, 2.4),
  place('Jakarta', 'Jakarta', 'ID', 'Haze', 'haze', '50d', 31.2, 26.4, 33.1, 70, 37.0, 1.5),
  place('Mumbai', 'Maharashtra', 'IN', 'Rain', 'heavy intensity rain', '10d', 27.3, 26.1, 29.0, 91, 31.6, 6.2),
  place('Dubai', 'Dubai', 'AE', 'Clear', 'clear sky', '01d', 37.8, 31.2, 40.5, 38, 41.3, 4.1),
  place('Sydney', 'New South Wales', 'AU', 'Clear', 'clear sky', '01d', 19.5, 13.8, 21.0, 52, 19.0, 5.7),
  place('London', 'England', 'GB', 'Drizzle', 'drizzle', '09d', 14.2, 11.6, 16.1, 81, 13.7, 4.9),
  place('Paris', 'Ile-de-France', 'FR', 'Clouds', 'few clouds', '02d', 16.8, 12.9, 18.3, 67, 16.2, 3.3),
  place('Berlin', '', 'DE', 'Mist', 'mist', '50d', 11.3, 9.0, 13.6, 93, 10.6, 1.8),
  place('Reykjavik', 'Capital Region', 'IS', 'Snow', 'light snow', '13d', -1.4, -3.2, 0.8, 86, -6.8, 7.4),
  place('New York', 'New York', 'US', 'Clear', 'clear sky', '01d', 21.6, 17.3, 23.4, 49, 21.1, 3.9),
  place('Toronto', 'Ontario', 'CA', 'Clouds', 'scattered clouds', '03d', 15.0, 10.2, 17.5, 61, 14.3, 4.4),
  place('London', 'Ontario', 'CA', 'Clouds', 'overcast clouds', '04d', 12.4, 8.9, 15.2, 73, 11.6, 3.0),
  place('São Paulo', '', 'BR', 'Thunderstorm', 'thunderstorm', '11d', 25.9, 19.7, 28.3, 77, 26.8, 2.8),
  place('Cairo', 'Cairo', 'EG', 'Clear', 'clear sky', '01d', 33.4, 23.8, 35.1, 27, 32.1, 5.2),
];

function place(
  city: string,
  state: string,
  countryCode: string,
  condition: string,
  description: string,
  iconCode: string,
  temperature: number,
  temperatureMin: number,
  temperatureMax: number,
  humidity: number,
  feelsLike: number,
  windSpeed: number,
): DemoPlace {
  return {
    state,
    weather: {
      city,
      countryCode,
      condition,
      description,
      iconCode,
      temperature,
      temperatureMin,
      temperatureMax,
      humidity,
      feelsLike,
      windSpeed,
    },
  };
}

/** Case- and accent-insensitive, so "sao paulo" finds "São Paulo". */
function normalize(text: string): string {
  return text
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Resolves after `ms`, or rejects with the native `AbortError` like `fetch` does. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Demo version of `fetchCurrentWeather`: same contract, but answered from
 * {@link DEMO_PLACES} without any network or API key.
 */
export async function fetchDemoWeather(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<WeatherReport> {
  await wait(DEMO_WEATHER_DELAY_MS, signal);

  const city = normalize(query.city);
  const match = DEMO_PLACES.find(
    (candidate) =>
      normalize(candidate.weather.city) === city &&
      (!query.countryCode || candidate.weather.countryCode === query.countryCode),
  );
  if (!match) {
    throw new WeatherApiError(
      'not-found',
      'Not found in the demo data. Try a city such as Tokyo, London or Singapore.',
    );
  }

  return { ...match.weather, retrievedAt: new Date().toISOString() };
}

/** Demo version of `fetchCitySuggestions`: places whose name starts with the text. */
export async function fetchDemoCitySuggestions(
  { city, countryCode, countryName }: LocationQuery,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  await wait(DEMO_SUGGESTIONS_DELAY_MS, signal);

  const text = normalize(city);
  const note = countryName ? `Capital of ${getCountryName(countryCode)}` : undefined;
  return DEMO_PLACES.filter(
    ({ weather }) =>
      normalize(weather.city).startsWith(text) &&
      (!countryCode || weather.countryCode === countryCode.toUpperCase()),
  )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ state, weather }) => ({
      id: [weather.city, state, weather.countryCode].join('|').toLowerCase(),
      city: weather.city,
      state,
      countryCode: weather.countryCode,
      ...(note && { note }),
    }));
}
