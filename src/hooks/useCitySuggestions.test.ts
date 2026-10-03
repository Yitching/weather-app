import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createGeocodingPlace,
  getSuggestionCalls,
  mockFetchWithSuggestions,
} from '../test/fixtures';
import { useCitySuggestions } from './useCitySuggestions';

const OSAKA = createGeocodingPlace('Osaka', 'JP', 'Osaka Prefecture');

function queryOf(call: Parameters<typeof fetch> | undefined) {
  return new URL(String(call?.[0])).searchParams.get('q');
}

describe('useCitySuggestions', () => {
  it('returns suggestions for the typed city', async () => {
    mockFetchWithSuggestions([OSAKA]);

    const { result } = renderHook(() => useCitySuggestions('Osa', ''));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]).toEqual({
      id: 'osaka|osaka prefecture|jp',
      city: 'Osaka',
      state: 'Osaka Prefecture',
      countryCode: 'JP',
    });
  });

  it('narrows the lookup to the country field when it is a known country', async () => {
    const fetchMock = mockFetchWithSuggestions([OSAKA]);

    renderHook(() => useCitySuggestions('Osa', 'Japan'));

    await waitFor(() => expect(getSuggestionCalls(fetchMock)).toHaveLength(1));
    expect(queryOf(getSuggestionCalls(fetchMock)[0])).toBe('Osa,JP');
  });

  it('does not look up very short input', async () => {
    const fetchMock = mockFetchWithSuggestions([OSAKA]);

    const { result } = renderHook(() => useCitySuggestions('O', ''));
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(result.current).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for typing to pause before calling the API', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetchWithSuggestions([OSAKA]);

    const { rerender } = renderHook(({ city }) => useCitySuggestions(city, ''), {
      initialProps: { city: '' },
    });
    rerender({ city: 'Os' });
    rerender({ city: 'Osa' });
    rerender({ city: 'Osak' });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(getSuggestionCalls(fetchMock)).toHaveLength(1);
    expect(queryOf(getSuggestionCalls(fetchMock)[0])).toBe('Osak');
  });

  it('reuses cached results instead of calling the API again', async () => {
    const fetchMock = mockFetchWithSuggestions([OSAKA]);
    const { result, rerender } = renderHook(({ city }) => useCitySuggestions(city, ''), {
      initialProps: { city: 'Osa' },
    });
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ city: 'Osak' });
    await waitFor(() => expect(getSuggestionCalls(fetchMock)).toHaveLength(2));
    rerender({ city: 'Osa' });
    await waitFor(() => expect(result.current).toHaveLength(1));

    expect(getSuggestionCalls(fetchMock)).toHaveLength(2);
  });

  it('returns no suggestions when the lookup fails', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('offline')));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCitySuggestions('Osa', ''));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('hides suggestions as soon as the input becomes too short', async () => {
    mockFetchWithSuggestions([OSAKA]);
    const { result, rerender } = renderHook(({ city }) => useCitySuggestions(city, ''), {
      initialProps: { city: 'Osa' },
    });
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ city: 'O' });

    expect(result.current).toEqual([]);
  });

  it('hides suggestions immediately when the text is replaced, before the next lookup', async () => {
    mockFetchWithSuggestions([OSAKA]);
    const { result, rerender } = renderHook(({ city }) => useCitySuggestions(city, ''), {
      initialProps: { city: 'Osa' },
    });
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ city: 'Osak' }); // still extending "Osa": keep showing
    expect(result.current).toHaveLength(1);

    rerender({ city: 'To' }); // different text: hide right away
    expect(result.current).toEqual([]);
  });
});
