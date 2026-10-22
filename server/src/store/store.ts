import { emptyState, type State } from '../domain/types';
import { createSerialQueue } from './queue';

export type Persistence = { load: () => Promise<State | null>; save: (state: State) => Promise<void> };

export type Transition<R> = (state: State) => readonly [State, R];

export const createStore = async (persistence?: Persistence, initial: State = emptyState) => {
  let state = (await persistence?.load()) ?? initial;
  const enqueue = createSerialQueue();

  return {
    read: () => state,
    update: <R>(transition: Transition<R>) =>
      enqueue(async () => {
        const [next, result] = transition(state);
        if (next !== state) {
          await persistence?.save(next);
          state = next;
        }
        return result;
      }),
  };
};

export type Store = Awaited<ReturnType<typeof createStore>>;
