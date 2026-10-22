import type { Task } from '../../api/schemas';
import { draftTask, filterFor, isDraft, parseFilter, tally, updaters } from './model';

const task = (id: string, position: number, overrides: Partial<Task> = {}): Task => ({
  id,
  description: `Task ${id}`,
  completed: false,
  position,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const tasks = [task('a', 0), task('b', 1, { completed: true }), task('c', 2)];

const summary = (list: Task[]) => list.map((t) => `${t.id}${t.position}`);

describe('updaters', () => {
  it('add appends', () => {
    expect(summary(updaters.add(tasks, task('d', 3)))).toEqual(['a0', 'b1', 'c2', 'd3']);
  });

  it('patch merges into the matching task only', () => {
    const next = updaters.patch(tasks, { id: 'a', patch: { completed: true } });
    expect(next.map((t) => t.completed)).toEqual([true, true, false]);
    expect(next[1]).toBe(tasks[1]);
  });

  it('remove closes the gap in positions, like the server', () => {
    expect(summary(updaters.remove(tasks, 'a'))).toEqual(['b0', 'c1']);
    expect(summary(updaters.remove(tasks, 'missing'))).toEqual(['a0', 'b1', 'c2']);
  });

  it('reorder assigns positions from the id list and sorts by them', () => {
    expect(summary(updaters.reorder(tasks, ['c', 'a', 'b']))).toEqual(['c0', 'a1', 'b2']);
  });
});

describe('filters', () => {
  it('parses unknown views as all', () => {
    expect(parseFilter('done')).toBe('done');
    expect(parseFilter('nonsense')).toBe('all');
    expect(parseFilter(null)).toBe('all');
  });

  it('selects by completion', () => {
    expect(tasks.filter(filterFor('open')).map((t) => t.id)).toEqual(['a', 'c']);
    expect(tasks.filter(filterFor('done')).map((t) => t.id)).toEqual(['b']);
    expect(tasks.filter(filterFor('all'))).toHaveLength(3);
  });

  it('tallies every view in one pass', () => {
    expect(tally(tasks)).toEqual({ all: 3, open: 2, done: 1 });
  });
});

describe('drafts', () => {
  it('creates an optimistic placeholder that is recognisable as a draft', () => {
    const draft = draftTask('  Press the pleats  ', 3);
    expect(draft).toMatchObject({ description: 'Press the pleats', completed: false, position: 3 });
    expect(isDraft(draft)).toBe(true);
    expect(isDraft(tasks[0]!)).toBe(false);
  });
});
