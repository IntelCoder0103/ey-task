import { delay, http, HttpResponse, type DefaultBodyType, type PathParams, type StrictRequest } from 'msw';
import type { Task, TaskPatch } from '../api/schemas';
import { objectId, type Db, type StoredUser } from './db';

type Options = { base: string; latency?: number };

type AuthedContext = {
  request: StrictRequest<DefaultBodyType>;
  params: PathParams;
  user: StoredUser;
  token: string;
};

const fail = (status: number, error: string) => HttpResponse.json({ error }, { status });

const publicUser = ({ _id, name, email, age, createdAt, updatedAt }: StoredUser) => ({
  _id,
  name,
  email,
  age,
  createdAt,
  updatedAt,
});

const readJson = async <T>(request: Request): Promise<Partial<T>> => {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {};
  }
};

const token = () => `mock.${objectId()}${objectId()}`;
const now = () => new Date().toISOString();

type Registration = Pick<StoredUser, 'name' | 'email' | 'password' | 'age'>;

const parseRegistration = ({
  name,
  email,
  password,
  age,
}: Partial<StoredUser>): { error: string } | { value: Registration } => {
  if (!name?.trim()) return { error: 'Please tell us your name.' };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Email is invalid' };
  if (!password || password.length < 7) return { error: 'Password must be at least 7 characters' };
  if (password.toLowerCase().includes('password')) return { error: 'Password cannot contain "password"' };
  return {
    value: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      age: typeof age === 'number' ? age : 0,
    },
  };
};

export const createHandlers = (db: Db, { base, latency = 0 }: Options) => {
  const url = (path: string) => `${base.replace(/\/+$/, '')}${path}`;

  const findUser = (request: Request) => {
    const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const user = bearer ? db.read().users.find(({ tokens }) => tokens.includes(bearer)) : undefined;
    return user && bearer ? { user, token: bearer } : null;
  };

  const authed =
    (resolver: (context: AuthedContext) => Response | Promise<Response>) =>
    async ({ request, params }: { request: StrictRequest<DefaultBodyType>; params: PathParams }) => {
      await delay(latency);
      const found = findUser(request);
      return found ? resolver({ request, params, ...found }) : fail(401, 'Please authenticate.');
    };

  const updateUser = (id: string, change: (user: StoredUser) => StoredUser) =>
    db.commit({
      ...db.read(),
      users: db.read().users.map((user) => (user._id === id ? change(user) : user)),
    });

  const ownedTask = (user: StoredUser, id: unknown) =>
    db.read().tasks.find((task) => task._id === id && task.owner === user._id);

  return [
    http.post(url('/user/register'), async ({ request }) => {
      await delay(latency);
      const parsed = parseRegistration(await readJson<StoredUser>(request));
      if ('error' in parsed) return fail(400, parsed.error);
      if (db.read().users.some((user) => user.email === parsed.value.email)) {
        return fail(400, 'That email is already on the list.');
      }
      const issued = token();
      const user: StoredUser = {
        ...parsed.value,
        _id: objectId(),
        tokens: [issued],
        createdAt: now(),
        updatedAt: now(),
      };
      db.commit({ ...db.read(), users: [...db.read().users, user] });
      return HttpResponse.json({ user: publicUser(user), token: issued }, { status: 201 });
    }),

    http.post(url('/user/login'), async ({ request }) => {
      await delay(latency);
      const { email, password } = await readJson<StoredUser>(request);
      const user = db
        .read()
        .users.find(
          (candidate) => candidate.email === email?.trim().toLowerCase() && candidate.password === password,
        );
      if (!user) return fail(400, 'Unable to login');
      const issued = token();
      updateUser(user._id, (current) => ({ ...current, tokens: [...current.tokens, issued] }));
      return HttpResponse.json({ user: publicUser(user), token: issued });
    }),

    http.post(
      url('/user/logout'),
      authed(({ user, token: current }) => {
        updateUser(user._id, (stored) => ({ ...stored, tokens: stored.tokens.filter((t) => t !== current) }));
        return HttpResponse.json({ success: true });
      }),
    ),

    http.get(
      url('/user/me'),
      authed(({ user }) => HttpResponse.json(publicUser(user))),
    ),

    http.get(
      url('/task'),
      authed(({ request, user }) => {
        const params = new URL(request.url).searchParams;
        const completed = params.get('completed');
        const skip = Number(params.get('skip') ?? 0);
        const limit = Number(params.get('limit') ?? 0);
        const owned = db
          .read()
          .tasks.filter((task) => task.owner === user._id)
          .filter((task) => completed === null || String(task.completed) === completed);
        const data = owned.slice(skip, limit > 0 ? skip + limit : undefined);
        return HttpResponse.json({ count: data.length, data });
      }),
    ),

    http.post(
      url('/task'),
      authed(async ({ request, user }) => {
        const { description } = await readJson<Task>(request);
        if (typeof description !== 'string' || !description.trim()) {
          return fail(400, 'Task validation failed: description is required');
        }
        const task: Task = {
          _id: objectId(),
          description: description.trim(),
          completed: false,
          owner: user._id,
          createdAt: now(),
          updatedAt: now(),
        };
        db.commit({ ...db.read(), tasks: [...db.read().tasks, task] });
        return HttpResponse.json({ success: true, data: task }, { status: 201 });
      }),
    ),

    http.get(
      url('/task/:id'),
      authed(({ params, user }) => {
        const task = ownedTask(user, params.id);
        return task ? HttpResponse.json({ success: true, data: task }) : fail(404, 'Task not found');
      }),
    ),

    http.put(
      url('/task/:id'),
      authed(async ({ request, params, user }) => {
        const patch = await readJson<TaskPatch & Record<string, unknown>>(request);
        const allowed = ['description', 'completed'];
        if (Object.keys(patch).some((key) => !allowed.includes(key))) return fail(400, 'Invalid updates!');
        const task = ownedTask(user, params.id);
        if (!task) return fail(404, 'Task not found');
        const updated: Task = { ...task, ...patch, updatedAt: now() };
        db.commit({
          ...db.read(),
          tasks: db.read().tasks.map((candidate) => (candidate._id === task._id ? updated : candidate)),
        });
        return HttpResponse.json({ success: true, data: updated });
      }),
    ),

    http.delete(
      url('/task/:id'),
      authed(({ params, user }) => {
        const task = ownedTask(user, params.id);
        if (!task) return fail(404, 'Task not found');
        db.commit({ ...db.read(), tasks: db.read().tasks.filter((candidate) => candidate._id !== task._id) });
        return HttpResponse.json({ success: true, data: task });
      }),
    ),
  ];
};
