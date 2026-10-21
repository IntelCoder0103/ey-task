import { applyOrder, move, reconcile } from './order';

const task = (_id: string) => ({ _id });

describe('reconcile', () => {
  it('drops ids that no longer exist and appends new ones in arrival order', () => {
    expect(reconcile(['b', 'gone', 'a'], ['a', 'b', 'c', 'd'])).toEqual(['b', 'a', 'c', 'd']);
  });

  it('falls back to arrival order when nothing is stored', () => {
    expect(reconcile([], ['x', 'y'])).toEqual(['x', 'y']);
  });
});

describe('applyOrder', () => {
  it('sorts items by the stored order without mutating the input', () => {
    const items = [task('a'), task('b'), task('c')];
    expect(applyOrder(['c', 'a', 'b'], items).map((t) => t._id)).toEqual(['c', 'a', 'b']);
    expect(items.map((t) => t._id)).toEqual(['a', 'b', 'c']);
  });

  it('places unknown items after ordered ones', () => {
    expect(applyOrder(['b'], [task('a'), task('b')]).map((t) => t._id)).toEqual(['b', 'a']);
  });
});

describe('move', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves an id onto the slot of another id', () => {
    expect(move(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(move(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op for unknown ids or identical positions', () => {
    expect(move(order, 'a', 'a')).toBe(order);
    expect(move(order, 'zz', 'a')).toBe(order);
    expect(move(order, 'a', 'zz')).toBe(order);
  });
});
