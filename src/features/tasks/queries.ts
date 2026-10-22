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
import { draftTask, updaters } from './model';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (q = '') => [...taskKeys.lists(), q] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

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

type Snapshot = { lists: [QueryKey, Task[] | undefined][]; details: [QueryKey, Task | undefined][] };

const useOptimistic = <V, R>(
  mutationFn: (variables: V) => Promise<R>,
  apply: (tasks: Task[], variables: V) => Task[],
  onSuccess?: (result: R) => void,
) => {
  const client = useQueryClient();

  return useMutation<R, Error, V, Snapshot>({
    mutationFn,
    onSuccess,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: taskKeys.all });
      const snapshot: Snapshot = {
        lists: client.getQueriesData<Task[]>({ queryKey: taskKeys.lists() }),
        details: client.getQueriesData<Task>({ queryKey: taskKeys.details() }),
      };
      client.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (tasks) => tasks && apply(tasks, variables),
      );
      snapshot.details.forEach(
        ([key, task]) => task && client.setQueryData(key, apply([task], variables)[0]),
      );
      return snapshot;
    },
    onError: (_error, _variables, snapshot) =>
      [...(snapshot?.lists ?? []), ...(snapshot?.details ?? [])].forEach(([key, data]) =>
        client.setQueryData(key, data),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: taskKeys.all }),
  });
};

export const useCreateTask = () =>
  useOptimistic(tasksApi.create, (tasks, description: string) =>
    updaters.add(tasks, draftTask(description, tasks.length)),
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
