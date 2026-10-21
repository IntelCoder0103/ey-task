import { pipe, pipeAsync, by } from './fp';

describe('pipe', () => {
  it('threads a value through functions left to right', () => {
    const inc = (n: number) => n + 1;
    const double = (n: number) => n * 2;
    expect(pipe(inc, double)(3)).toBe(8);
  });

  it('returns the input untouched when given no functions', () => {
    expect(pipe<number>()(7)).toBe(7);
  });
});

describe('pipeAsync', () => {
  it('awaits each step before passing it on', async () => {
    const fetchish = async (n: number) => n + 1;
    const toLabel = (n: number) => `#${n}`;
    await expect(pipeAsync(fetchish, toLabel)(1)).resolves.toBe('#2');
  });

  it('short-circuits on the first rejection', async () => {
    const after = vi.fn();
    const boom = async () => {
      throw new Error('boom');
    };
    await expect(pipeAsync(boom, after)(0)).rejects.toThrow('boom');
    expect(after).not.toHaveBeenCalled();
  });
});

describe('by', () => {
  it('builds a comparator from a key selector', () => {
    const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
    expect([...rows].sort(by((r) => r.n)).map((r) => r.n)).toEqual([1, 2, 3]);
  });
});
