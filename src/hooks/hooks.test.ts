import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';
import { useUndoable } from './useUndoable';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only settles on the latest value once input pauses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'l' },
    });
    rerender({ value: 'li' });
    act(() => vi.advanceTimersByTime(150));
    rerender({ value: 'lin' });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe('l');

    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe('lin');
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

  it('flush commits everything pending right away', async () => {
    const commit = vi.fn(async () => undefined);
    const { result } = renderHook(() => useUndoable(commit, 5000));
    act(() => {
      result.current.schedule('a');
      result.current.schedule('b');
    });

    await act(() => result.current.flush());

    expect(commit.mock.calls).toEqual([['a'], ['b']]);
    expect(result.current.pending).toEqual([]);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(commit).toHaveBeenCalledTimes(2);
  });
});
