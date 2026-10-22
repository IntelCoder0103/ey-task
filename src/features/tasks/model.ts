import type { Task, TaskPatch } from '../../api/schemas';
import { by } from '../../lib/fp';

const byPosition = by((task: Task) => task.position);

export const updaters = {
  add: (tasks: Task[], task: Task) => [...tasks, task],
  patch: (tasks: Task[], { id, patch }: { id: string; patch: TaskPatch }) =>
    tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
  remove: (tasks: Task[], id: string) => {
    const removed = tasks.find((task) => task.id === id);
    return tasks
      .filter((task) => task.id !== id)
      .map((task) =>
        removed && task.position > removed.position ? { ...task, position: task.position - 1 } : task,
      );
  },
  reorder: (tasks: Task[], ids: string[]) => {
    const rank = new Map(ids.map((id, index) => [id, index]));
    return tasks.map((task) => ({ ...task, position: rank.get(task.id) ?? task.position })).sort(byPosition);
  },
};

const predicates = {
  all: () => true,
  open: (task: Task) => !task.completed,
  done: (task: Task) => task.completed,
} satisfies Record<string, (task: Task) => boolean>;

export type Filter = keyof typeof predicates;

export const FILTERS = Object.keys(predicates) as Filter[];

export const parseFilter = (value: string | null): Filter =>
  FILTERS.find((filter) => filter === value) ?? 'all';

export const filterFor = (filter: Filter) => predicates[filter];

export const tally = (tasks: Task[]) =>
  tasks.reduce<Record<Filter, number>>(
    (counts, task) =>
      Object.fromEntries(
        FILTERS.map((filter) => [filter, counts[filter] + Number(predicates[filter](task))]),
      ) as Record<Filter, number>,
    { all: 0, open: 0, done: 0 },
  );

const DRAFT_PREFIX = 'draft-';

export const draftTask = (description: string, position: number): Task => {
  const now = new Date().toISOString();
  return {
    id: `${DRAFT_PREFIX}${crypto.randomUUID()}`,
    description: description.trim(),
    completed: false,
    position,
    createdAt: now,
    updatedAt: now,
  };
};

export const isDraft = (task: Task) => task.id.startsWith(DRAFT_PREFIX);
