import type { FormEvent } from 'react';
import type { SearchFormValues } from '../../types/weather';
import { SearchIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import { TextField } from '../ui/TextField';
import styles from './SearchForm.module.css';

interface SearchFormProps {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSearch: (values: SearchFormValues) => void;
  onClear: () => void;
  isLoading: boolean;
}

/** City + country inputs with Search and Clear buttons (a controlled component). */
export function SearchForm({ values, onChange, onSearch, onClear, isLoading }: SearchFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(values);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search" aria-label="Weather search">
      <TextField
        label="City"
        value={values.city}
        onChange={(city) => onChange({ ...values, city })}
        placeholder="e.g. Johor"
        autoComplete="address-level2"
        maxLength={100}
      />
      <TextField
        label="Country"
        value={values.country}
        onChange={(country) => onChange({ ...values, country })}
        placeholder="e.g. Malaysia"
        autoComplete="country-name"
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
