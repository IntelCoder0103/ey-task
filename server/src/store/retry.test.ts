import { retrying } from './retry';

const failing = (times: number, error: Error) => {
  let calls = 0;
  const task = vi.fn(async () => {
    calls += 1;
    if (calls <= times) throw error;
    return 'done';
  });
  return task;
};

const busy = Object.assign(new Error('locked'), { code: 'EBUSY' });
const isBusy = (error: unknown) => (error as { code?: string }).code === 'EBUSY';

describe('retrying', () => {
  it('retries matching errors until the task succeeds', async () => {
    const task = failing(2, busy);
    await expect(retrying(task, { attempts: 3, delayMs: 1, when: isBusy })).resolves.toBe('done');
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('gives up after the last attempt', async () => {
    const task = failing(5, busy);
    await expect(retrying(task, { attempts: 3, delayMs: 1, when: isBusy })).rejects.toBe(busy);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('rethrows other errors immediately', async () => {
    const task = failing(1, new Error('disk full'));
    await expect(retrying(task, { attempts: 3, delayMs: 1, when: isBusy })).rejects.toThrow('disk full');
    expect(task).toHaveBeenCalledTimes(1);
  });
});
