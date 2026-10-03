import { useEffect, useRef, useState } from 'react';
import { fetchCitySuggestions } from '../api/weatherApi';
import type { CitySuggestion } from '../types/weather';
import { resolveCountryCode } from '../utils/country';
import { useDebouncedValue } from './useDebouncedValue';

/** Fewer characters match too many places to be useful. */
export const MIN_CITY_QUERY_LENGTH = 2;
export const SUGGESTION_DEBOUNCE_MS = 300;

const NO_SUGGESTIONS: CitySuggestion[] = [];

/**
 * City suggestions for the text typed so far, narrowed to the country field
 * when it holds a recognised country. Requests are debounced and cached, and
 * failures simply mean "no suggestions": they must never block a search.
 */
export function useCitySuggestions(city: string, country: string): CitySuggestion[] {
  const liveText = city.trim();
  const query = useDebouncedValue(liveText, SUGGESTION_DEBOUNCE_MS);
  const countryCode = resolveCountryCode(country) ?? '';
  const key = `${query}|${countryCode}`.toLowerCase();
  const isQueryLongEnough = query.length >= MIN_CITY_QUERY_LENGTH;
  // While the debounce waits, keep showing results only if the user is still extending
  // the same text ("Osa" → "Osak"). Deleted or replaced text hides them immediately.
  const isStillRelevant = liveText.toLowerCase().startsWith(query.toLowerCase());

  const [result, setResult] = useState({ key: '', suggestions: NO_SUGGESTIONS });
  const cacheRef = useRef(new Map<string, Promise<CitySuggestion[]>>());

  useEffect(() => {
    if (!isQueryLongEnough) return;

    const cache = cacheRef.current;
    let request = cache.get(key);
    if (!request) {
      request = fetchCitySuggestions(query, countryCode).catch(() => {
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
  }, [key, query, countryCode, isQueryLongEnough]);

  // Only return results that belong to the current input, never stale ones.
  return isQueryLongEnough && isStillRelevant && result.key === key
    ? result.suggestions
    : NO_SUGGESTIONS;
}
