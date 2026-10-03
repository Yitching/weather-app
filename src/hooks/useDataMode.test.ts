import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DATA_MODE_STORAGE_KEY, useDataMode } from './useDataMode';

describe('useDataMode', () => {
  it('starts in live mode when an API key is configured', () => {
    const { result } = renderHook(() => useDataMode());
    expect(result.current.mode).toBe('live');
  });

  it('starts in demo mode when no API key is configured', () => {
    vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');
    const { result } = renderHook(() => useDataMode());
    expect(result.current.mode).toBe('demo');
  });

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useDataMode());

    act(() => result.current.toggleMode());

    expect(result.current.mode).toBe('demo');
    expect(window.localStorage.getItem(DATA_MODE_STORAGE_KEY)).toBe('"demo"');
    expect(renderHook(() => useDataMode()).result.current.mode).toBe('demo');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(DATA_MODE_STORAGE_KEY, '"offline"');
    const { result } = renderHook(() => useDataMode());
    expect(result.current.mode).toBe('live');
  });
});
