import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SearchFormValues } from '../../types/weather';
import { SearchForm } from './SearchForm';

/** Renders the controlled form with real state, like App does. */
function renderForm({ isLoading = false } = {}) {
  const onSearch = vi.fn();
  const onClear = vi.fn();

  function Harness() {
    const [values, setValues] = useState<SearchFormValues>({ city: '', country: '' });
    return (
      <SearchForm
        values={values}
        onChange={setValues}
        onSearch={onSearch}
        onClear={() => {
          setValues({ city: '', country: '' });
          onClear();
        }}
        isLoading={isLoading}
      />
    );
  }

  render(<Harness />);
  return { onSearch, onClear, user: userEvent.setup() };
}

describe('SearchForm', () => {
  it('has labelled City and Country inputs', () => {
    renderForm();

    expect(screen.getByRole('search', { name: 'Weather search' })).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('submits the typed city and country when Search is clicked', async () => {
    const { onSearch, user } = renderForm();

    await user.type(screen.getByLabelText('City'), 'Tokyo');
    await user.type(screen.getByLabelText('Country'), 'Japan');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith({ city: 'Tokyo', country: 'Japan' });
  });

  it('submits when Enter is pressed', async () => {
    const { onSearch, user } = renderForm();

    await user.type(screen.getByLabelText('City'), 'Seoul{Enter}');

    expect(onSearch).toHaveBeenCalledWith({ city: 'Seoul', country: '' });
  });

  it('clears both inputs when Clear is clicked', async () => {
    const { onClear, user } = renderForm();
    await user.type(screen.getByLabelText('City'), 'Tokyo');
    await user.type(screen.getByLabelText('Country'), 'JP');

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Country')).toHaveValue('');
  });

  it('disables the Search button while loading', () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();
  });
});
