import type { FormEvent } from 'react';
import type { WeatherSource } from '../../api/weatherSource';
import { useCitySuggestions } from '../../hooks/useCitySuggestions';
import type { CitySuggestion, LocationQuery } from '../../types/weather';
import { formatLocation } from '../../utils/location';
import { AutocompleteField } from '../ui/AutocompleteField';
import { SearchIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import styles from './SearchForm.module.css';

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the typed text, or with the exact place when a suggestion is picked. */
  onSearch: (input: string | LocationQuery) => void;
  onClear: () => void;
  isLoading: boolean;
  /** Where city suggestions come from (live OpenWeather by default). */
  source?: WeatherSource;
}

/**
 * One search box for a city, a city and its country, or a country ("Osaka",
 * "Osaka, Japan", "Japan") with suggestions, and Search / Clear buttons. A controlled component: the parent owns the text.
 */
export function SearchForm({
  value,
  onChange,
  onSearch,
  onClear,
  isLoading,
  source,
}: SearchFormProps) {
  const suggestions = useCitySuggestions(value, source);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value);
  };

  /** Picking a suggestion fills the box and searches exactly that place. */
  const handleSelect = ({ city, countryCode, coordinates }: CitySuggestion) => {
    onChange(formatLocation(city, countryCode));
    onSearch({ city, countryCode, coordinates });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search" aria-label="Weather search">
      <AutocompleteField
        label="Location"
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        getKey={(suggestion) => suggestion.id}
        renderSuggestion={(suggestion) => (
          <SuggestionText
            primary={suggestion.city}
            secondary={
              suggestion.note ??
              [suggestion.state, suggestion.countryCode].filter(Boolean).join(', ')
            }
          />
        )}
        onSelect={handleSelect}
        placeholder="City and/or country, e.g. Osaka, Japan"
        maxLength={150}
      />
      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.searchButton}
          disabled={isLoading}
          aria-label={isLoading ? 'Searching' : 'Search'}
          title="Search"
        >
          {isLoading ? <Spinner /> : <SearchIcon />}
          {/* Visible on mobile only, so the button can't be mistaken for an input. */}
          <span className={styles.searchText}>{isLoading ? 'Searching…' : 'Search'}</span>
        </button>
        <button type="button" className={styles.clearButton} onClick={onClear}>
          Clear
        </button>
      </div>
    </form>
  );
}

function SuggestionText({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <>
      <span className={styles.suggestionName}>{primary}</span>
      <span className={styles.suggestionMeta}>{secondary}</span>
    </>
  );
}
