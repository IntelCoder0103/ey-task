import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

export const usePersistentState = <T>(key: string, fallback: T) => {
  const [state, setState] = useState(() => ({ key, value: readJson(key, fallback) }));

  if (state.key !== key) setState({ key, value: readJson(key, fallback) });

  useEffect(() => writeJson(state.key, state.value), [state]);

  const value = state.key === key ? state.value : fallback;
  const update = (next: T) => setState({ key, value: next });

  return [value, update] as const;
};
