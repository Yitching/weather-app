import { useMemo, type FormEvent } from 'react';
import { useCitySuggestions } from '../../hooks/useCitySuggestions';
import type { CitySuggestion, CountryOption, SearchFormValues } from '../../types/weather';
import { getCountryName, searchCountries } from '../../utils/country';
import { AutocompleteField } from '../ui/AutocompleteField';
import { SearchIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import styles from './SearchForm.module.css';

interface SearchFormProps {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSearch: (values: SearchFormValues) => void;
  onClear: () => void;
  isLoading: boolean;
}

/**
 * City + country inputs (with suggestions) and Search / Clear buttons.
 * A controlled component: the parent owns the values.
 */
export function SearchForm({ values, onChange, onSearch, onClear, isLoading }: SearchFormProps) {
  const citySuggestions = useCitySuggestions(values.city, values.country);
  const countrySuggestions = useMemo(() => {
    const matches = searchCountries(values.country);
    // Hide the list once the field already holds exactly that country.
    const isExactMatch =
      matches.length === 1 &&
      matches[0]?.name.toLowerCase() === values.country.trim().toLowerCase();
    return isExactMatch ? [] : matches;
  }, [values.country]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(values);
  };

  /** Picking a city fills both fields and searches straight away. */
  const handleCitySelect = (suggestion: CitySuggestion) => {
    const nextValues = { city: suggestion.city, country: getCountryName(suggestion.countryCode) };
    onChange(nextValues);
    onSearch(nextValues);
  };

  const handleCountrySelect = (country: CountryOption) => {
    onChange({ ...values, country: country.name });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search" aria-label="Weather search">
      <AutocompleteField
        label="City"
        value={values.city}
        onChange={(city) => onChange({ ...values, city })}
        suggestions={citySuggestions}
        getKey={(suggestion) => suggestion.id}
        renderSuggestion={(suggestion) => (
          <SuggestionText
            primary={suggestion.city}
            secondary={[suggestion.state, suggestion.countryCode].filter(Boolean).join(', ')}
          />
        )}
        onSelect={handleCitySelect}
        placeholder="e.g. Johor"
        maxLength={100}
      />
      <AutocompleteField
        label="Country"
        value={values.country}
        onChange={(country) => onChange({ ...values, country })}
        suggestions={countrySuggestions}
        getKey={(country) => country.code}
        renderSuggestion={(country) => (
          <SuggestionText primary={country.name} secondary={country.code} />
        )}
        onSelect={handleCountrySelect}
        placeholder="e.g. Malaysia"
        maxLength={60}
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
