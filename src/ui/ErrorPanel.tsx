import { Button } from './Button';
import styles from './ErrorPanel.module.css';

type Props = { error: Error; title?: string; onRetry?: () => void };

export const ErrorPanel = ({ error, title = 'A misprint.', onRetry }: Props) => (
  <section className={styles.panel} role="alert">
    <p className={styles.kicker}>Errata</p>
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.message}>{error.message}</p>
    {onRetry && (
      <Button variant="line" onClick={onRetry}>
        Try again
      </Button>
    )}
  </section>
);
