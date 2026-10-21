import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Task } from '../../api/schemas';
import { useUndoable } from '../../hooks/useUndoable';
import { formatDate } from '../../lib/format';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { EmptyState } from './EmptyState';
import { FilterTabs } from './FilterTabs';
import { filterFor, parseFilter, tally } from './model';
import { NewTaskForm } from './NewTaskForm';
import { useCreateTask, useDeleteTask, useUpdateTask } from './queries';
import { TaskRow } from './TaskRow';
import styles from './TaskListPage.module.css';
import { UndoSlips } from './UndoSlips';
import { useOrderedTasks } from './useOrderedTasks';

export const UNDO_MS = 5000;

const Skeleton = () => (
  <ol className={styles.skeleton} aria-label="Loading tasks">
    {[0.72, 0.5, 0.64].map((width) => (
      <li key={width} style={{ '--w': width } as CSSProperties} />
    ))}
  </ol>
);

export const TaskListPage = () => {
  const { tasks, reorder, isPending, isError, error, refetch } = useOrderedTasks();
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const removal = useUndoable(remove.mutateAsync, UNDO_MS);
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('view'));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hidden = new Set(removal.pending);
  const live = tasks.filter((task) => !hidden.has(task._id));
  const numbers = new Map(live.map((task, index) => [task._id, index + 1]));
  const visible = live.filter(filterFor(filter));
  const counts = tally(live);
  const progress = counts.all ? counts.done / counts.all : 0;
  const failure = [create, update, remove].find((mutation) => mutation.isError)?.error;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) reorder(String(active.id), String(over.id));
  };
  const toggle = (task: Task) => update.mutate({ id: task._id, patch: { completed: !task.completed } });
  const neighbour = (index: number) => visible[index]?._id;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>This week’s edit · {formatDate(new Date().toISOString())}</p>
          <h1 className={styles.display}>
            The <em>Edit.</em>
          </h1>
        </div>
        <div className={styles.ledger}>
          <dl className={styles.stats}>
            <div>
              <dt>Looks</dt>
              <dd>{counts.all}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{counts.done}</dd>
            </div>
            <div>
              <dt>On the rail</dt>
              <dd>{counts.open}</dd>
            </div>
          </dl>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="Finished"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            style={{ '--progress': progress } as CSSProperties}
          >
            <span />
          </div>
          <p className={styles.progressLabel}>{Math.round(progress * 100)}% of the collection complete</p>
        </div>
      </header>

      <NewTaskForm nextNumber={counts.all + 1} onAdd={(description) => create.mutate(description)} />

      <FilterTabs
        active={filter}
        counts={counts}
        onChange={(next) => setParams(next === 'all' ? {} : { view: next }, { replace: true })}
      />

      {failure && (
        <p className={styles.alert} role="alert">
          That change didn’t save — {failure.message}
        </p>
      )}

      {isPending && <Skeleton />}
      {isError && <ErrorPanel error={error} title="The rail is empty." onRetry={() => refetch()} />}
      {!isPending && !isError && visible.length === 0 && <EmptyState filter={filter} />}

      {visible.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((task) => task._id)} strategy={verticalListSortingStrategy}>
            <ol className={styles.list} aria-label="Tasks">
              {visible.map((task, index) => {
                const above = neighbour(index - 1);
                const below = neighbour(index + 1);
                return (
                  <TaskRow
                    key={task._id}
                    task={task}
                    number={numbers.get(task._id) ?? index + 1}
                    onToggle={toggle}
                    onRemove={({ _id }) => removal.schedule(_id)}
                    onMoveUp={above ? () => reorder(task._id, above) : undefined}
                    onMoveDown={below ? () => reorder(task._id, below) : undefined}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <UndoSlips
        tasks={tasks.filter((task) => hidden.has(task._id))}
        delayMs={UNDO_MS}
        onUndo={removal.undo}
      />
    </main>
  );
};
