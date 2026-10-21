import { http, HttpResponse } from 'msw';
import { DEMO } from '../mocks/db';
import { server } from '../mocks/server';
import { apiBase } from './config';
import { authApi, tasksApi } from './client';
import { session } from './session';

const signIn = async () => {
  const { token } = await authApi.login(DEMO);
  session.set(token);
};

describe('authApi', () => {
  it('logs in, reads the profile and logs out', async () => {
    const { user, token } = await authApi.login(DEMO);
    expect(user.email).toBe(DEMO.email);

    session.set(token);
    await expect(authApi.me()).resolves.toMatchObject({ email: DEMO.email });

    await authApi.logout();
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 });
    expect(session.get()).toBeNull();
  });

  it('rejects bad credentials with the server message', async () => {
    await expect(authApi.login({ email: DEMO.email, password: 'wrong' })).rejects.toMatchObject({
      status: 400,
      message: 'Unable to login',
    });
  });

  it('registers a new user and rejects duplicates', async () => {
    const registration = { name: 'Ines', email: 'ines@atelier.studio', password: 'seamstress', age: 31 };
    await expect(authApi.register(registration)).resolves.toMatchObject({ user: { name: 'Ines' } });
    await expect(authApi.register(registration)).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    [{ name: '', email: 'a@b.co', password: 'longenough' }, 'name'],
    [{ name: 'A', email: 'nope', password: 'longenough' }, 'Email'],
    [{ name: 'A', email: 'a@b.co', password: 'short' }, '7 characters'],
    [{ name: 'A', email: 'a@b.co', password: 'mypassword1' }, '"password"'],
  ])('validates registrations (%o)', async (registration, fragment) => {
    const error = await authApi.register(registration).catch((e: Error) => e);
    expect((error as Error).message).toContain(fragment);
  });
});

describe('tasksApi', () => {
  beforeEach(signIn);

  it('runs the full CRUD cycle', async () => {
    const before = await tasksApi.list();
    const created = await tasksApi.create('Steam the silk blouse');
    expect(created).toMatchObject({ description: 'Steam the silk blouse', completed: false });

    await expect(tasksApi.get(created._id)).resolves.toEqual(created);
    await expect(tasksApi.update(created._id, { completed: true })).resolves.toMatchObject({
      completed: true,
    });
    await expect(tasksApi.list()).resolves.toHaveLength(before.length + 1);

    await expect(tasksApi.remove(created._id)).resolves.toBe(created._id);
    await expect(tasksApi.get(created._id)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects updates to fields the API does not allow', async () => {
    const [first] = await tasksApi.list();
    await expect(
      tasksApi.update(first!._id, { owner: 'someone-else' } as unknown as { completed: boolean }),
    ).rejects.toMatchObject({ message: 'Invalid updates!' });
  });

  it('rejects empty descriptions', async () => {
    await expect(tasksApi.create('   ')).rejects.toMatchObject({ status: 400 });
  });

  it('ends the session when the server revokes the token', async () => {
    server.use(http.get(`${apiBase}/task`, () => HttpResponse.json({}, { status: 401 })));
    await expect(tasksApi.list()).rejects.toMatchObject({ status: 401 });
    expect(session.get()).toBeNull();
  });
});
