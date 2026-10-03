import type { Theme } from '../../hooks/useTheme';
import { MoonIcon, SunIcon } from '../ui/Icons';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/** Switches between the light and dark mockups. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      <span className={styles.text}>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
