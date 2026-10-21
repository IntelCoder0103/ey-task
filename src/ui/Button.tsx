import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ink' | 'line' | 'quiet';
  busy?: boolean;
};

export const Button = ({ variant = 'ink', busy = false, className, children, disabled, ...rest }: Props) => (
  <button
    type="button"
    className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    {...rest}
  >
    {children}
  </button>
);
