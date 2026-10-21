import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { Task } from '../../api/schemas';
import { formatDate, pad2 } from '../../lib/format';
import { isDraft } from './model';
import styles from './TaskRow.module.css';

type Props = {
  task: Task;
  number: number;
  onToggle: (task: Task) => void;
  onRemove: (task: Task) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export const TaskRow = ({ task, number, onToggle, onRemove, onMoveUp, onMoveDown }: Props) => {
  const draft = isDraft(task);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, disabled: draft });
  const label = `“${task.description}”`;

  return (
    <li
      ref={setNodeRef}
      className={styles.row}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-done={task.completed || undefined}
      data-dragging={isDragging || undefined}
      data-draft={draft || undefined}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.handle}
        aria-label={`Reorder ${label}`}
        disabled={draft}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 10 16" aria-hidden="true">
          {[3, 8, 13].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}
        </svg>
      </button>

      <span className={styles.number}>{pad2(number)}</span>

      <div className={styles.body}>
        {draft ? (
          <span className={styles.title}>{task.description}</span>
        ) : (
          <Link to={`/tasks/${task._id}`} className={styles.title}>
            <span className={styles.text}>{task.description}</span>
          </Link>
        )}
        <span className={styles.meta}>{draft ? 'Filing…' : `Filed ${formatDate(task.createdAt)}`}</span>
      </div>

      <div className={styles.controls}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={task.completed}
            disabled={draft}
            onChange={() => onToggle(task)}
            aria-label={`Finished: ${task.description}`}
          />
          <span aria-hidden="true" />
        </label>
        <button
          type="button"
          className={styles.icon}
          onClick={onMoveUp}
          disabled={!onMoveUp || draft}
          aria-label={`Move ${label} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.icon}
          onClick={onMoveDown}
          disabled={!onMoveDown || draft}
          aria-label={`Move ${label} down`}
        >
          ↓
        </button>
        <button
          type="button"
          className={`${styles.icon} ${styles.remove}`}
          onClick={() => onRemove(task)}
          disabled={draft}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      </div>
    </li>
  );
};
