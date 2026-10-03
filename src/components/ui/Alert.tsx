import type { ReactNode } from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  message: string;
  /** Optional button (or link) that helps the user recover. */
  action?: ReactNode;
}

/** Error message that screen readers announce as soon as it appears. */
export function Alert({ message, action }: AlertProps) {
  return (
    <div role="alert" className={styles.alert}>
      <span>{message}</span>
      {action}
    </div>
  );
}
