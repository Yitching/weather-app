import { useState } from 'react';
import { getWeatherSource, type DataMode } from './api/weatherSource';
import styles from './App.module.css';
import { DataModeToggle } from './components/DataModeToggle/DataModeToggle';
import { SearchForm } from './components/SearchForm/SearchForm';
import { SearchHistory } from './components/SearchHistory/SearchHistory';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { Alert } from './components/ui/Alert';
import { WeatherSummary } from './components/WeatherSummary/WeatherSummary';
import { useDataMode } from './hooks/useDataMode';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useTheme } from './hooks/useTheme';
import { useWeatherSearch } from './hooks/useWeatherSearch';
import type { LocationQuery, SearchHistoryEntry } from './types/weather';
import { formatLocation } from './utils/location';

/** "Today's Weather" page: wires the hooks (state) to the presentational components. */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { history, addEntry, removeEntry } = useSearchHistory();
  const { mode, setMode } = useDataMode();
  const source = getWeatherSource(mode);
  const { state, search, clearError, reset } = useWeatherSearch(source);
  const [searchText, setSearchText] = useState('');

  const isLoading = state.status === 'loading';
  const isApiKeyError =
    state.status === 'error' && (state.kind === 'invalid-key' || state.kind === 'missing-key');

  const runSearch = async (input: string | LocationQuery) => {
    const report = await search(input);
    if (report) addEntry(report);
  };

  const handleClear = () => {
    setSearchText('');
    clearError();
  };

  /** A result from the other data source would be misleading, so start fresh. */
  const switchMode = (nextMode: DataMode) => {
    setMode(nextMode);
    reset();
  };

  const handleSearchAgain = ({ city, countryCode, coordinates }: SearchHistoryEntry) => {
    setSearchText(formatLocation(city, countryCode));
    void runSearch({ city, countryCode, coordinates });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <DataModeToggle
          mode={mode}
          onToggle={() => switchMode(mode === 'demo' ? 'live' : 'demo')}
        />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {mode === 'demo' && (
        <p className={styles.demoNotice}>
          Demo mode: showing sample weather, not live data. Try Tokyo, London or Singapore.
        </p>
      )}

      <SearchForm
        value={searchText}
        onChange={setSearchText}
        onSearch={(input) => void runSearch(input)}
        onClear={handleClear}
        isLoading={isLoading}
        source={source}
      />

      {state.status === 'error' && (
        <div className={styles.alert}>
          <Alert
            message={state.message}
            action={
              isApiKeyError && (
                <button
                  type="button"
                  className={styles.alertAction}
                  onClick={() => switchMode('demo')}
                >
                  Use demo data
                </button>
              )
            }
          />
        </div>
      )}

      <main className={styles.card}>
        <WeatherSummary state={state} />
        <SearchHistory
          entries={history}
          onSearchAgain={handleSearchAgain}
          onDelete={removeEntry}
          isSearching={isLoading}
        />
      </main>
    </div>
  );
}
