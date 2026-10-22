import type { CSSProperties } from 'react';
import type { Task } from '../../api/schemas';
import styles from './UndoSlips.module.css';

type Props = { tasks: Task[]; delayMs: number; onUndo: (id: string) => void };

export const UndoSlips = ({ tasks, delayMs, onUndo }: Props) => (
  <div className={styles.stack} aria-live="polite">
    {tasks.map((task) => (
      <div key={task.id} className={styles.slip} style={{ '--fuse': `${delayMs}ms` } as CSSProperties}>
        <p className={styles.copy}>
          <span className={styles.label}>Removed</span>
          <q>{task.description}</q>
        </p>
        <button type="button" className={styles.undo} onClick={() => onUndo(task.id)}>
          Undo
        </button>
        <span className={styles.fuse} aria-hidden="true" />
      </div>
    ))}
  </div>
);
