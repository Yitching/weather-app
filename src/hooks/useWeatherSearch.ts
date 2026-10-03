import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCurrentWeather, WeatherApiError } from '../api/weatherApi';
import type { SearchFormValues, WeatherReport } from '../types/weather';
import { parseLocationInput } from '../utils/location';

export type WeatherSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; report: WeatherReport }
  | { status: 'error'; message: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Validates the search input, calls the weather API and tracks the request
 * state. Starting a new search cancels any request that is still in flight,
 * so a slow old response can never overwrite a newer one.
 */
export function useWeatherSearch() {
  const [state, setState] = useState<WeatherSearchState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // Cancel any pending request when the component using this hook unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  /** @returns the report on success, or null on validation/API error or cancellation. */
  const search = useCallback(async (values: SearchFormValues): Promise<WeatherReport | null> => {
    controllerRef.current?.abort();

    const parsed = parseLocationInput(values);
    if (!parsed.ok) {
      setState({ status: 'error', message: parsed.error });
      return null;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });

    try {
      const report = await fetchCurrentWeather(parsed.query, controller.signal);
      setState({ status: 'success', report });
      return report;
    } catch (error) {
      if (controller.signal.aborted) return null;
      const message = error instanceof WeatherApiError ? error.message : GENERIC_ERROR;
      setState({ status: 'error', message });
      return null;
    }
  }, []);

  /** Dismisses an error message (the last successful report is not affected). */
  const clearError = useCallback(() => {
    setState((current) => (current.status === 'error' ? { status: 'idle' } : current));
  }, []);

  return { state, search, clearError };
}
