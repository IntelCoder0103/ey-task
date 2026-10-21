import { setupWorker } from 'msw/browser';
import { apiBase } from '../api/config';
import { readJson, writeJson } from '../lib/storage';
import { createDb, type DbState } from './db';
import { createHandlers } from './handlers';

const KEY = 'atelier:mock-db';

const db = createDb({
  load: () => readJson<DbState | null>(KEY, null),
  save: (state) => writeJson(KEY, state),
});

export const startMockApi = () =>
  setupWorker(...createHandlers(db, { base: apiBase, latency: 280 })).start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
