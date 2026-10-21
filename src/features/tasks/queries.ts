import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { tasksApi } from '../../api/client';
import type { Task, TaskPatch } from '../../api/schemas';
import { draftTask, updaters } from './model';

export const taskKeys = {
  all: ['tasks'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export const useTaskList = () => useQuery({ queryKey: taskKeys.list(), queryFn: tasksApi.list });

export const useTask = (id: string) => {
  const client = useQueryClient();
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.get(id),
    initialData: () => client.getQueryData<Task[]>(taskKeys.list())?.find((task) => task._id === id),
    initialDataUpdatedAt: () => client.getQueryState(taskKeys.list())?.dataUpdatedAt,
  });
};

type Snapshot = { list?: Task[]; details: [QueryKey, Task | undefined][] };

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
        list: client.getQueryData<Task[]>(taskKeys.list()),
        details: client.getQueriesData<Task>({ queryKey: taskKeys.details() }),
      };
      client.setQueryData<Task[]>(taskKeys.list(), (tasks) => tasks && apply(tasks, variables));
      snapshot.details.forEach(
        ([key, task]) => task && client.setQueryData(key, apply([task], variables)[0]),
      );
      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      client.setQueryData(taskKeys.list(), snapshot?.list);
      snapshot?.details.forEach(([key, task]) => client.setQueryData(key, task));
    },
    onSettled: () => client.invalidateQueries({ queryKey: taskKeys.all }),
  });
};

export const useCreateTask = () =>
  useOptimistic(tasksApi.create, (tasks, description: string) => updaters.add(tasks, draftTask(description)));

export const useUpdateTask = () =>
  useOptimistic(
    ({ id, patch }: { id: string; patch: TaskPatch }) => tasksApi.update(id, patch),
    updaters.patch,
  );

export const useDeleteTask = () => {
  const client = useQueryClient();
  return useOptimistic(tasksApi.remove, updaters.remove, (id) =>
    client.removeQueries({ queryKey: taskKeys.detail(id) }),
  );
};
