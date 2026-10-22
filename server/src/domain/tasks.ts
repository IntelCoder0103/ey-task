import type { Task } from './types';

export type TaskQuery = { q?: string; completed?: boolean; limit?: number; skip?: number };
export type TaskPatch = Partial<Pick<Task, 'description' | 'completed'>>;

type Predicate<T> = (item: T) => boolean;

export const allOf =
  <T>(...predicates: Predicate<T>[]): Predicate<T> =>
  (item) =>
    predicates.every((predicate) => predicate(item));

export const ownedBy =
  (owner: string): Predicate<Task> =>
  (task) =>
    task.owner === owner;

export const matches = (q = ''): Predicate<Task> => {
  const needle = q.trim().toLowerCase();
  return (task) => task.description.toLowerCase().includes(needle);
};

const withStatus =
  (completed?: boolean): Predicate<Task> =>
  (task) =>
    completed === undefined || task.completed === completed;

const byPosition = (a: Task, b: Task) => a.position - b.position;

export const queryTasks = (tasks: Task[], owner: string, { q, completed, limit, skip = 0 }: TaskQuery) => {
  const found = tasks.filter(allOf(ownedBy(owner), matches(q), withStatus(completed))).sort(byPosition);
  return { data: found.slice(skip, limit ? skip + limit : undefined), total: found.length };
};

export const findOwned = (tasks: Task[], owner: string, id: string) =>
  tasks.find((task) => task.id === id && task.owner === owner);

export const nextPosition = (tasks: Task[], owner: string) => tasks.filter(ownedBy(owner)).length;

export const patchTask = (tasks: Task[], id: string, patch: TaskPatch, updatedAt: string) =>
  tasks.map((task) => (task.id === id ? { ...task, ...patch, updatedAt } : task));

export const removeTask = (tasks: Task[], removed: Task) =>
  tasks
    .filter((task) => task.id !== removed.id)
    .map((task) =>
      task.owner === removed.owner && task.position > removed.position
        ? { ...task, position: task.position - 1 }
        : task,
    );

export const reorderTasks = (tasks: Task[], owner: string, ids: string[]) => {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return tasks.map((task) =>
    task.owner === owner ? { ...task, position: rank.get(task.id) ?? task.position } : task,
  );
};

export const isPermutationOf = (ids: string[], owned: Task[]) => {
  const unique = new Set(ids);
  return (
    unique.size === ids.length && ids.length === owned.length && owned.every((task) => unique.has(task.id))
  );
};

export const toPublicTask = ({ id, description, completed, position, createdAt, updatedAt }: Task) => ({
  id,
  description,
  completed,
  position,
  createdAt,
  updatedAt,
});
