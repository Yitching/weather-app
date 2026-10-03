import styles from './Alert.module.css';

interface AlertProps {
  message: string;
}

/** Error message that screen readers announce as soon as it appears. */
export function Alert({ message }: AlertProps) {
  return (
    <div role="alert" className={styles.alert}>
      {message}
    </div>
  );
}
