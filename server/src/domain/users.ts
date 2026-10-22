import type { State, User } from './types';

export const findByEmail = (users: User[], email: string) => users.find((user) => user.email === email);

export const toPublicUser = ({ id, name, email, age, createdAt, updatedAt }: User) => ({
  id,
  name,
  email,
  ...(age === undefined ? {} : { age }),
  createdAt,
  updatedAt,
});

export const addSession = (state: State, userId: string, tokenHash: string, createdAt: string): State => ({
  ...state,
  sessions: [...state.sessions, { tokenHash, userId, createdAt }],
});

export const removeSession = (state: State, tokenHash: string): State => ({
  ...state,
  sessions: state.sessions.filter((session) => session.tokenHash !== tokenHash),
});
