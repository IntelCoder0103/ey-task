import type { Task } from '../../api/schemas';
import { draftTask, filterFor, isDraft, parseFilter, tally, updaters } from './model';

const task = (overrides: Partial<Task>): Task => ({
  _id: 'id',
  description: 'Task',
  completed: false,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const tasks = [task({ _id: 'a' }), task({ _id: 'b', completed: true }), task({ _id: 'c' })];

describe('updaters', () => {
  it('add appends', () => {
    expect(updaters.add(tasks, task({ _id: 'd' })).map((t) => t._id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('patch merges into the matching task only', () => {
    const next = updaters.patch(tasks, { id: 'a', patch: { completed: true } });
    expect(next.map((t) => t.completed)).toEqual([true, true, false]);
    expect(next[1]).toBe(tasks[1]);
  });

  it('remove filters out the id', () => {
    expect(updaters.remove(tasks, 'b').map((t) => t._id)).toEqual(['a', 'c']);
  });
});

describe('filters', () => {
  it('parses unknown views as all', () => {
    expect(parseFilter('done')).toBe('done');
    expect(parseFilter('nonsense')).toBe('all');
    expect(parseFilter(null)).toBe('all');
  });

  it('selects by completion', () => {
    expect(tasks.filter(filterFor('open')).map((t) => t._id)).toEqual(['a', 'c']);
    expect(tasks.filter(filterFor('done')).map((t) => t._id)).toEqual(['b']);
    expect(tasks.filter(filterFor('all'))).toHaveLength(3);
  });

  it('tallies every view in one pass', () => {
    expect(tally(tasks)).toEqual({ all: 3, open: 2, done: 1 });
  });
});

describe('drafts', () => {
  it('creates an optimistic placeholder that is recognisable as a draft', () => {
    const draft = draftTask('  Press the pleats  ');
    expect(draft).toMatchObject({ description: 'Press the pleats', completed: false });
    expect(isDraft(draft)).toBe(true);
    expect(isDraft(tasks[0]!)).toBe(false);
  });
});
