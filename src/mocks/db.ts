import { DEMO } from './demo';
import type { Task, User } from '../api/schemas';

export type StoredUser = Required<Pick<User, '_id' | 'name' | 'email' | 'createdAt' | 'updatedAt'>> &
  Pick<User, 'age'> & { password: string; tokens: string[] };

export type DbState = { users: StoredUser[]; tasks: Task[] };

export type Persistence = { load: () => DbState | null; save: (state: DbState) => void };

export { DEMO } from './demo';

export const objectId = () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const seedDescriptions: [string, boolean][] = [
  ['Book the fitting for the wool overcoat', true],
  ['Return the linen swatches to the mill', false],
  ['Draft the autumn moodboard', false],
  ['Call the tailor about the trouser hem', false],
  ['Photograph the capsule wardrobe for the archive', true],
];

export const seed = (): DbState => {
  const owner = objectId();
  return {
    users: [
      {
        _id: owner,
        name: 'Margaux Ellery',
        email: DEMO.email,
        password: DEMO.password,
        age: 29,
        tokens: [],
        createdAt: daysAgo(44),
        updatedAt: daysAgo(44),
      },
    ],
    tasks: seedDescriptions.map(([description, completed], index) => ({
      _id: objectId(),
      description,
      completed,
      owner,
      createdAt: daysAgo(20 - index * 3),
      updatedAt: daysAgo(10 - index),
    })),
  };
};

export const createDb = (persistence?: Persistence) => {
  let state = persistence?.load() ?? seed();
  const commit = (next: DbState) => {
    state = next;
    persistence?.save(state);
    return state;
  };
  return {
    read: () => state,
    commit,
    reset: (next: DbState = seed()) => commit(next),
  };
};

export type Db = ReturnType<typeof createDb>;
