import { useId, type InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export const Field = ({ label, error, hint, ...input }: Props) => {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={styles.field} data-invalid={Boolean(error) || undefined}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? noteId : undefined}
        {...input}
      />
      {(error || hint) && (
        <p id={noteId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
};
