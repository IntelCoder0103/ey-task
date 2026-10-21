import { z } from 'zod';
import { apiBase } from './config';
import { createHttp } from './http';
import {
  AuthResponse,
  TaskEnvelope,
  TaskList,
  User,
  type Credentials,
  type Registration,
  type TaskPatch,
} from './schemas';
import { session } from './session';

const http = createHttp({ baseUrl: apiBase, getToken: session.get, onUnauthorized: session.clear });

const unwrap = <T>({ data }: { data: T }) => data;
const taskPath = (id: string) => `/task/${encodeURIComponent(id)}`;

export const authApi = {
  login: (credentials: Credentials) =>
    http('/user/login', { method: 'POST', body: credentials, schema: AuthResponse }),
  register: (registration: Registration) =>
    http('/user/register', { method: 'POST', body: registration, schema: AuthResponse }),
  me: () => http('/user/me', { schema: User }),
  logout: () => http('/user/logout', { method: 'POST', schema: z.unknown() }),
};

export const tasksApi = {
  list: () => http('/task', { schema: TaskList }).then(unwrap),
  get: (id: string) => http(taskPath(id), { schema: TaskEnvelope }).then(unwrap),
  create: (description: string) =>
    http('/task', { method: 'POST', body: { description }, schema: TaskEnvelope }).then(unwrap),
  update: (id: string, patch: TaskPatch) =>
    http(taskPath(id), { method: 'PUT', body: patch, schema: TaskEnvelope }).then(unwrap),
  remove: (id: string) => http(taskPath(id), { method: 'DELETE', schema: z.unknown() }).then(() => id),
};
