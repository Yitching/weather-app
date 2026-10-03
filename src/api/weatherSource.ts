import type { CitySuggestion, LocationQuery, WeatherReport } from '../types/weather';
import { fetchDemoCitySuggestions, fetchDemoWeather } from './demoWeatherApi';
import { fetchCitySuggestions, fetchCurrentWeather } from './weatherApi';

/** "live" calls OpenWeather; "demo" answers from built-in sample data (no API key needed). */
export type DataMode = 'live' | 'demo';

/** Where weather data comes from. Both modes share the same contract and errors. */
export interface WeatherSource {
  mode: DataMode;
  fetchCurrentWeather: (query: LocationQuery, signal?: AbortSignal) => Promise<WeatherReport>;
  fetchCitySuggestions: (query: LocationQuery, signal?: AbortSignal) => Promise<CitySuggestion[]>;
}

export const liveWeatherSource: WeatherSource = {
  mode: 'live',
  fetchCurrentWeather,
  fetchCitySuggestions,
};

export const demoWeatherSource: WeatherSource = {
  mode: 'demo',
  fetchCurrentWeather: fetchDemoWeather,
  fetchCitySuggestions: fetchDemoCitySuggestions,
};

export function getWeatherSource(mode: DataMode): WeatherSource {
  return mode === 'demo' ? demoWeatherSource : liveWeatherSource;
}
