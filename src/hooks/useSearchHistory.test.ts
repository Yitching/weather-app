import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createHistoryEntry, createReport } from '../test/fixtures';
import { HISTORY_STORAGE_KEY, MAX_HISTORY_ENTRIES, useSearchHistory } from './useSearchHistory';

const readStoredHistory = () =>
  JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? 'null') as unknown;

describe('useSearchHistory', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('adds new searches to the top and saves them to localStorage', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addEntry(createReport({ city: 'Osaka', countryCode: 'JP' })));
    act(() => result.current.addEntry(createReport({ city: 'Seoul', countryCode: 'KR' })));

    expect(result.current.history.map((entry) => entry.city)).toEqual(['Seoul', 'Osaka']);
    expect(readStoredHistory()).toEqual(result.current.history);
  });

  it('moves a repeated location to the top instead of duplicating it', () => {
    const { result } = renderHook(() => useSearchHistory());
    const laterTime = new Date(2022, 8, 1, 10, 0).toISOString();

    act(() => result.current.addEntry(createReport({ city: 'Osaka', countryCode: 'JP' })));
    act(() => result.current.addEntry(createReport({ city: 'Seoul', countryCode: 'KR' })));
    act(() =>
      result.current.addEntry(
        createReport({ city: 'Osaka', countryCode: 'JP', retrievedAt: laterTime }),
      ),
    );

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0]).toMatchObject({ city: 'Osaka', searchedAt: laterTime });
  });

  it(`keeps at most ${MAX_HISTORY_ENTRIES} entries`, () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      for (let index = 0; index < MAX_HISTORY_ENTRIES + 5; index++) {
        result.current.addEntry(createReport({ city: `City ${index}` }));
      }
    });

    expect(result.current.history).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(result.current.history[0]?.city).toBe(`City ${MAX_HISTORY_ENTRIES + 4}`);
  });

  it('removes an entry by id', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addEntry(createReport({ city: 'Osaka', countryCode: 'JP' })));
    act(() => result.current.addEntry(createReport({ city: 'Seoul', countryCode: 'KR' })));

    act(() => result.current.removeEntry('osaka|jp'));

    expect(result.current.history.map((entry) => entry.city)).toEqual(['Seoul']);
    expect(readStoredHistory()).toHaveLength(1);
  });

  it('restores saved history (e.g. after a page refresh)', () => {
    const saved = [createHistoryEntry({ city: 'Taipei', countryCode: 'TW' })];
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.history).toEqual(saved);
  });

  it("remembers the report's coordinates, so search again finds the same place", () => {
    const { result } = renderHook(() => useSearchHistory());
    const coordinates = { lat: 35.82, lon: 127.15 };

    act(() => result.current.addEntry(createReport({ city: 'Jeonju-si', coordinates })));

    expect(result.current.history[0]).toMatchObject({ city: 'Jeonju-si', coordinates });
    expect(readStoredHistory()).toEqual(result.current.history);
  });

  it.each([
    ['corrupted entries', [{ city: 42 }]],
    ['corrupted coordinates', [{ ...createHistoryEntry(), coordinates: { lat: '35' } }]],
  ])('ignores saved history with %s', (_label, saved) => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.history).toEqual([]);
  });
});
