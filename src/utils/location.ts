import type { LocationQuery } from '../types/weather';
import { getCapital, resolveCountryCode, resolveCountryName } from './country';

export type ParseLocationResult = { ok: true; query: LocationQuery } | { ok: false; error: string };

/**
 * Splits the search text into the city (before the first comma) and an optional
 * country (after the last comma): "Osaka, Japan", "London, Ontario, Canada".
 * Anything in between (a state, as shown in suggestions) is ignored.
 */
function splitLocationText(text: string): { city: string; countryText: string } {
  const parts = text.split(',').map((part) => part.trim());
  return { city: parts[0] ?? '', countryText: parts.length > 1 ? (parts.at(-1) ?? '') : '' };
}

/**
 * The country code when the text is a whole country rather than a city in it:
 * just a country's name or alias ("Japan", "UK"; not a bare code like "JP", which
 * is too easily the start of a city), or only a country after a comma (", JP").
 */
function getCountryOnlyCode(city: string, countryText: string): string | null {
  if (!city) return resolveCountryCode(countryText);
  if (!countryText) return resolveCountryName(city);
  return null;
}

/** A whole country ("Japan"): look up its capital, Tokyo (see `countryName`). */
function toCountryQuery(countryCode: string, countryName: string): LocationQuery {
  return { city: getCapital(countryCode) ?? countryName, countryCode, countryName };
}

/**
 * What to look up while the user is still typing: the city, narrowed to the
 * country once it is recognised ("Os, Japan" → Os in JP). A country that is
 * still half-typed ("Os, Jap") is ignored rather than hiding the suggestions.
 * A whole country ("Japan") suggests its capital.
 */
export function getSuggestionQuery(text: string): LocationQuery {
  const { city, countryText } = splitLocationText(text);
  const countryOnlyCode = getCountryOnlyCode(city, countryText);
  if (countryOnlyCode) return toCountryQuery(countryOnlyCode, city || countryText);
  return { city, countryCode: resolveCountryCode(countryText) ?? '' };
}

/**
 * Validates the search text and converts it into a query:
 * - "Osaka" or "Osaka, Japan": that city (the country narrows the search)
 * - "Japan": the country's capital, Tokyo, as weather belongs to a place
 */
export function parseLocationInput(text: string): ParseLocationResult {
  const { city, countryText } = splitLocationText(text);

  const countryOnlyCode = getCountryOnlyCode(city, countryText);
  if (countryOnlyCode) {
    return { ok: true, query: toCountryQuery(countryOnlyCode, city || countryText) };
  }

  if (!city) {
    return { ok: false, error: 'Please enter a city or a country, e.g. "Osaka" or "Japan".' };
  }

  if (!countryText) {
    return { ok: true, query: { city, countryCode: '' } };
  }

  const countryCode = resolveCountryCode(countryText);
  if (!countryCode) {
    return {
      ok: false,
      error: `"${countryText}" is not a recognised country. Try a full name (e.g. Japan) or a 2-letter code (e.g. JP).`,
    };
  }

  return { ok: true, query: { city, countryCode } };
}

/** Builds the Geocoding API's `q` parameter: "Tokyo,JP" or "Tokyo". */
export function toApiQuery({ city, countryCode }: LocationQuery): string {
  return countryCode ? `${city},${countryCode}` : city;
}

/** Display label used across the UI, e.g. "Johor, MY". */
export function formatLocation(city: string, countryCode: string): string {
  return [city, countryCode].filter(Boolean).join(', ');
}
