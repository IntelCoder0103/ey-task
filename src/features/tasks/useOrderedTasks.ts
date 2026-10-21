import { useMemo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { applyOrder, move } from '../../lib/order';
import { useCurrentUser } from '../auth/hooks';
import { useTaskList } from './queries';

export const useOrderedTasks = () => {
  const user = useCurrentUser();
  const query = useTaskList();
  const [order, setOrder] = usePersistentState<string[]>(`atelier:order:${user._id}`, []);

  const tasks = useMemo(() => applyOrder(order, query.data ?? []), [order, query.data]);

  const reorder = (activeId: string, overId: string) =>
    setOrder(
      move(
        tasks.map((task) => task._id),
        activeId,
        overId,
      ),
    );

  return { ...query, tasks, reorder };
};
