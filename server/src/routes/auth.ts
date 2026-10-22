import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { digest, hashPassword, issueToken, verifyPassword } from '../domain/security';
import type { State, User } from '../domain/types';
import { addSession, findByEmail, pruneSessions, removeSession, toPublicUser } from '../domain/users';
import { authOf, isLive } from '../http/auth';
import { httpError } from '../http/errors';
import { reply, route } from '../http/route';
import type { Store } from '../store/store';

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Email is invalid.');

const Credentials = z.object({
  email,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

const Registration = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .trim()
    .min(1, 'Name is required.')
    .max(80, 'Keep the name to 80 characters or fewer.'),
  email,
  password: z
    .string({ required_error: 'Password is required.' })
    .min(7, 'Password must be at least 7 characters.')
    .max(200, 'Keep the password to 200 characters or fewer.'),
  age: z
    .number()
    .int('Age must be a whole number.')
    .min(0, 'Age must be 0 or more.')
    .max(150, 'Age must be 150 or less.')
    .optional(),
});

type Deps = {
  store: Store;
  passwordRounds: number;
  sessionTtlMs: number;
  now: () => Date;
  guard: RequestHandler;
};

const emailTaken = () => httpError(409, 'That email is already registered.');

export const authRoutes = ({ store, passwordRounds, sessionTtlMs, now, guard }: Deps) => {
  const decoyHash = hashPassword('decoy-password', passwordRounds);

  const startSession = (state: State, userId: string) => {
    const token = issueToken();
    const current = now();
    const pruned = pruneSessions(state, (session) => isLive(session.createdAt, sessionTtlMs, current));
    return [addSession(pruned, userId, digest(token), current.toISOString()), token] as const;
  };

  return Router()
    .post(
      '/auth/register',
      route({ body: Registration }, async ({ body: { password, ...profile } }) => {
        if (findByEmail(store.read().users, profile.email)) throw emailTaken();
        const passwordHash = await hashPassword(password, passwordRounds);
        const timestamp = now().toISOString();

        const session = await store.update((state) => {
          if (findByEmail(state.users, profile.email)) throw emailTaken();
          const user: User = {
            id: randomUUID(),
            ...profile,
            passwordHash,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          const [next, token] = startSession({ ...state, users: [...state.users, user] }, user.id);
          return [next, { user: toPublicUser(user), token }] as const;
        });
        return reply.created(session);
      }),
    )
    .post(
      '/auth/login',
      route({ body: Credentials }, async ({ body }) => {
        const user = findByEmail(store.read().users, body.email);
        const valid = await verifyPassword(body.password, user?.passwordHash ?? (await decoyHash));
        if (!user || !valid) throw httpError(401, 'Invalid email or password.');

        const token = await store.update((state) => startSession(state, user.id));
        return reply.ok({ user: toPublicUser(user), token });
      }),
    )
    .post(
      '/auth/logout',
      guard,
      route({}, (_input, res) =>
        store.update((state) => [removeSession(state, authOf(res).tokenHash), reply.noContent()] as const),
      ),
    )
    .get(
      '/users/me',
      guard,
      route({}, (_input, res) => reply.ok(toPublicUser(authOf(res).user))),
    );
};
