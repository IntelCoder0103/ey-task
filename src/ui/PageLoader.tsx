import styles from './PageLoader.module.css';

export const PageLoader = ({ label }: { label: string }) => (
  <div className={styles.loader} role="status">
    <span className={styles.needle} aria-hidden="true" />
    <span className={styles.label}>{label}…</span>
  </div>
);
