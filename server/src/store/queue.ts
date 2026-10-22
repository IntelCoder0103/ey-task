export const createSerialQueue = () => {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(job: () => T | Promise<T>): Promise<T> => {
    const run = tail.then(job);
    tail = run.catch(() => undefined);
    return run;
  };
};
