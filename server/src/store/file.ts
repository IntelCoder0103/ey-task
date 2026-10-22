import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { State } from '../domain/types';
import { retrying } from './retry';
import type { Persistence } from './store';

const codeOf = (error: unknown) => (error as NodeJS.ErrnoException).code;
const isMissing = (error: unknown) => codeOf(error) === 'ENOENT';
const isTransientLock = (error: unknown) => ['EBUSY', 'EPERM', 'EACCES'].includes(codeOf(error) ?? '');

export const filePersistence = (path: string): Persistence => ({
  load: async () => {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as State;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },
  save: async (state) => {
    const temp = `${path}.${process.pid}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temp, JSON.stringify(state));
    await retrying(() => rename(temp, path), { attempts: 6, delayMs: 20, when: isTransientLock });
  },
});
