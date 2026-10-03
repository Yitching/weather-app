import type { LocationQuery, SearchFormValues } from '../types/weather';
import { getCountryName, resolveCountryCode } from './country';

export type ParseLocationResult = { ok: true; query: LocationQuery } | { ok: false; error: string };

/**
 * Validates the raw form values and converts them into an API-ready query.
 * At least one of city or country is required.
 */
export function parseLocationInput(values: SearchFormValues): ParseLocationResult {
  const city = values.city.trim();
  const country = values.country.trim();

  if (!city && !country) {
    return { ok: false, error: 'Please enter a city or a country.' };
  }

  if (!country) {
    return { ok: true, query: { city, countryCode: '' } };
  }

  const countryCode = resolveCountryCode(country);
  if (!countryCode) {
    return {
      ok: false,
      error: `"${country}" is not a recognised country. Try a full name (e.g. Japan) or a 2-letter code (e.g. JP).`,
    };
  }

  return { ok: true, query: { city, countryCode } };
}

/**
 * Builds OpenWeather's `q` parameter: "Tokyo,JP", "Tokyo", or — for a
 * country-only search — the country's English name (e.g. "Singapore").
 */
export function toApiQuery({ city, countryCode }: LocationQuery): string {
  if (!city) return getCountryName(countryCode);
  return countryCode ? `${city},${countryCode}` : city;
}

/** Display label used across the UI, e.g. "Johor, MY". */
export function formatLocation(city: string, countryCode: string): string {
  return [city, countryCode].filter(Boolean).join(', ');
}
