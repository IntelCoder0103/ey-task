import { setupServer } from 'msw/node';
import { apiBase } from '../api/config';
import { createDb } from './db';
import { createHandlers } from './handlers';

export const db = createDb();

export const server = setupServer(...createHandlers(db, { base: apiBase }));
