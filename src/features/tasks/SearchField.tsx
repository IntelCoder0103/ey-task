import styles from './SearchField.module.css';

type Props = { value: string; busy: boolean; onChange: (value: string) => void };

export const SearchField = ({ value, busy, onChange }: Props) => (
  <div className={styles.search} role="search">
    <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="6" />
      <path d="M13 13l5 5" />
    </svg>
    <input
      type="search"
      className={styles.input}
      aria-label="Search tasks"
      placeholder="Search the edit…"
      value={value}
      maxLength={200}
      onChange={(event) => onChange(event.target.value)}
    />
    {value && (
      <button type="button" className={styles.clear} onClick={() => onChange('')}>
        Clear
      </button>
    )}
    <span className={styles.status} role="status">
      {busy ? 'Searching…' : ''}
    </span>
  </div>
);
