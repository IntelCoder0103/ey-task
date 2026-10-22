import { FILTERS, type Filter } from './model';
import styles from './FilterTabs.module.css';

const labels: Record<Filter, string> = { all: 'Everything', open: 'In progress', done: 'Finished' };

type Props = {
  active: Filter;
  counts: Record<Filter, number>;
  sortable: boolean;
  onChange: (filter: Filter) => void;
};

export const FilterTabs = ({ active, counts, sortable, onChange }: Props) => (
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
    <p className={styles.hint}>
      {sortable ? 'Drag the dots, or use ↑ ↓, to rearrange' : 'Clear the search to rearrange'}
    </p>
  </div>
);
