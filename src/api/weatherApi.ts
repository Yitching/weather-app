import type { CitySuggestion, Coordinates, LocationQuery, WeatherReport } from '../types/weather';
import { getCountryName, normaliseName } from '../utils/country';
import { toApiQuery } from '../utils/location';

const CURRENT_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct';
/** OpenWeather's geocoding API returns at most 5 places. */
const MAX_SUGGESTIONS = 5;

/** The subset of OpenWeather's "Current weather" response that this app uses. */
interface OpenWeatherResponse {
  name: string;
  weather: Array<{ main: string; description: string; icon: string }>;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number; feels_like?: number };
  wind?: { speed?: number };
}

/** One place from OpenWeather's geocoding ("direct") response. */
interface GeocodingPlace {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  /** The place's name in other languages, keyed by language code. */
  local_names?: Record<string, string>;
}

/** The place a weather report is for, as shown to the user. */
interface ReportPlace {
  city: string;
  countryCode: string;
  coordinates: Coordinates;
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

function toWeatherReport(data: OpenWeatherResponse, place: ReportPlace): WeatherReport {
  // `weather` is guaranteed non-empty by isOpenWeatherResponse.
  const [condition] = data.weather as [OpenWeatherResponse['weather'][number]];
  return {
    city: place.city,
    countryCode: place.countryCode,
    condition: condition.main,
    description: condition.description,
    iconCode: condition.icon,
    temperature: data.main.temp,
    temperatureMin: data.main.temp_min,
    temperatureMax: data.main.temp_max,
    humidity: data.main.humidity,
    ...(typeof data.main.feels_like === 'number' && { feelsLike: data.main.feels_like }),
    ...(typeof data.wind?.speed === 'number' && { windSpeed: data.wind.speed }),
    retrievedAt: new Date().toISOString(),
    coordinates: place.coordinates,
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

/** Calls the current weather API (metric units) and validates the response. */
async function requestWeather(
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<OpenWeatherResponse> {
  const data = await requestOpenWeather(
    CURRENT_WEATHER_URL,
    { ...params, units: 'metric' },
    signal,
  );
  if (!isOpenWeatherResponse(data)) {
    throw new WeatherApiError(
      'unknown',
      'Received an unexpected response from the weather service.',
    );
  }
  return data;
}

function isGeocodingPlace(value: unknown): value is GeocodingPlace {
  const place = value as Partial<GeocodingPlace> | null;
  return (
    typeof place?.name === 'string' &&
    typeof place.country === 'string' &&
    typeof place.lat === 'number' &&
    typeof place.lon === 'number'
  );
}

/**
 * True if the place's name, in English or any other language, starts with what the
 * user typed ("Jeonju" → Jeonju-si, "서울" → Seoul). The geocoding API matches
 * loosely, e.g. "xxx" also returns Trenta (Italian for thirty, XXX), so its loose
 * matches are left out.
 */
function matchesTypedName(place: GeocodingPlace, typed: string): boolean {
  const localNames = typeof place.local_names === 'object' ? Object.values(place.local_names) : [];
  return [place.name, ...localNames].some(
    (name) => typeof name === 'string' && normaliseName(name).startsWith(typed),
  );
}

/** The places named like `query.city` (optionally within a country), best match first. */
async function findPlacesByName(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<GeocodingPlace[]> {
  const data = await requestOpenWeather(
    GEOCODING_URL,
    { q: toApiQuery(query), limit: String(MAX_SUGGESTIONS) },
    signal,
  );
  if (!Array.isArray(data)) return [];
  const typed = normaliseName(query.city);
  return data.filter(isGeocodingPlace).filter((place) => matchesTypedName(place, typed));
}

interface PlaceLookup {
  query: LocationQuery;
  /** Extra condition a place must meet. */
  keep?: (place: GeocodingPlace) => boolean;
  isCapital: boolean;
}

/**
 * The lookups to try for a search, in order. A city is one lookup. A whole
 * country ("Japan") is its capital, with fallbacks for places OpenWeather lists
 * differently:
 * 1. the capital in that country: Tokyo, JP
 * 2. the country's own name in that country, when the capital is unknown
 * 3–4. the same without the country code, keeping only places whose region is
 *    that country: OpenWeather files some territories under another country, e.g.
 *    San Juan (Puerto Rico, US) and Hong Kong Island (Hong Kong, CN).
 */
function getPlaceLookups(query: LocationQuery): PlaceLookup[] {
  const { countryName } = query;
  if (countryName === undefined) return [{ query, isCapital: false }];

  const hasCapital = normaliseName(query.city) !== normaliseName(countryName);
  const inCountryRegion = (place: GeocodingPlace) =>
    normaliseName(place.state ?? '') === normaliseName(countryName);
  const byName = { city: countryName, countryCode: query.countryCode };
  return [
    { query, isCapital: hasCapital },
    ...(hasCapital ? [{ query: byName, isCapital: false }] : []),
    { query: { ...query, countryCode: '' }, keep: inCountryRegion, isCapital: hasCapital },
    ...(hasCapital
      ? [{ query: { ...byName, countryCode: '' }, keep: inCountryRegion, isCapital: false }]
      : []),
  ];
}

/**
 * The places for a search, best match first. This one list feeds both the
 * suggestions and typed searches, so a typed search always gets the first
 * suggestion. `isCapital` says whether they are the capital of a searched country.
 */
async function findPlaces(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<{ places: GeocodingPlace[]; isCapital: boolean }> {
  for (const { query: lookup, keep = () => true, isCapital } of getPlaceLookups(query)) {
    const places = (await findPlacesByName(lookup, signal)).filter(keep);
    if (places.length > 0) return { places, isCapital };
  }
  return { places: [], isCapital: false };
}

/** Turns a typed search into a place: the first one the suggestions would offer. */
async function findPlace(query: LocationQuery, signal?: AbortSignal): Promise<ReportPlace> {
  const {
    places: [place],
  } = await findPlaces(query, signal);
  if (!place && query.countryName) {
    throw new WeatherApiError(
      'not-found',
      `Please type a city in ${getCountryName(query.countryCode)}.`,
    );
  }
  if (!place) throw errorFromStatus(404);
  return {
    city: place.name,
    countryCode: place.country,
    coordinates: { lat: place.lat, lon: place.lon },
  };
}

/**
 * Fetches today's weather for a location.
 *
 * Places come from the geocoding API only, the same source as the city suggestions,
 * and the weather API is only asked "what is the weather at these coordinates?".
 * So any city that is suggested can also be searched. (OpenWeather has deprecated
 * looking up weather by city name.)
 *
 * @throws {WeatherApiError} with a user-friendly message on any failure.
 * Aborting via `signal` rejects with the native `AbortError` instead.
 */
export async function fetchCurrentWeather(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<WeatherReport> {
  const place: ReportPlace = query.coordinates
    ? { city: query.city, countryCode: query.countryCode, coordinates: query.coordinates }
    : await findPlace(query, signal);
  const { lat, lon } = place.coordinates;
  const data = await requestWeather({ lat: String(lat), lon: String(lon) }, signal);
  // Keep the geocoding name: by coordinates, the weather API answers with the
  // nearest weather station's name (e.g. "Yeonil" for Pohang-si).
  return toWeatherReport(data, place);
}

/**
 * Looks up places whose name matches what the user is typing, for the autocomplete.
 * Optionally narrowed to one country; for a whole country, its capital. Duplicate
 * places (same name, state and country) are removed. Every suggestion carries its
 * coordinates, so picking it always works.
 * @throws {WeatherApiError} on failure (callers may simply show no suggestions).
 */
export async function fetchCitySuggestions(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  const { places, isCapital } = await findPlaces(query, signal);
  const note = isCapital ? `Capital of ${getCountryName(query.countryCode)}` : undefined;

  const suggestions = new Map<string, CitySuggestion>();
  for (const place of places) {
    const suggestion: CitySuggestion = {
      id: [place.name, place.state, place.country].join('|').toLowerCase(),
      city: place.name,
      state: place.state ?? '',
      countryCode: place.country,
      coordinates: { lat: place.lat, lon: place.lon },
      ...(note && { note }),
    };
    suggestions.set(suggestion.id, suggestion);
  }
  return [...suggestions.values()];
}
