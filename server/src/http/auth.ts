import type { RequestHandler, Response } from 'express';
import { digest } from '../domain/security';
import type { User } from '../domain/types';
import type { Store } from '../store/store';
import { httpError } from './errors';

export type Auth = { user: User; tokenHash: string };

type Options = { store: Store; sessionTtlMs: number; now: () => Date };

const bearer = (header = '') => /^Bearer\s+(\S+)$/i.exec(header.trim())?.[1] ?? null;

export const isLive = (createdAt: string, sessionTtlMs: number, now: Date) =>
  Date.parse(createdAt) + sessionTtlMs > now.getTime();

export const requireAuth =
  ({ store, sessionTtlMs, now }: Options): RequestHandler =>
  (req, res, next) => {
    const token = bearer(req.get('Authorization'));
    if (!token) throw httpError(401, 'Please sign in.');

    const tokenHash = digest(token);
    const { sessions, users } = store.read();
    const session = sessions.find((candidate) => candidate.tokenHash === tokenHash);
    const user =
      session && isLive(session.createdAt, sessionTtlMs, now())
        ? users.find((candidate) => candidate.id === session.userId)
        : undefined;
    if (!user) throw httpError(401, 'Your session has expired. Please sign in again.');

    res.locals.auth = { user, tokenHash } satisfies Auth;
    next();
  };

export const authOf = (res: Response) => res.locals.auth as Auth;
