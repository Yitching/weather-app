import type { LocationQuery, WeatherReport } from '../types/weather';
import { toApiQuery } from '../utils/location';

const CURRENT_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const ICON_BASE_URL = 'https://openweathermap.org/img/wn';

/** The subset of OpenWeather's "Current weather" response that this app uses. */
interface OpenWeatherResponse {
  name: string;
  sys: { country?: string };
  weather: Array<{ main: string; description: string; icon: string }>;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
}

export type WeatherErrorKind =
  'not-found' | 'invalid-key' | 'missing-key' | 'rate-limited' | 'network' | 'unknown';

/** Error with a user-friendly message and a `kind` callers can branch on. */
export class WeatherApiError extends Error {
  readonly kind: WeatherErrorKind;

  constructor(kind: WeatherErrorKind, message: string) {
    super(message);
    this.name = 'WeatherApiError';
    this.kind = kind;
  }
}

/** Builds the URL for OpenWeather's weather condition icon. */
export function getWeatherIconUrl(iconCode: string): string {
  return `${ICON_BASE_URL}/${iconCode}@4x.png`;
}

function errorFromStatus(status: number): WeatherApiError {
  switch (status) {
    case 400:
    case 404:
      return new WeatherApiError('not-found', 'Not found. Please check the city and country.');
    case 401:
      return new WeatherApiError(
        'invalid-key',
        'The weather service rejected the API key. Please check your configuration.',
      );
    case 429:
      return new WeatherApiError(
        'rate-limited',
        'Too many requests. Please wait a moment and try again.',
      );
    default:
      return new WeatherApiError(
        'unknown',
        'The weather service is unavailable right now. Please try again later.',
      );
  }
}

function isOpenWeatherResponse(data: unknown): data is OpenWeatherResponse {
  const candidate = data as Partial<OpenWeatherResponse> | null;
  return (
    typeof candidate?.name === 'string' &&
    Array.isArray(candidate.weather) &&
    candidate.weather.length > 0 &&
    typeof candidate.main?.temp === 'number'
  );
}

function toWeatherReport(data: OpenWeatherResponse, query: LocationQuery): WeatherReport {
  // `weather` is guaranteed non-empty by isOpenWeatherResponse.
  const [condition] = data.weather as [OpenWeatherResponse['weather'][number]];
  return {
    city: data.name,
    // A few places (e.g. disputed areas) have no country in the response.
    countryCode: data.sys.country ?? query.countryCode,
    condition: condition.main,
    description: condition.description,
    iconCode: condition.icon,
    temperature: data.main.temp,
    temperatureMin: data.main.temp_min,
    temperatureMax: data.main.temp_max,
    humidity: data.main.humidity,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Fetches today's weather (metric units) for a location.
 * @throws {WeatherApiError} with a user-friendly message on any failure.
 * Aborting via `signal` rejects with the native `AbortError` instead.
 */
export async function fetchCurrentWeather(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<WeatherReport> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new WeatherApiError(
      'missing-key',
      'No API key configured. Add VITE_OPENWEATHER_API_KEY to your .env file (see README).',
    );
  }

  const params = new URLSearchParams({ q: toApiQuery(query), units: 'metric', appid: apiKey });

  let response: Response;
  try {
    response = await fetch(`${CURRENT_WEATHER_URL}?${params.toString()}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WeatherApiError(
      'network',
      'Unable to reach the weather service. Please check your internet connection.',
    );
  }

  if (!response.ok) throw errorFromStatus(response.status);

  const data: unknown = await response.json().catch(() => null);
  if (!isOpenWeatherResponse(data)) {
    throw new WeatherApiError(
      'unknown',
      'Received an unexpected response from the weather service.',
    );
  }
  return toWeatherReport(data, query);
}
