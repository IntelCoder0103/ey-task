import type { Filter } from './model';
import styles from './EmptyState.module.css';

const copy: Record<Filter, [string, string]> = {
  all: ['Blank pages are in fashion.', 'Briefly. Write your first look above to open the issue.'],
  open: ['Nothing outstanding.', 'Every look on the rail is finished. Very chic.'],
  done: ['Nothing finished — yet.', 'The season is young. Tick one off and it will appear here.'],
};

export const EmptyState = ({ filter }: { filter: Filter }) => {
  const [title, body] = copy[filter];
  return (
    <div className={styles.empty}>
      <svg className={styles.hanger} viewBox="0 0 120 70" aria-hidden="true">
        <path d="M60 22 c0 -6 -9 -6 -9 -12 a9 9 0 1 1 18 0 M60 22 L6 58 Q2 62 8 62 H112 Q118 62 114 58 Z" />
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
    </div>
  );
};
