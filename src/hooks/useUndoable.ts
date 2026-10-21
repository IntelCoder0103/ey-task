import { useCallback, useEffect, useRef, useState } from 'react';

type Commit = (id: string) => Promise<unknown>;

export const useUndoable = (commit: Commit, delayMs: number) => {
  const [pending, setPending] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  });

  const settle = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setPending((ids) => ids.filter((candidate) => candidate !== id));
  }, []);

  const schedule = useCallback(
    (id: string) => {
      if (timers.current.has(id)) return;
      setPending((ids) => [...ids, id]);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          commitRef
            .current(id)
            .catch(() => null)
            .finally(() => settle(id));
        }, delayMs),
      );
    },
    [delayMs, settle],
  );

  useEffect(() => {
    const scheduled = timers.current;
    return () => {
      scheduled.forEach((timer, id) => {
        clearTimeout(timer);
        commitRef.current(id).catch(() => null);
      });
      scheduled.clear();
    };
  }, []);

  return { pending, schedule, undo: settle };
};
