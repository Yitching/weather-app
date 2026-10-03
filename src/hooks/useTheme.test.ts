import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

function mockSystemDarkMode(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: prefersDark, media: query })),
  );
}

describe('useTheme', () => {
  it('defaults to light when the system has no preference', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('follows the system dark mode on first visit', () => {
    mockSystemDarkMode(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('toggles the theme, updates <html> and remembers the choice', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('"dark"');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
  });

  it('prefers the saved choice over the system setting', () => {
    mockSystemDarkMode(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, '"light"');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });
});
