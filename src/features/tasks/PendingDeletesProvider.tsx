import type { ReactNode } from 'react';
import { useUndoable } from '../../hooks/useUndoable';
import { PendingDeletesContext, UNDO_MS } from './pendingDeletes';
import { useDeleteTask } from './queries';

export const PendingDeletesProvider = ({ children }: { children: ReactNode }) => {
  const remove = useDeleteTask();
  const undoable = useUndoable(remove.mutateAsync, UNDO_MS);
  return (
    <PendingDeletesContext.Provider value={{ ...undoable, error: remove.error }}>
      {children}
    </PendingDeletesContext.Provider>
  );
};
