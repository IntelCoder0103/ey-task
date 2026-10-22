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
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUndoable } from '../../hooks/useUndoable';
import { formatDate } from '../../lib/format';
import { move } from '../../lib/order';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { EmptyState } from './EmptyState';
import { FilterTabs } from './FilterTabs';
import { filterFor, parseFilter, tally, type Filter } from './model';
import { NewTaskForm } from './NewTaskForm';
import { useCreateTask, useDeleteTask, useReorderTasks, useTaskList, useUpdateTask } from './queries';
import { SearchField } from './SearchField';
import { TaskRow } from './TaskRow';
import styles from './TaskListPage.module.css';
import { UndoSlips } from './UndoSlips';

export const UNDO_MS = 5000;
export const SEARCH_DEBOUNCE_MS = 250;

const Skeleton = () => (
  <ol className={styles.skeleton} aria-label="Loading tasks">
    {[0.72, 0.5, 0.64].map((width) => (
      <li key={width} style={{ '--w': width } as CSSProperties} />
    ))}
  </ol>
);

const useListParams = () => {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  return {
    filter: parseFilter(params.get('view')),
    query: params.get('q') ?? '',
    setFilter: (filter: Filter) => set('view', filter === 'all' ? '' : filter),
    setQuery: (query: string) => set('q', query),
  };
};

export const TaskListPage = () => {
  const { filter, query, setFilter, setQuery } = useListParams();
  const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searching = search.length > 0;

  const collection = useTaskList();
  const results = useTaskList(search);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const reorder = useReorderTasks();
  const removal = useUndoable(remove.mutateAsync, UNDO_MS);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hidden = new Set(removal.pending);
  const isLive = (task: Task) => !hidden.has(task.id);
  const everything = (collection.data ?? []).filter(isLive);
  const found = (results.data ?? []).filter(isLive);
  const visible = found.filter(filterFor(filter));
  const counts = tally(everything);
  const progress = counts.all ? counts.done / counts.all : 0;
  const failure = [create, update, remove, reorder].find((mutation) => mutation.isError)?.error;
  const reorderable = !searching && !create.isPending;

  const moveTask = (activeId: string, overId: string) => {
    if (!reorderable) return;
    const ids = (collection.data ?? []).map((task) => task.id);
    const next = move(ids, activeId, overId);
    if (next !== ids) reorder.mutate(next);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) moveTask(String(active.id), String(over.id));
  };
  const toggle = (task: Task) => update.mutate({ id: task.id, patch: { completed: !task.completed } });
  const neighbour = (index: number) => (reorderable ? visible[index]?.id : undefined);

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

      <SearchField
        value={query}
        busy={query.trim() !== search || (results.isFetching && results.isPlaceholderData)}
        onChange={setQuery}
      />

      <FilterTabs active={filter} counts={tally(found)} sortable={!searching} onChange={setFilter} />

      {failure && (
        <p className={styles.alert} role="alert">
          That change didn’t save — {failure.message}
        </p>
      )}

      {results.isPending && <Skeleton />}
      {results.isError && (
        <ErrorPanel error={results.error} title="The rail is empty." onRetry={() => results.refetch()} />
      )}
      {results.isSuccess && visible.length === 0 && <EmptyState filter={filter} query={search} />}

      {visible.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <ol className={styles.list} aria-label="Tasks">
              {visible.map((task, index) => {
                const above = neighbour(index - 1);
                const below = neighbour(index + 1);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    number={task.position + 1}
                    sortable={reorderable}
                    onToggle={toggle}
                    onRemove={({ id }) => removal.schedule(id)}
                    onMoveUp={above ? () => moveTask(task.id, above) : undefined}
                    onMoveDown={below ? () => moveTask(task.id, below) : undefined}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <UndoSlips
        tasks={(collection.data ?? []).filter((task) => hidden.has(task.id))}
        delayMs={UNDO_MS}
        onUndo={removal.undo}
      />
    </main>
  );
};
