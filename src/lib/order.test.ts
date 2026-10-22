import { move } from './order';

describe('move', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves an item onto the slot of another item', () => {
    expect(move(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(move(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('never mutates its input', () => {
    move(order, 'a', 'd');
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the same array for unknown items or identical positions', () => {
    expect(move(order, 'a', 'a')).toBe(order);
    expect(move(order, 'zz', 'a')).toBe(order);
    expect(move(order, 'a', 'zz')).toBe(order);
  });
});
