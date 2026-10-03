import styles from './Spinner.module.css';

/** Decorative loading spinner; pair it with visible or screen-reader text. */
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
