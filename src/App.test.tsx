/**
 * Integration tests: render the whole page and use it like a reviewer would,
 * with only the network (fetch) mocked.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { HISTORY_STORAGE_KEY } from './hooks/useSearchHistory';
import {
  createApiResponse,
  createHistoryEntry,
  getRequestedQuery,
  jsonResponse,
  mockFetch,
} from './test/fixtures';

function setup() {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  return {
    user,
    unmount,
    cityInput: screen.getByLabelText('City'),
    countryInput: screen.getByLabelText('Country'),
    searchButton: () => screen.getByRole('button', { name: /^search(ing)?$/i }),
    clearButton: screen.getByRole('button', { name: 'Clear' }),
    historyItems: () => screen.queryAllByRole('listitem'),
  };
}

describe('App', () => {
  it('searches by city and country, shows the weather and records it in history', async () => {
    const fetchMock = mockFetch(jsonResponse(createApiResponse({ name: 'Osaka', country: 'JP' })));
    const { user, cityInput, countryInput, searchButton, historyItems } = setup();
    expect(screen.getByText('No Record')).toBeInTheDocument();

    await user.type(cityInput, 'Osaka');
    await user.type(countryInput, 'Japan');
    await user.click(searchButton());

    expect(await screen.findByText('Humidity: 58%')).toBeInTheDocument();
    expect(getRequestedQuery(fetchMock)).toBe('Osaka,JP');
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Osaka, JP');
    expect(historyItems()).toHaveLength(1);
    expect(historyItems()[0]).toHaveTextContent('Osaka, JP');
  });

  it('shows a loading state while the request is running', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );
    const { user, cityInput, searchButton } = setup();

    await user.type(cityInput, 'Tokyo');
    await user.click(searchButton());

    expect(screen.getByRole('status')).toHaveTextContent('Loading weather…');
    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();

    resolveFetch(jsonResponse(createApiResponse({ name: 'Tokyo', country: 'JP' })));
    expect(await screen.findByText('Tokyo, JP', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows "Not found" for an invalid city and does not add it to history', async () => {
    mockFetch(jsonResponse({ cod: '404', message: 'city not found' }, 404));
    const { user, cityInput, searchButton, historyItems } = setup();

    await user.type(cityInput, 'xxx');
    await user.click(searchButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(historyItems()).toHaveLength(0);
    expect(screen.getByText('No Record')).toBeInTheDocument();
  });

  it('shows an error for an invalid country without calling the API', async () => {
    const fetchMock = mockFetch();
    const { user, cityInput, countryInput, searchButton } = setup();

    await user.type(cityInput, 'Paris');
    await user.type(countryInput, 'Atlantis');
    await user.click(searchButton());

    expect(screen.getByRole('alert')).toHaveTextContent('"Atlantis" is not a recognised country');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for input when searching with empty fields', async () => {
    const { user, searchButton } = setup();

    await user.click(searchButton());

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a city or a country.');
  });

  it('shows a friendly message when the network fails', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    const { user, cityInput, searchButton } = setup();

    await user.type(cityInput, 'Tokyo');
    await user.click(searchButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach/i);
  });

  it('Clear empties both inputs and dismisses the error', async () => {
    const { user, cityInput, countryInput, searchButton, clearButton } = setup();
    await user.type(cityInput, 'Paris');
    await user.type(countryInput, 'Atlantis');
    await user.click(searchButton());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(clearButton);

    expect(cityInput).toHaveValue('');
    expect(countryInput).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('search again re-fetches a history entry, fills the form and moves it to the top', async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        createHistoryEntry({ city: 'Seoul', countryCode: 'KR' }),
        createHistoryEntry({ city: 'Taipei', countryCode: 'TW' }),
      ]),
    );
    const fetchMock = mockFetch(jsonResponse(createApiResponse({ name: 'Taipei', country: 'TW' })));
    const { user, cityInput, countryInput, historyItems } = setup();

    await user.click(screen.getByRole('button', { name: 'Search Taipei, TW again' }));

    expect(await screen.findByText('Taipei, TW', { selector: 'p' })).toBeInTheDocument();
    expect(getRequestedQuery(fetchMock)).toBe('Taipei,TW');
    expect(cityInput).toHaveValue('Taipei');
    expect(countryInput).toHaveValue('TW');
    expect(historyItems()).toHaveLength(2);
    expect(historyItems()[0]).toHaveTextContent('Taipei, TW');
  });

  it('delete removes only that entry and shows "No Record" when the list is empty', async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        createHistoryEntry({ city: 'Seoul', countryCode: 'KR' }),
        createHistoryEntry({ city: 'Taipei', countryCode: 'TW' }),
      ]),
    );
    const { user, historyItems } = setup();

    await user.click(screen.getByRole('button', { name: 'Delete Seoul, KR from history' }));
    expect(historyItems()).toHaveLength(1);
    expect(historyItems()[0]).toHaveTextContent('Taipei, TW');

    await user.click(screen.getByRole('button', { name: 'Delete Taipei, TW from history' }));
    expect(screen.getByText('No Record')).toBeInTheDocument();
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBe('[]');
  });

  it('keeps the search history after a page refresh', async () => {
    mockFetch(jsonResponse(createApiResponse({ name: 'Singapore', country: 'SG' })));
    const { user, countryInput, searchButton, unmount } = setup();
    await user.type(countryInput, 'Singapore');
    await user.click(searchButton());
    await screen.findByText('Singapore, SG', { selector: 'p' });

    // Simulate a refresh: unmount the app (losing all React state) and mount a fresh one.
    unmount();
    render(<App />);

    const list = screen.getByRole('list');
    expect(within(list).getByText('Singapore, SG')).toBeInTheDocument();
  });

  it('switches between light and dark themes', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  });
});
