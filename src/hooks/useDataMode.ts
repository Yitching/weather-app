import { useCallback } from 'react';
import type { DataMode } from '../api/weatherSource';
import { useLocalStorageState } from './useLocalStorageState';

export const DATA_MODE_STORAGE_KEY = 'todays-weather:data-mode';

const isDataMode = (value: unknown): value is DataMode => value === 'live' || value === 'demo';

/** First visit: use live data when an API key is configured, otherwise demo data. */
function getDefaultMode(): DataMode {
  return import.meta.env.VITE_OPENWEATHER_API_KEY ? 'live' : 'demo';
}

/** Live vs demo data, remembered across visits. */
export function useDataMode() {
  const [mode, setMode] = useLocalStorageState<DataMode>(
    DATA_MODE_STORAGE_KEY,
    getDefaultMode,
    isDataMode,
  );

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'demo' ? 'live' : 'demo'));
  }, [setMode]);

  return { mode, setMode, toggleMode };
}
