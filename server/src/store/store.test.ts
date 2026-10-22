import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyState, type State } from '../domain/types';
import { filePersistence } from './file';
import { createSerialQueue } from './queue';
import { createStore } from './store';

const withUser = (state: State, id: string): State => ({
  ...state,
  users: [
    ...state.users,
    { id, name: id, email: `${id}@x.io`, passwordHash: '', createdAt: '', updatedAt: '' },
  ],
});

describe('createSerialQueue', () => {
  it('runs jobs one at a time in submission order, even when earlier ones fail', async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    const job = (name: string, ms: number) => () =>
      new Promise<string>((resolve) =>
        setTimeout(() => {
          log.push(name);
          resolve(name);
        }, ms),
      );

    const results = await Promise.allSettled([
      enqueue(job('slow', 20)),
      enqueue(() => Promise.reject(new Error('boom'))),
      enqueue(job('fast', 0)),
    ]);

    expect(log).toEqual(['slow', 'fast']);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });
});

describe('createStore', () => {
  it('applies concurrent transitions one after another and returns their results', async () => {
    const store = await createStore();
    const added = await Promise.all(
      ['a', 'b', 'c'].map((id) => store.update((state) => [withUser(state, id), state.users.length])),
    );
    expect(added).toEqual([0, 1, 2]);
    expect(store.read().users.map((user) => user.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves state untouched when a transition throws', async () => {
    const store = await createStore();
    await expect(
      store.update(() => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
    expect(store.read()).toBe(emptyState);
  });

  it('does not commit when persistence fails', async () => {
    const store = await createStore({
      load: async () => null,
      save: () => Promise.reject(new Error('disk full')),
    });
    await expect(store.update((state) => [withUser(state, 'a'), null])).rejects.toThrow('disk full');
    expect(store.read().users).toEqual([]);
  });
});

describe('filePersistence', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'atelier-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('returns null for a missing file and round-trips state', async () => {
    const file = join(dir, 'nested', 'db.json');
    const persistence = filePersistence(file);
    expect(await persistence.load()).toBeNull();

    const store = await createStore(persistence);
    await store.update((state) => [withUser(state, 'a'), null]);

    expect(JSON.parse(await readFile(file, 'utf8')).users[0].id).toBe('a');
    expect((await createStore(filePersistence(file))).read().users).toHaveLength(1);
  });

  it('surfaces corrupt files instead of silently resetting data', async () => {
    const file = join(dir, 'db.json');
    await writeFile(file, '{oops');
    await expect(filePersistence(file).load()).rejects.toThrow();
  });
});
