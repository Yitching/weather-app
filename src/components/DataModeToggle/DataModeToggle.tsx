import type { DataMode } from '../../api/weatherSource';
import styles from './DataModeToggle.module.css';

interface DataModeToggleProps {
  mode: DataMode;
  onToggle: () => void;
}

/** Switches between live OpenWeather data and built-in sample data. */
export function DataModeToggle({ mode, onToggle }: DataModeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={mode === 'demo'}
      className={styles.toggle}
      onClick={onToggle}
      title="Use built-in sample data instead of the OpenWeather API"
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      Demo data
    </button>
  );
}
