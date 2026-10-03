import { useEffect, useRef, useState } from 'react';
import { liveWeatherSource, type WeatherSource } from '../api/weatherSource';
import type { CitySuggestion } from '../types/weather';
import { getSuggestionQuery } from '../utils/location';
import { useDebouncedValue } from './useDebouncedValue';

/** Fewer characters match too many places to be useful. */
export const MIN_CITY_QUERY_LENGTH = 2;
export const SUGGESTION_DEBOUNCE_MS = 300;

const NO_SUGGESTIONS: CitySuggestion[] = [];

/**
 * City suggestions for the search text typed so far ("Osa" or "Osa, Japan"),
 * narrowed to the country once one is recognised after a comma. A whole country
 * ("Japan") suggests its capital. Requests are debounced and cached, and failures simply mean "no suggestions": they must
 * never block a search.
 */
export function useCitySuggestions(
  text: string,
  source: WeatherSource = liveWeatherSource,
): CitySuggestion[] {
  const liveText = text.trim();
  const debouncedText = useDebouncedValue(liveText, SUGGESTION_DEBOUNCE_MS);
  const { city: query, countryCode, countryName = '' } = getSuggestionQuery(debouncedText);
  const key = `${source.mode}|${query}|${countryCode}|${countryName}`.toLowerCase();
  const isQueryLongEnough = query.length >= MIN_CITY_QUERY_LENGTH;
  // While the debounce waits, keep showing results only if the user is still extending
  // the same text ("Osa" → "Osak"). Deleted or replaced text hides them immediately.
  const isStillRelevant = liveText.toLowerCase().startsWith(debouncedText.toLowerCase());

  const [result, setResult] = useState({ key: '', suggestions: NO_SUGGESTIONS });
  const cacheRef = useRef(new Map<string, Promise<CitySuggestion[]>>());

  useEffect(() => {
    if (!isQueryLongEnough) return;

    const cache = cacheRef.current;
    let request = cache.get(key);
    if (!request) {
      const lookup = { city: query, countryCode, ...(countryName && { countryName }) };
      request = source.fetchCitySuggestions(lookup).catch(() => {
        cache.delete(key); // allow a retry next time instead of caching the failure
        return NO_SUGGESTIONS;
      });
      cache.set(key, request);
    }

    let isCurrent = true;
    void request.then((suggestions) => {
      if (isCurrent) setResult({ key, suggestions });
    });
    return () => {
      isCurrent = false;
    };
  }, [key, query, countryCode, countryName, isQueryLongEnough, source]);

  // Only return results that belong to the current input, never stale ones.
  return isQueryLongEnough && isStillRelevant && result.key === key
    ? result.suggestions
    : NO_SUGGESTIONS;
}
