import { readJson, removeKey, writeJson } from '../lib/storage';

type Listener = () => void;

export const createSession = (key: string) => {
  let token = readJson<string | null>(key, null);
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((listener) => listener());

  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    token = readJson<string | null>(key, null);
    emit();
  });

  return {
    get: () => token,
    set: (next: string) => {
      token = next;
      writeJson(key, next);
      emit();
    },
    clear: () => {
      if (token === null) return;
      token = null;
      removeKey(key);
      emit();
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const session = createSession('atelier:token');
