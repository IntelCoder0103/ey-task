import type { RequestHandler, Response } from 'express';
import { digest } from '../domain/security';
import type { User } from '../domain/types';
import type { Store } from '../store/store';
import { httpError } from './errors';

export type Auth = { user: User; tokenHash: string };

type Options = { store: Store; sessionTtlMs: number; now: () => Date };

const bearer = (header = '') => {
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

export const requireAuth =
  ({ store, sessionTtlMs, now }: Options): RequestHandler =>
  (req, res, next) => {
    const token = bearer(req.get('Authorization'));
    if (!token) throw httpError(401, 'Please sign in.');

    const tokenHash = digest(token);
    const { sessions, users } = store.read();
    const session = sessions.find((candidate) => candidate.tokenHash === tokenHash);
    const live = session && Date.parse(session.createdAt) + sessionTtlMs > now().getTime();
    const user = live ? users.find((candidate) => candidate.id === session.userId) : undefined;
    if (!user) throw httpError(401, 'Your session has expired. Please sign in again.');

    res.locals.auth = { user, tokenHash } satisfies Auth;
    next();
  };

export const authOf = (res: Response) => res.locals.auth as Auth;
