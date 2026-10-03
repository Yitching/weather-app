import { useCallback } from 'react';
import type { SearchHistoryEntry, WeatherReport } from '../types/weather';
import { useLocalStorageState } from './useLocalStorageState';

export const HISTORY_STORAGE_KEY = 'todays-weather:search-history';
/** Keeps the list (and localStorage) from growing forever. */
export const MAX_HISTORY_ENTRIES = 20;

/** The same place always gets the same id, so re-searching it moves it to the top. */
function createHistoryId(city: string, countryCode: string): string {
  return `${city}|${countryCode}`.toLowerCase();
}

function isHistoryEntry(value: unknown): value is SearchHistoryEntry {
  const entry = value as Partial<SearchHistoryEntry> | null;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.city === 'string' &&
    typeof entry.countryCode === 'string' &&
    typeof entry.searchedAt === 'string' &&
    (entry.coordinates === undefined ||
      (typeof entry.coordinates.lat === 'number' && typeof entry.coordinates.lon === 'number'))
  );
}

function isHistoryList(value: unknown): value is SearchHistoryEntry[] {
  return Array.isArray(value) && value.every(isHistoryEntry);
}

/** Search history, newest first, persisted in localStorage. */
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorageState<SearchHistoryEntry[]>(
    HISTORY_STORAGE_KEY,
    [],
    isHistoryList,
  );

  const addEntry = useCallback(
    (report: WeatherReport) => {
      const entry: SearchHistoryEntry = {
        id: createHistoryId(report.city, report.countryCode),
        city: report.city,
        countryCode: report.countryCode,
        searchedAt: report.retrievedAt,
        ...(report.coordinates && { coordinates: report.coordinates }),
      };
      setHistory((previous) =>
        [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY_ENTRIES),
      );
    },
    [setHistory],
  );

  const removeEntry = useCallback(
    (id: string) => setHistory((previous) => previous.filter((item) => item.id !== id)),
    [setHistory],
  );

  return { history, addEntry, removeEntry };
}
