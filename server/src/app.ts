import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { requireAuth } from './http/auth';
import { errorHandler } from './http/errorHandler';
import { httpError } from './http/errors';
import { authRoutes } from './routes/auth';
import { taskRoutes } from './routes/tasks';
import type { Store } from './store/store';

export type AppOptions = {
  store: Store;
  passwordRounds?: number;
  sessionTtlMs?: number;
  corsOrigin?: string;
  now?: () => Date;
  onError?: (error: unknown) => void;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const createApp = ({
  store,
  passwordRounds = 10,
  sessionTtlMs = WEEK_MS,
  corsOrigin,
  now = () => new Date(),
  onError = () => undefined,
}: AppOptions) => {
  const guard = requireAuth({ store, sessionTtlMs, now });
  const origins = (corsOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const api = Router()
    .get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    })
    .use(authRoutes({ store, passwordRounds, sessionTtlMs, now, guard }))
    .use('/tasks', guard, taskRoutes({ store, now }));

  return express()
    .disable('x-powered-by')
    .use(helmet())
    .use(cors({ origin: origins.length > 0 ? origins : false }))
    .use(express.json({ limit: '100kb' }))
    .use('/api', api)
    .use(api)
    .use(() => {
      throw httpError(404, 'Route not found.');
    })
    .use(errorHandler(onError));
};
