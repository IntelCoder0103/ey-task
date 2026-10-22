import { z } from 'zod';
import { apiBase } from './config';
import { createHttp } from './http';
import {
  AuthResponse,
  Task,
  TaskPage,
  User,
  type Credentials,
  type Registration,
  type TaskPatch,
} from './schemas';
import { session } from './session';

const http = createHttp({ baseUrl: apiBase, getToken: session.get, onUnauthorized: session.clear });

const rows = ({ data }: { data: Task[] }) => data;
const taskPath = (id: string) => `/tasks/${encodeURIComponent(id)}`;

export const authApi = {
  login: (credentials: Credentials) =>
    http('/auth/login', { method: 'POST', body: credentials, schema: AuthResponse }),
  register: (registration: Registration) =>
    http('/auth/register', { method: 'POST', body: registration, schema: AuthResponse }),
  me: () => http('/users/me', { schema: User }),
  logout: () => http('/auth/logout', { method: 'POST', schema: z.unknown() }),
};

export const tasksApi = {
  list: ({ q, signal }: { q?: string; signal?: AbortSignal } = {}) =>
    http('/tasks', { query: { q: q || undefined }, signal, schema: TaskPage }).then(rows),
  get: (id: string, signal?: AbortSignal) => http(taskPath(id), { signal, schema: Task }),
  create: (description: string) => http('/tasks', { method: 'POST', body: { description }, schema: Task }),
  update: (id: string, patch: TaskPatch) =>
    http(taskPath(id), { method: 'PATCH', body: patch, schema: Task }),
  reorder: (ids: string[]) =>
    http('/tasks/order', { method: 'PUT', body: { ids }, schema: TaskPage }).then(rows),
  remove: (id: string) => http(taskPath(id), { method: 'DELETE', schema: z.unknown() }).then(() => id),
};
