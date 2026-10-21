import type { Task, TaskPatch } from '../../api/schemas';

export const updaters = {
  add: (tasks: Task[], task: Task) => [...tasks, task],
  patch: (tasks: Task[], { id, patch }: { id: string; patch: TaskPatch }) =>
    tasks.map((task) => (task._id === id ? { ...task, ...patch } : task)),
  remove: (tasks: Task[], id: string) => tasks.filter((task) => task._id !== id),
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

export const draftTask = (description: string): Task => {
  const now = new Date().toISOString();
  return {
    _id: `${DRAFT_PREFIX}${Date.now().toString(36)}`,
    description: description.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const isDraft = (task: Task) => task._id.startsWith(DRAFT_PREFIX);
