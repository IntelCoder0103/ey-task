import { http, HttpResponse } from 'msw';
import { DEMO } from '../demo';
import { network } from '../test/network';
import { authApi, tasksApi } from './client';
import { apiBase } from './config';
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

  it('rejects bad credentials with 401 and the server message', async () => {
    await expect(authApi.login({ email: DEMO.email, password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password.',
    });
  });

  it('registers a new user and rejects duplicates with 409', async () => {
    const registration = { name: 'Ines', email: 'ines@atelier.studio', password: 'seamstress', age: 31 };
    await expect(authApi.register(registration)).resolves.toMatchObject({ user: { name: 'Ines' } });
    await expect(authApi.register(registration)).rejects.toMatchObject({ status: 409 });
  });

  it.each([
    [{ name: '', email: 'a@b.co', password: 'longenough' }, 'Name is required.'],
    [{ name: 'A', email: 'nope', password: 'longenough' }, 'Email is invalid.'],
    [{ name: 'A', email: 'a@b.co', password: 'short' }, 'Password must be at least 7 characters.'],
  ])('surfaces server validation (%o)', async (registration, message) => {
    await expect(authApi.register(registration)).rejects.toMatchObject({ status: 400, message });
  });
});

describe('tasksApi', () => {
  beforeEach(signIn);

  it('runs the full CRUD cycle', async () => {
    const before = await tasksApi.list();
    const created = await tasksApi.create('Steam the silk blouse');
    expect(created).toMatchObject({
      description: 'Steam the silk blouse',
      completed: false,
      position: before.length,
    });

    await expect(tasksApi.get(created.id)).resolves.toEqual(created);
    await expect(tasksApi.update(created.id, { completed: true })).resolves.toMatchObject({
      completed: true,
    });
    await expect(tasksApi.list()).resolves.toHaveLength(before.length + 1);

    await expect(tasksApi.remove(created.id)).resolves.toBe(created.id);
    await expect(tasksApi.get(created.id)).rejects.toMatchObject({ status: 404 });
  });

  it('searches on the server', async () => {
    const found = await tasksApi.list({ q: 'tailor' });
    expect(found.map((task) => task.description)).toEqual(['Call the tailor about the trouser hem']);
  });

  it('persists a new order', async () => {
    const ids = (await tasksApi.list()).map((task) => task.id);
    const reversed = [...ids].reverse();
    await expect(tasksApi.reorder(reversed)).resolves.toMatchObject(
      reversed.map((id, position) => ({ id, position })),
    );
    expect((await tasksApi.list()).map((task) => task.id)).toEqual(reversed);
  });

  it('rejects fields the API does not allow', async () => {
    const [first] = await tasksApi.list();
    await expect(
      tasksApi.update(first!.id, { owner: 'someone-else' } as unknown as { completed: boolean }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects empty descriptions', async () => {
    await expect(tasksApi.create('   ')).rejects.toMatchObject({
      status: 400,
      message: 'Description is required.',
    });
  });

  it('ends the session when the server revokes the token', async () => {
    network.use(http.get(`${apiBase}/tasks`, () => HttpResponse.json({}, { status: 401 })));
    await expect(tasksApi.list()).rejects.toMatchObject({ status: 401 });
    expect(session.get()).toBeNull();
  });
});
