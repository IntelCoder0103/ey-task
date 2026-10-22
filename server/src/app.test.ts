import request from 'supertest';
import { createApp } from './app';
import { DEMO, seedDemo } from './seed';
import { createStore } from './store/store';

const ROUNDS = 4;

const setup = async ({ sessionTtlMs, now }: { sessionTtlMs?: number; now?: () => Date } = {}) => {
  const store = await createStore(undefined, await seedDemo({ rounds: ROUNDS }));
  const api = request(createApp({ store, passwordRounds: ROUNDS, sessionTtlMs, now }));
  const login = async (credentials: { email: string; password: string } = DEMO) => {
    const { body } = await api.post('/auth/login').send(credentials).expect(200);
    return { Authorization: `Bearer ${body.token as string}` };
  };
  return { store, api, login };
};

describe('platform', () => {
  it('reports health and answers unknown routes with JSON 404s', async () => {
    const { api } = await setup();
    await api.get('/health').expect(200, { status: 'ok' });
    await api.get('/nope').expect(404, { error: 'Route not found.' });
  });

  it('rejects malformed JSON with 400', async () => {
    const { api } = await setup();
    await api
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400, { error: 'Malformed JSON body.' });
  });
});

describe('auth', () => {
  it('registers, returns a usable token and never leaks the password hash', async () => {
    const { api } = await setup();
    const { body } = await api
      .post('/auth/register')
      .send({ name: 'Ines', email: 'Ines@Atelier.Studio', password: 'seamstress', age: 31 })
      .expect(201);

    expect(body.user).toMatchObject({ name: 'Ines', email: 'ines@atelier.studio', age: 31 });
    expect(body.user).not.toHaveProperty('passwordHash');
    await api.get('/users/me').set('Authorization', `Bearer ${body.token}`).expect(200);
  });

  it('validates registrations with field details', async () => {
    const { api } = await setup();
    const { body } = await api.post('/auth/register').send({ email: 'nope', password: 'short' }).expect(400);
    expect(body.error).toBe('Name is required.');
    expect(body.details.map((issue: { path: string }) => issue.path)).toEqual(['name', 'email', 'password']);
  });

  it('refuses duplicate emails with 409', async () => {
    const { api } = await setup();
    await api
      .post('/auth/register')
      .send({ name: 'Copy', email: DEMO.email.toUpperCase(), password: 'longenough' })
      .expect(409);
  });

  it('logs in, and rejects bad credentials with 401', async () => {
    const { api } = await setup();
    await api.post('/auth/login').send(DEMO).expect(200);
    await api
      .post('/auth/login')
      .send({ ...DEMO, password: 'wrong' })
      .expect(401, { error: 'Invalid email or password.' });
    await api.post('/auth/login').send({ email: 'ghost@x.io', password: 'whatever' }).expect(401);
    await api.post('/auth/login').send({ email: DEMO.email }).expect(400);
  });

  it('revokes the token on logout', async () => {
    const { api, login } = await setup();
    const auth = await login();
    await api.post('/auth/logout').set(auth).expect(204);
    await api.get('/users/me').set(auth).expect(401);
  });

  it('requires a valid, unexpired bearer token', async () => {
    let clock = new Date('2026-10-21T00:00:00Z');
    const { api, login } = await setup({ sessionTtlMs: 60_000, now: () => clock });
    await api.get('/users/me').expect(401, { error: 'Please sign in.' });
    await api.get('/users/me').set('Authorization', 'Bearer forged').expect(401);
    await api.get('/users/me').set('Authorization', 'Basic abc').expect(401);

    const auth = await login();
    await api.get('/users/me').set(auth).expect(200);
    clock = new Date(clock.getTime() + 60_001);
    await api.get('/users/me').set(auth).expect(401);
  });
});

