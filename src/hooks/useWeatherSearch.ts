import { useCallback, useEffect, useRef, useState } from 'react';
import { WeatherApiError, type WeatherErrorKind } from '../api/weatherApi';
import { liveWeatherSource, type WeatherSource } from '../api/weatherSource';
import type { LocationQuery, WeatherReport } from '../types/weather';
import { parseLocationInput } from '../utils/location';

export type WeatherSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; report: WeatherReport }
  /** `kind` is set for API errors (not for validation errors). */
  | { status: 'error'; message: string; kind?: WeatherErrorKind };

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Validates the search input, calls the weather API and tracks the request
 * state, using `source` (live OpenWeather by default). Starting a new search
 * cancels any request that is still in flight, so a slow old response can never
 * overwrite a newer one.
 */
export function useWeatherSearch(source: WeatherSource = liveWeatherSource) {
  const [state, setState] = useState<WeatherSearchState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // Cancel any pending request when the component using this hook unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * @param input the typed search text ("Osaka, Japan"), which is validated first, or a
   *   place that is already known (a picked suggestion or a history entry).
   * @returns the report on success, or null on validation/API error or cancellation.
   */
  const search = useCallback(
    async (input: string | LocationQuery): Promise<WeatherReport | null> => {
      controllerRef.current?.abort();

      const parsed = typeof input === 'string' ? parseLocationInput(input) : null;
      if (parsed && !parsed.ok) {
        setState({ status: 'error', message: parsed.error });
        return null;
      }
      const query = parsed ? parsed.query : (input as LocationQuery);

      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: 'loading' });

      try {
        const report = await source.fetchCurrentWeather(query, controller.signal);
        setState({ status: 'success', report });
        return report;
      } catch (error) {
        if (controller.signal.aborted) return null;
        setState(
          error instanceof WeatherApiError
            ? { status: 'error', message: error.message, kind: error.kind }
            : { status: 'error', message: GENERIC_ERROR },
        );
        return null;
      }
    },
    [source],
  );

  /** Dismisses an error message (the last successful report is not affected). */
  const clearError = useCallback(() => {
    setState((current) => (current.status === 'error' ? { status: 'idle' } : current));
  }, []);

  /** Cancels any pending request and clears the result, e.g. when the data source changes. */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, search, clearError, reset };
}
