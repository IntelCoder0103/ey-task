import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';
import { useUndoable } from './useUndoable';

describe('usePersistentState', () => {
  it('reads, writes and follows key changes', () => {
    localStorage.setItem('order:1', JSON.stringify(['a']));
    const { result, rerender } = renderHook(({ key }) => usePersistentState<string[]>(key, []), {
      initialProps: { key: 'order:1' },
    });
    expect(result.current[0]).toEqual(['a']);

    act(() => result.current[1](['b', 'a']));
    expect(result.current[0]).toEqual(['b', 'a']);
    expect(localStorage.getItem('order:1')).toBe('["b","a"]');

    rerender({ key: 'order:2' });
    expect(result.current[0]).toEqual([]);
  });
});

describe('useUndoable', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('commits after the delay unless undone', async () => {
    const commit = vi.fn(async () => undefined);
    const { result } = renderHook(() => useUndoable(commit, 1000));

    act(() => {
      result.current.schedule('a');
      result.current.schedule('b');
      result.current.schedule('a');
    });
    expect(result.current.pending).toEqual(['a', 'b']);

    act(() => result.current.undo('b'));
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('a');
    expect(result.current.pending).toEqual([]);
  });

  it('keeps the item hidden until a failed commit settles', async () => {
    const commit = vi.fn(() => Promise.reject(new Error('offline')));
    const { result } = renderHook(() => useUndoable(commit, 10));
    act(() => result.current.schedule('a'));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(result.current.pending).toEqual([]);
  });

  it('flushes scheduled commits on unmount', () => {
    const commit = vi.fn(async () => undefined);
    const { result, unmount } = renderHook(() => useUndoable(commit, 5000));
    act(() => result.current.schedule('a'));
    unmount();
    expect(commit).toHaveBeenCalledWith('a');
  });
});
