type Options = { attempts: number; delayMs: number; when: (error: unknown) => boolean };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retrying = <T>(task: () => Promise<T>, { attempts, delayMs, when }: Options): Promise<T> =>
  task().catch(async (error: unknown) => {
    if (attempts <= 1 || !when(error)) throw error;
    await sleep(delayMs);
    return retrying(task, { attempts: attempts - 1, delayMs: delayMs * 2, when });
  });
