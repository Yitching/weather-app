import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as a tooltip because the button has no visible text. */
  label: string;
  icon: ReactNode;
}

/** Round button containing only an icon, e.g. "search again" and "delete" in the history list. */
export function IconButton({ label, icon, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      {...props}
    >
      {icon}
    </button>
  );
}
