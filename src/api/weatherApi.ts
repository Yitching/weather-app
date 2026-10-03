import type { CitySuggestion, LocationQuery, WeatherReport } from '../types/weather';
import { toApiQuery } from '../utils/location';

const CURRENT_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const ICON_BASE_URL = 'https://openweathermap.org/img/wn';
/** OpenWeather's geocoding API returns at most 5 places. */
const MAX_SUGGESTIONS = 5;

/** The subset of OpenWeather's "Current weather" response that this app uses. */
interface OpenWeatherResponse {
  name: string;
  sys: { country?: string };
  weather: Array<{ main: string; description: string; icon: string }>;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
}

/** One place from OpenWeather's geocoding ("direct") response. */
interface GeocodingPlace {
  name: string;
  country: string;
  state?: string;
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
 * Sends a GET request to OpenWeather and returns the parsed JSON body.
 * Shared by every endpoint so API-key, network and HTTP errors are handled once.
 */
async function requestOpenWeather(
  baseUrl: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<unknown> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new WeatherApiError(
      'missing-key',
      'No API key configured. Add VITE_OPENWEATHER_API_KEY to your .env file (see README).',
    );
  }

  const query = new URLSearchParams({ ...params, appid: apiKey });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}?${query.toString()}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WeatherApiError(
      'network',
      'Unable to reach the weather service. Please check your internet connection.',
    );
  }

  if (!response.ok) throw errorFromStatus(response.status);
  return response.json().catch(() => null);
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
  const data = await requestOpenWeather(
    CURRENT_WEATHER_URL,
    { q: toApiQuery(query), units: 'metric' },
    signal,
  );
  if (!isOpenWeatherResponse(data)) {
    throw new WeatherApiError(
      'unknown',
      'Received an unexpected response from the weather service.',
    );
  }
  return toWeatherReport(data, query);
}

function isGeocodingPlace(value: unknown): value is GeocodingPlace {
  const place = value as Partial<GeocodingPlace> | null;
  return typeof place?.name === 'string' && typeof place.country === 'string';
}

/**
 * Looks up places whose name matches what the user is typing, for the city autocomplete.
 * Optionally narrowed to one country. Duplicate places (same name, state and country)
 * are removed.
 * @throws {WeatherApiError} on failure (callers may simply show no suggestions).
 */
export async function fetchCitySuggestions(
  city: string,
  countryCode: string,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  const q = countryCode ? `${city},${countryCode}` : city;
  const data = await requestOpenWeather(
    GEOCODING_URL,
    { q, limit: String(MAX_SUGGESTIONS) },
    signal,
  );
  if (!Array.isArray(data)) return [];

  const suggestions = new Map<string, CitySuggestion>();
  for (const place of data.filter(isGeocodingPlace)) {
    const suggestion: CitySuggestion = {
      id: [place.name, place.state, place.country].join('|').toLowerCase(),
      city: place.name,
      state: place.state ?? '',
      countryCode: place.country,
    };
    suggestions.set(suggestion.id, suggestion);
  }
  return [...suggestions.values()];
}
