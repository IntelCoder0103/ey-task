import { FILTERS, type Filter } from './model';
import styles from './FilterTabs.module.css';

const labels: Record<Filter, string> = { all: 'Everything', open: 'In progress', done: 'Finished' };

type Props = { active: Filter; counts: Record<Filter, number>; onChange: (filter: Filter) => void };

export const FilterTabs = ({ active, counts, onChange }: Props) => (
  <div className={styles.bar}>
    <nav className={styles.tabs} aria-label="Filter tasks">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className={styles.tab}
          aria-pressed={filter === active}
          onClick={() => onChange(filter)}
        >
          {labels[filter]}
          <sup className={styles.count}>{counts[filter]}</sup>
        </button>
      ))}
    </nav>
    <p className={styles.hint}>Drag the dots, or use ↑ ↓, to rearrange</p>
  </div>
);
