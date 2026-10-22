import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { tasksApi } from '../../api/client';
import type { Task, TaskPatch } from '../../api/schemas';
import { session } from '../../api/session';
import { draftTask, updaters } from './model';

const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (q = '') => [...taskKeys.lists(), q] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

const mutationKey = ['tasks', 'write'] as const;

export const useTaskList = (q = '') =>
  useQuery({
    queryKey: taskKeys.list(q),
    queryFn: ({ signal }) => tasksApi.list({ q, signal }),
    placeholderData: keepPreviousData,
  });

const findCached = (client: QueryClient, id: string) =>
  client
    .getQueriesData<Task[]>({ queryKey: taskKeys.lists() })
    .flatMap(([, tasks]) => tasks ?? [])
    .find((task) => task.id === id);

export const useTask = (id: string) => {
  const client = useQueryClient();
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => tasksApi.get(id, signal),
    initialData: () => findCached(client, id),
    initialDataUpdatedAt: () => client.getQueryState(taskKeys.list())?.dataUpdatedAt,
  });
};

type Apply<V> = (tasks: Task[], variables: V, query: string) => Task[];
type Snapshot = [QueryKey, unknown][];

const searchOf = (key: QueryKey) => String(key[2] ?? '');

const useOptimistic = <V, R>(
  mutationFn: (variables: V) => Promise<R>,
  apply: Apply<V>,
  onSuccess?: (result: R) => void,
) => {
  const client = useQueryClient();

  return useMutation<R, Error, V, Snapshot>({
    mutationKey,
    mutationFn,
    onSuccess,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: taskKeys.all });
      const lists = client.getQueriesData<Task[]>({ queryKey: taskKeys.lists() });
      const details = client.getQueriesData<Task>({ queryKey: taskKeys.details() });
      lists.forEach(
        ([key, tasks]) => tasks && client.setQueryData(key, apply(tasks, variables, searchOf(key))),
      );
      details.forEach(([key, task]) => task && client.setQueryData(key, apply([task], variables, '')[0]));
      return [...lists, ...details];
    },
    onError: (_error, _variables, snapshot) => {
      if (session.get() === null) return;
      snapshot?.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () =>
      client.isMutating({ mutationKey }) === 1
        ? client.invalidateQueries({ queryKey: taskKeys.all })
        : undefined,
  });
};

export const useCreateTask = () =>
  useOptimistic(tasksApi.create, (tasks, description: string, query) =>
    query ? tasks : updaters.add(tasks, draftTask(description, tasks.length)),
  );

export const useUpdateTask = () =>
  useOptimistic(
    ({ id, patch }: { id: string; patch: TaskPatch }) => tasksApi.update(id, patch),
    updaters.patch,
  );

export const useReorderTasks = () => useOptimistic(tasksApi.reorder, updaters.reorder);

export const useDeleteTask = () => {
  const client = useQueryClient();
  return useOptimistic(tasksApi.remove, updaters.remove, (id) =>
    client.removeQueries({ queryKey: taskKeys.detail(id) }),
  );
};
