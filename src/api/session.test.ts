import { createSession } from './session';

describe('createSession', () => {
  it('restores a persisted token', () => {
    localStorage.setItem('s', JSON.stringify('abc'));
    expect(createSession('s').get()).toBe('abc');
  });

  it('persists and notifies on set and clear', () => {
    const session = createSession('s');
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.set('xyz');
    expect(session.get()).toBe('xyz');
    expect(localStorage.getItem('s')).toBe('"xyz"');

    session.clear();
    expect(session.get()).toBeNull();
    expect(localStorage.getItem('s')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    session.set('again');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores clearing an empty session', () => {
    const session = createSession('s');
    const listener = vi.fn();
    session.subscribe(listener);
    session.clear();
    expect(listener).not.toHaveBeenCalled();
  });
});
