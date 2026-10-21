type Fn<A = unknown, B = unknown> = (a: A) => B;

export function pipe<A>(): Fn<A, A>;
export function pipe<A, B>(f1: Fn<A, B>): Fn<A, B>;
export function pipe<A, B, C>(f1: Fn<A, B>, f2: Fn<B, C>): Fn<A, C>;
export function pipe<A, B, C, D>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>): Fn<A, D>;
export function pipe<A, B, C, D, E>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>): Fn<A, E>;
export function pipe(...fns: Fn[]): Fn {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
}

type AsyncFn<A, B> = (a: A) => B | Promise<B>;

export function pipeAsync<A, B>(f1: AsyncFn<A, B>): (a: A) => Promise<B>;
export function pipeAsync<A, B, C>(f1: AsyncFn<A, B>, f2: AsyncFn<B, C>): (a: A) => Promise<C>;
export function pipeAsync<A, B, C, D>(
  f1: AsyncFn<A, B>,
  f2: AsyncFn<B, C>,
  f3: AsyncFn<C, D>,
): (a: A) => Promise<D>;
export function pipeAsync(...fns: AsyncFn<unknown, unknown>[]) {
  return (input: unknown) => fns.reduce<Promise<unknown>>((acc, fn) => acc.then(fn), Promise.resolve(input));
}

export const by =
  <T>(key: (item: T) => number) =>
  (a: T, b: T) =>
    key(a) - key(b);
