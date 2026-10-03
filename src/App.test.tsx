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
  createGeocodingPlace,
  createHistoryEntry,
  getRequestedCoordinates,
  getRequestedQuery,
  getSuggestionCalls,
  jsonResponse,
  mockFetch,
  mockFetchWithSuggestions,
  mockOpenWeather,
} from './test/fixtures';

function setup() {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  return {
    user,
    unmount,
    searchInput: screen.getByRole('combobox', { name: 'Location' }),
    searchButton: () => screen.getByRole('button', { name: /^search(ing)?$/i }),
    clearButton: screen.getByRole('button', { name: 'Clear' }),
    historyItems: () => screen.queryAllByRole('listitem'),
  };
}

describe('App', () => {
  it('searches by city and country, shows the weather and records it in history', async () => {
    const fetchMock = mockFetch(jsonResponse(createApiResponse({ name: 'Osaka', country: 'JP' })));
    const { user, searchInput, searchButton, historyItems } = setup();
    expect(screen.getByText('No Record')).toBeInTheDocument();

    await user.type(searchInput, 'Osaka, Japan');
    await user.click(searchButton());

    expect(await screen.findByText('58%')).toBeInTheDocument();
    expect(getRequestedQuery(fetchMock)).toBe('Osaka,JP');
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Osaka, JP');
    expect(historyItems()).toHaveLength(1);
    expect(historyItems()[0]).toHaveTextContent('Osaka, JP');
  });

  it('searches by city alone', async () => {
    const fetchMock = mockOpenWeather(
      { places: [createGeocodingPlace('Seoul', 'KR')] },
      jsonResponse(createApiResponse()),
    );
    const { user, searchInput } = setup();

    await user.type(searchInput, 'Seoul{Enter}');

    expect(await screen.findByText('Seoul, KR', { selector: 'p' })).toBeInTheDocument();
    expect(getRequestedQuery(fetchMock)).toBe('Seoul');
  });

  it('shows a loading state while the request is running', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        input.includes('/geo/')
          ? Promise.resolve(jsonResponse([createGeocodingPlace('Tokyo', 'JP')])) // the place lookup
          : new Promise<Response>((resolve) => (resolveFetch = resolve)),
      ),
    );
    const { user, searchInput, searchButton } = setup();

    await user.type(searchInput, 'Tokyo');
    await user.click(searchButton());

    expect(screen.getByRole('status')).toHaveTextContent('Loading weather…');
    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();

    resolveFetch(jsonResponse(createApiResponse()));
    expect(await screen.findByText('Tokyo, JP', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows "Not found" for an invalid city and does not add it to history', async () => {
    mockOpenWeather({ places: [] }); // the geocoding API has no such city
    const { user, searchInput, searchButton, historyItems } = setup();

    await user.type(searchInput, 'xxx');
    await user.click(searchButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(historyItems()).toHaveLength(0);
    expect(screen.getByText('No Record')).toBeInTheDocument();
  });

  it('shows an error for an invalid country without calling the API', async () => {
    const fetchMock = mockFetch();
    const { user, searchInput, searchButton } = setup();

    await user.type(searchInput, 'Paris, Atlantis');
    await user.click(searchButton());

    expect(screen.getByRole('alert')).toHaveTextContent('"Atlantis" is not a recognised country');
    expect(getRequestedQuery(fetchMock)).toBeNull();
  });

  it("searches a country by its capital's weather", async () => {
    const fetchMock = mockFetch(jsonResponse(createApiResponse()));
    const { user, searchInput, historyItems } = setup();

    await user.type(searchInput, 'South Korea{Enter}');

    expect(await screen.findByText('Seoul, KR', { selector: 'p' })).toBeInTheDocument();
    expect(getRequestedQuery(fetchMock)).toBe('Seoul,KR');
    expect(historyItems()[0]).toHaveTextContent('Seoul, KR');
  });

  it('suggests the capital when a country is typed', async () => {
    mockFetchWithSuggestions([createGeocodingPlace('Tokyo', 'JP', 'Tokyo')]);
    const { user, searchInput } = setup();

    await user.type(searchInput, 'Japan');

    expect(
      await screen.findByRole('option', { name: /Tokyo.*Capital of Japan/ }),
    ).toBeInTheDocument();
  });

  it('asks for a city when a country has no place OpenWeather knows', async () => {
    mockOpenWeather({ places: [] });
    const { user, searchInput, searchButton } = setup();

    await user.type(searchInput, 'Antarctica');
    await user.click(searchButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Please type a city in Antarctica.');
  });

  it('narrows the suggestions to the country typed after a comma', async () => {
    const fetchMock = mockFetchWithSuggestions([createGeocodingPlace('Osaka', 'JP')]);
    const { user, searchInput } = setup();

    await user.type(searchInput, 'Osa, Japan');

    expect(await screen.findByRole('option', { name: /Osaka/ })).toBeInTheDocument();
    const lastLookup = getSuggestionCalls(fetchMock).at(-1)?.[0];
    expect(new URL(String(lastLookup)).searchParams.get('q')).toBe('Osa,JP');
  });

  it('picking a suggestion searches exactly that place and fills the search box', async () => {
    const fetchMock = mockFetchWithSuggestions(
      [
        createGeocodingPlace('Johor Bahru', 'MY', 'Johor', { lat: 1.46, lon: 103.76 }),
        createGeocodingPlace('Johor', 'MY', undefined, { lat: 2, lon: 103.5 }),
      ],
      jsonResponse(createApiResponse({ name: 'Johor Bahru', country: 'MY' })),
    );
    const { user, searchInput, historyItems } = setup();

    await user.type(searchInput, 'Joh');
    await user.click(await screen.findByRole('option', { name: /Johor Bahru/ }));

    expect(await screen.findByText('58%')).toBeInTheDocument();
    // The suggestion's own coordinates are used: no second lookup by name.
    expect(getRequestedCoordinates(fetchMock)).toBe('1.46,103.76');
    expect(
      getSuggestionCalls(fetchMock).map(([url]) => new URL(String(url)).searchParams.get('q')),
    ).toEqual(['Joh']);
    expect(searchInput).toHaveValue('Johor Bahru, MY');
    expect(historyItems()[0]).toHaveTextContent('Johor Bahru, MY');
  });

  it('asks for input when searching with an empty box', async () => {
    const { user, searchButton } = setup();

    await user.click(searchButton());

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a city or a country');
  });

  it('shows a friendly message when the network fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const { user, searchInput, searchButton } = setup();

    await user.type(searchInput, 'Tokyo');
    await user.click(searchButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach/i);
  });

  it('Clear empties the search box and dismisses the error', async () => {
    const { user, searchInput, searchButton, clearButton } = setup();
    await user.type(searchInput, 'Paris, Atlantis');
    await user.click(searchButton());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('search again re-fetches a history entry, fills the box and moves it to the top', async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        createHistoryEntry({ city: 'Seoul', countryCode: 'KR' }),
        createHistoryEntry({ city: 'Taipei', countryCode: 'TW' }),
      ]),
    );
    const fetchMock = mockFetch(jsonResponse(createApiResponse({ name: 'Taipei', country: 'TW' })));
    const { user, searchInput, historyItems } = setup();

    await user.click(screen.getByRole('button', { name: 'Search Taipei, TW again' }));

    expect(await screen.findByText('Taipei, TW', { selector: 'p' })).toBeInTheDocument();
    // An entry saved without coordinates is looked up by name.
    expect(getRequestedQuery(fetchMock)).toBe('Taipei,TW');
    expect(searchInput).toHaveValue('Taipei, TW');
    expect(historyItems()).toHaveLength(2);
    expect(historyItems()[0]).toHaveTextContent('Taipei, TW');
  });

  it('search again uses the saved coordinates, so it finds exactly the same place', async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        createHistoryEntry({
          city: 'Springfield',
          countryCode: 'US',
          coordinates: { lat: 39.8, lon: -89.64 },
        }),
      ]),
    );
    const fetchMock = mockFetch(jsonResponse(createApiResponse()));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Search Springfield, US again' }));

    expect(await screen.findByText('Springfield, US', { selector: 'p' })).toBeInTheDocument();
    expect(getRequestedCoordinates(fetchMock)).toBe('39.8,-89.64');
    expect(getRequestedQuery(fetchMock)).toBeNull();
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
    mockFetch(jsonResponse(createApiResponse()));
    const { user, searchInput, searchButton, unmount } = setup();
    await user.type(searchInput, 'Singapore, SG');
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

  describe('demo data', () => {
    const demoSwitch = () => screen.getByRole('switch', { name: 'Demo data' });

    it('searches the built-in sample data without calling the API', async () => {
      const { user, searchInput, searchButton, historyItems } = setup();
      expect(demoSwitch()).not.toBeChecked();

      await user.click(demoSwitch());
      expect(demoSwitch()).toBeChecked();
      expect(screen.getByText(/showing sample weather/i)).toBeInTheDocument();

      await user.type(searchInput, 'Tokyo');
      await user.click(searchButton());

      expect(await screen.findByText('64%')).toBeInTheDocument();
      expect(historyItems()[0]).toHaveTextContent('Tokyo, JP');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('offers demo data when the API key is rejected', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(jsonResponse({ cod: 401, message: 'Invalid API key' }, 401))),
      );
      const { user, searchInput, searchButton } = setup();

      await user.type(searchInput, 'Tokyo');
      await user.click(searchButton());
      expect(await screen.findByRole('alert')).toHaveTextContent(/rejected the API key/);

      await user.click(screen.getByRole('button', { name: 'Use demo data' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(demoSwitch()).toBeChecked();
      await user.click(searchButton());
      expect(await screen.findByText('64%')).toBeInTheDocument();
    });

    it('does not offer demo data for other errors', async () => {
      mockOpenWeather({ places: [] });
      const { user, searchInput, searchButton } = setup();

      await user.type(searchInput, 'Atlantis');
      await user.click(searchButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
      expect(screen.queryByRole('button', { name: 'Use demo data' })).not.toBeInTheDocument();
    });

    it('clears the current result when switching data source', async () => {
      mockFetch(jsonResponse(createApiResponse({ name: 'Osaka', country: 'JP' })));
      const { user, searchInput, searchButton } = setup();

      await user.type(searchInput, 'Osaka');
      await user.click(searchButton());
      expect(await screen.findByText('58%')).toBeInTheDocument();

      await user.click(demoSwitch());

      expect(screen.queryByText('58%')).not.toBeInTheDocument();
    });

    it('starts in demo mode when no API key is configured', () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
      setup();

      expect(demoSwitch()).toBeChecked();
    });
  });
});
