import { createContext, useContext } from 'react';
import type { useUndoable } from '../../hooks/useUndoable';

export const UNDO_MS = 5000;

export type PendingDeletes = ReturnType<typeof useUndoable> & { error: Error | null };

export const PendingDeletesContext = createContext<PendingDeletes | null>(null);

export const usePendingDeletes = () => {
  const value = useContext(PendingDeletesContext);
  if (!value) throw new Error('usePendingDeletes must be used inside <PendingDeletesProvider>.');
  return value;
};
