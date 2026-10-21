import { readJson, writeJson, removeKey } from './storage';

describe('storage', () => {
  it('round-trips JSON values', () => {
    writeJson('k', { a: [1, 2] });
    expect(readJson('k', null)).toEqual({ a: [1, 2] });
  });

  it('returns the fallback for missing or corrupt entries', () => {
    expect(readJson('missing', 'fallback')).toBe('fallback');
    localStorage.setItem('bad', '{nope');
    expect(readJson('bad', 0)).toBe(0);
  });

  it('removes keys', () => {
    writeJson('k', 1);
    removeKey('k');
    expect(readJson('k', null)).toBeNull();
  });

  it('swallows storage failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeJson('k', 1)).not.toThrow();
    spy.mockRestore();
  });
});
