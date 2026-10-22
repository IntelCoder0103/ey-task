import type { Task } from './types';
import {
  allOf,
  isOrderOf,
  matches,
  nextPosition,
  queryTasks,
  removeTask,
  reorderTasks,
  toPublicTask,
} from './tasks';

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  owner: 'ana',
  description: `Task ${id}`,
  completed: false,
  position: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const tasks = [
  task('c', { position: 2, description: 'Hem the linen trousers' }),
  task('a', { position: 0, description: 'Book the fitting', completed: true }),
  task('b', { position: 1, description: 'Return the LINEN swatches' }),
  task('x', { owner: 'ben', position: 0, description: 'Linen for Ben' }),
];

describe('predicates', () => {
  it('matches descriptions case-insensitively and ignores blank queries', () => {
    expect(tasks.filter(matches('linen')).map((t) => t.id)).toEqual(['c', 'b', 'x']);
    expect(tasks.filter(matches('  '))).toHaveLength(4);
  });

  it('allOf combines predicates', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isPositive = (n: number) => n > 0;
    expect([-2, 1, 2, 4].filter(allOf(isEven, isPositive))).toEqual([2, 4]);
  });
});

describe('queryTasks', () => {
  it('returns only the owner’s tasks sorted by position with a total', () => {
    expect(queryTasks(tasks, 'ana', {})).toEqual({ data: [tasks[1], tasks[2], tasks[0]], total: 3 });
  });

  it('filters by search text and completion', () => {
    expect(queryTasks(tasks, 'ana', { q: 'linen' }).data.map((t) => t.id)).toEqual(['b', 'c']);
    expect(queryTasks(tasks, 'ana', { completed: true }).data.map((t) => t.id)).toEqual(['a']);
  });

  it('paginates after filtering while reporting the full total', () => {
    expect(queryTasks(tasks, 'ana', { skip: 1, limit: 1 })).toEqual({ data: [tasks[2]], total: 3 });
  });
});

describe('positions', () => {
  it('appends new tasks after the owner’s last position', () => {
    expect(nextPosition(tasks, 'ana')).toBe(3);
    expect(nextPosition(tasks, 'nobody')).toBe(0);
  });

  it('closes the gap left by a removed task, for that owner only', () => {
    expect(removeTask(tasks, tasks[1]!).map((t) => [t.id, t.position])).toEqual([
      ['c', 1],
      ['b', 0],
      ['x', 0],
    ]);
  });

  it('reorders by an id list without touching other owners', () => {
    expect(reorderTasks(tasks, 'ana', ['c', 'a', 'b']).map((t) => [t.id, t.position])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
      ['x', 0],
    ]);
  });

  it('keeps unlisted tasks after the listed ones, in their current order', () => {
    expect(reorderTasks(tasks, 'ana', ['b']).map((t) => [t.id, t.position])).toEqual([
      ['c', 2],
      ['a', 1],
      ['b', 0],
      ['x', 0],
    ]);
  });

  it('accepts the owner’s own ids, each at most once', () => {
    const owned = tasks.filter((t) => t.owner === 'ana');
    expect(isOrderOf(['b', 'c', 'a'], owned)).toBe(true);
    expect(isOrderOf(['b', 'c'], owned)).toBe(true);
    expect(isOrderOf(['b', 'b', 'c'], owned)).toBe(false);
    expect(isOrderOf(['b', 'c', 'x'], owned)).toBe(false);
    expect(isOrderOf(['draft-1'], owned)).toBe(false);
  });
});

it('toPublicTask hides the owner', () => {
  expect(toPublicTask(tasks[0]!)).not.toHaveProperty('owner');
});
