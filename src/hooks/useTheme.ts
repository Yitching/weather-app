import { useCallback, useEffect } from 'react';
import { useLocalStorageState } from './useLocalStorageState';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'todays-weather:theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/** First visit: follow the operating system's light/dark setting. */
function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light/dark theme, remembered across visits and applied to the <html> element. */
export function useTheme() {
  const [theme, setTheme] = useLocalStorageState<Theme>(THEME_STORAGE_KEY, getSystemTheme, isTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  return { theme, toggleTheme };
}
