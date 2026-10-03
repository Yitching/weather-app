import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createApiResponse,
  createGeocodingPlace,
  getRequestedCoordinates,
  jsonResponse,
  mockFetch,
  mockOpenWeather,
} from '../test/fixtures';
import { useWeatherSearch } from './useWeatherSearch';

describe('useWeatherSearch', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useWeatherSearch());
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('goes from loading to success and returns the report', async () => {
    mockFetch(jsonResponse(createApiResponse()));
    const { result } = renderHook(() => useWeatherSearch());

    let searchPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      searchPromise = result.current.search('Johor Bahru, MY');
    });
    expect(result.current.state.status).toBe('loading');

    await act(async () => {
      await expect(searchPromise).resolves.toMatchObject({ city: 'Johor Bahru' });
    });
    expect(result.current.state).toMatchObject({
      status: 'success',
      report: { countryCode: 'MY' },
    });
  });

  it('shows a validation error without calling the API', async () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useWeatherSearch());

    await act(() => result.current.search(''));

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Please enter a city or a country, e.g. "Osaka" or "Japan".',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API error message', async () => {
    mockOpenWeather({ places: [] }); // the geocoding API has no such city
    const { result } = renderHook(() => useWeatherSearch());

    await act(() => result.current.search('xxx'));

    expect(result.current.state).toMatchObject({ status: 'error', message: /not found/i });
  });

  it('shows a generic message for unexpected errors', async () => {
    mockFetch(jsonResponse(createApiResponse()));
    vi.spyOn(Response.prototype, 'json').mockImplementation(() => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useWeatherSearch());

    await act(() => result.current.search('Tokyo'));

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('ignores a slow earlier response when a newer search was started', async () => {
    // The first search's first request never resolves on its own; it only rejects
    // when aborted. Later requests answer straight away.
    const fetchMock = vi.fn<typeof fetch>((url, init) => {
      if (fetchMock.mock.calls.length === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      }
      if (String(url).includes('/geo/')) {
        return Promise.resolve(jsonResponse([createGeocodingPlace('Osaka', 'JP')]));
      }
      return Promise.resolve(jsonResponse(createApiResponse({ name: 'Osaka', country: 'JP' })));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useWeatherSearch());

    let firstSearch: Promise<unknown> = Promise.resolve();
    act(() => {
      firstSearch = result.current.search('Tokyo');
    });
    await act(() => result.current.search('Osaka'));

    await expect(firstSearch).resolves.toBeNull();
    expect(result.current.state).toMatchObject({ status: 'success', report: { city: 'Osaka' } });
  });

  it('searches a known place (e.g. a picked suggestion) without looking it up', async () => {
    const fetchMock = mockFetch(jsonResponse(createApiResponse()));
    const { result } = renderHook(() => useWeatherSearch());

    await act(() =>
      result.current.search({
        city: 'Springfield',
        countryCode: 'US',
        coordinates: { lat: 39.8, lon: -89.64 },
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getRequestedCoordinates(fetchMock)).toBe('39.8,-89.64');
    expect(result.current.state).toMatchObject({
      status: 'success',
      report: { city: 'Springfield', countryCode: 'US' },
    });
  });

  it('clearError resets an error but keeps a successful result', async () => {
    mockFetch(jsonResponse(createApiResponse()));
    const { result } = renderHook(() => useWeatherSearch());

    await act(() => result.current.search('Johor Bahru'));
    act(() => result.current.clearError());
    expect(result.current.state.status).toBe('success');

    await act(() => result.current.search(''));
    act(() => result.current.clearError());
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('cancels the pending request on unmount', async () => {
    let receivedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, init) => {
        receivedSignal = init?.signal ?? undefined;
        return new Promise(() => {});
      }),
    );
    const { result, unmount } = renderHook(() => useWeatherSearch());

    act(() => {
      void result.current.search('Tokyo');
    });
    await waitFor(() => expect(receivedSignal).toBeDefined());
    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });
});
