import { useState } from 'react';
import styles from './App.module.css';
import { SearchForm } from './components/SearchForm/SearchForm';
import { SearchHistory } from './components/SearchHistory/SearchHistory';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { Alert } from './components/ui/Alert';
import { WeatherSummary } from './components/WeatherSummary/WeatherSummary';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useTheme } from './hooks/useTheme';
import { useWeatherSearch } from './hooks/useWeatherSearch';
import type { SearchFormValues, SearchHistoryEntry } from './types/weather';

const EMPTY_FORM: SearchFormValues = { city: '', country: '' };

/** "Today's Weather" page: wires the hooks (state) to the presentational components. */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { history, addEntry, removeEntry } = useSearchHistory();
  const { state, search, clearError } = useWeatherSearch();
  const [formValues, setFormValues] = useState<SearchFormValues>(EMPTY_FORM);

  const isLoading = state.status === 'loading';

  const runSearch = async (values: SearchFormValues) => {
    const report = await search(values);
    if (report) addEntry(report);
  };

  const handleClear = () => {
    setFormValues(EMPTY_FORM);
    clearError();
  };

  const handleSearchAgain = (entry: SearchHistoryEntry) => {
    const values = { city: entry.city, country: entry.countryCode };
    setFormValues(values);
    void runSearch(values);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <SearchForm
        values={formValues}
        onChange={setFormValues}
        onSearch={(values) => void runSearch(values)}
        onClear={handleClear}
        isLoading={isLoading}
      />

      {state.status === 'error' && (
        <div className={styles.alert}>
          <Alert message={state.message} />
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