describe('tasks', () => {
  it('requires authentication', async () => {
    const { api } = await setup();
    await api.get('/tasks').expect(401);
  });

  it('lists the user’s tasks in position order', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const { body } = await api.get('/tasks').set(auth).expect(200);
    expect(body.total).toBe(5);
    expect(body.data.map((task: { position: number }) => task.position)).toEqual([0, 1, 2, 3, 4]);
    expect(body.data[0]).not.toHaveProperty('owner');
  });

  it('searches, filters and paginates', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const search = await api.get('/tasks').query({ q: 'LINEN' }).set(auth).expect(200);
    expect(search.body.data.map((task: { description: string }) => task.description)).toEqual([
      'Return the linen swatches to the mill',
    ]);

    const done = await api.get('/tasks').query({ completed: 'true' }).set(auth).expect(200);
    expect(done.body.total).toBe(2);

    const page = await api.get('/tasks').query({ limit: 2, skip: 4 }).set(auth).expect(200);
    expect(page.body).toMatchObject({ total: 5, data: [{ position: 4 }] });

    await api.get('/tasks').query({ limit: 0 }).set(auth).expect(400);
  });

  it('creates tasks at the end of the list', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const { body } = await api
      .post('/tasks')
      .set(auth)
      .send({ description: '  Steam the silk blouse  ' })
      .expect(201);
    expect(body).toMatchObject({ description: 'Steam the silk blouse', completed: false, position: 5 });

    await api.get(`/tasks/${body.id}`).set(auth).expect(200);
    await api.post('/tasks').set(auth).send({ description: '   ' }).expect(400);
  });

  it('updates only allowed fields', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const [first] = (await api.get('/tasks').set(auth)).body.data;

    const { body } = await api
      .patch(`/tasks/${first.id}`)
      .set(auth)
      .send({ completed: false, description: 'Refit the overcoat' })
      .expect(200);
    expect(body).toMatchObject({ completed: false, description: 'Refit the overcoat' });
    expect(body.updatedAt > first.updatedAt).toBe(true);

    await api.patch(`/tasks/${first.id}`).set(auth).send({ owner: 'me' }).expect(400);
    const empty = await api.patch(`/tasks/${first.id}`).set(auth).send({}).expect(400);
    expect(empty.body.error).toBe('Nothing to update.');
    await api.patch('/tasks/missing').set(auth).send({ completed: true }).expect(404);
  });

  it('reorders with a full permutation of ids', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const ids: string[] = (await api.get('/tasks').set(auth)).body.data.map(
      (task: { id: string }) => task.id,
    );
    const reversed = [...ids].reverse();

    const { body } = await api.put('/tasks/order').set(auth).send({ ids: reversed }).expect(200);
    expect(body.data.map((task: { id: string }) => task.id)).toEqual(reversed);

    await api
      .put('/tasks/order')
      .set(auth)
      .send({ ids: reversed.slice(1) })
      .expect(400, { error: 'ids must list every task exactly once.' });
  });

  it('deletes and closes the gap in positions', async () => {
    const { api, login } = await setup();
    const auth = await login();
    const [, second] = (await api.get('/tasks').set(auth)).body.data;

    await api.delete(`/tasks/${second.id}`).set(auth).expect(204);
    await api.delete(`/tasks/${second.id}`).set(auth).expect(404);
    const { body } = await api.get('/tasks').set(auth);
    expect(body.data.map((task: { position: number }) => task.position)).toEqual([0, 1, 2, 3]);
  });

  it('keeps every user’s tasks private', async () => {
    const { api, login } = await setup();
    const demo = await login();
    const [mine] = (await api.get('/tasks').set(demo)).body.data;

    const { body } = await api
      .post('/auth/register')
      .send({ name: 'Eve', email: 'eve@x.io', password: 'curious1' })
      .expect(201);
    const eve = { Authorization: `Bearer ${body.token}` };

    await api.get('/tasks').set(eve).expect(200, { data: [], total: 0 });
    await api.get(`/tasks/${mine.id}`).set(eve).expect(404);
    await api.patch(`/tasks/${mine.id}`).set(eve).send({ completed: true }).expect(404);
    await api.delete(`/tasks/${mine.id}`).set(eve).expect(404);
  });
});
