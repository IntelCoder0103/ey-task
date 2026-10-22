import cors from 'cors';
import express from 'express';
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

  return express()
    .disable('x-powered-by')
    .use(helmet())
    .use(cors({ origin: corsOrigin ? corsOrigin.split(',') : false }))
    .use(express.json({ limit: '100kb' }))
    .get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    })
    .use(authRoutes({ store, passwordRounds, now, guard }))
    .use('/tasks', guard, taskRoutes({ store, now }))
    .use(() => {
      throw httpError(404, 'Route not found.');
    })
    .use(errorHandler(onError));
};
