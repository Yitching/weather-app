import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createGeocodingPlace, mockFetchWithSuggestions } from '../../test/fixtures';
import { SearchForm } from './SearchForm';

/** Renders the controlled form with real state, like App does. */
function renderForm({ isLoading = false } = {}) {
  const onSearch = vi.fn();
  const onClear = vi.fn();

  function Harness() {
    const [value, setValue] = useState('');
    return (
      <SearchForm
        value={value}
        onChange={setValue}
        onSearch={onSearch}
        onClear={() => {
          setValue('');
          onClear();
        }}
        isLoading={isLoading}
      />
    );
  }

  render(<Harness />);
  return {
    onSearch,
    onClear,
    user: userEvent.setup(),
    input: screen.getByRole('combobox', { name: 'Location' }),
  };
}

describe('SearchForm', () => {
  it('has one labelled search box', () => {
    const { input } = renderForm();

    expect(screen.getByRole('search', { name: 'Weather search' })).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'City and/or country, e.g. Osaka, Japan');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('submits the typed text when Search is clicked', async () => {
    const { onSearch, user, input } = renderForm();

    await user.type(input, 'Tokyo, Japan');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('Tokyo, Japan');
  });

  it('submits when Enter is pressed', async () => {
    const { onSearch, user, input } = renderForm();

    await user.type(input, 'Seoul{Enter}');

    expect(onSearch).toHaveBeenCalledWith('Seoul');
  });

  it('picking a suggestion fills the box and searches exactly that place', async () => {
    mockFetchWithSuggestions([
      createGeocodingPlace('London', 'GB', 'England', { lat: 51.5, lon: -0.13 }),
      createGeocodingPlace('London', 'CA', 'Ontario', { lat: 42.98, lon: -81.25 }),
    ]);
    const { onSearch, user, input } = renderForm();

    await user.type(input, 'Lon');
    await user.click(await screen.findByRole('option', { name: /London.*Ontario/ }));

    expect(input).toHaveValue('London, CA');
    expect(onSearch).toHaveBeenCalledWith({
      city: 'London',
      countryCode: 'CA',
      coordinates: { lat: 42.98, lon: -81.25 },
    });
  });

  it('clears the box when Clear is clicked', async () => {
    const { onClear, user, input } = renderForm();
    await user.type(input, 'Tokyo, JP');

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
  });

  it('disables the Search button while loading', () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();
  });
});
