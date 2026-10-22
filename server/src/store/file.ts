import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { State } from '../domain/types';
import type { Persistence } from './store';

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

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
    await rename(temp, path);
  },
});
