import { z } from 'zod';
import { createHttp, isApiError } from './http';

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const setup = (response: Response | Error, token: string | null = 'tkn') => {
  const fetch = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const onUnauthorized = vi.fn();
  const http = createHttp({ baseUrl: 'https://api.test/', getToken: () => token, onUnauthorized, fetch });
  return { http, fetch, onUnauthorized };
};

const Thing = z.object({ id: z.number() });

describe('createHttp', () => {
  it('joins the base url, encodes query params and sends auth + json headers', async () => {
    const { http, fetch } = setup(json(200, { id: 1 }));
    await http('/task', {
      method: 'POST',
      body: { a: 1 },
      query: { completed: true, skip: undefined },
      schema: Thing,
    });

    expect(fetch).toHaveBeenCalledWith('https://api.test/task?completed=true', {
      method: 'POST',
      headers: { Authorization: 'Bearer tkn', 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it('omits the auth header without a token', async () => {
    const { http, fetch } = setup(json(200, { id: 1 }), null);
    await http('/user/login', { schema: Thing });
    expect(fetch).toHaveBeenCalledWith('https://api.test/user/login', { method: 'GET', headers: {} });
  });

  it('parses the body through the schema', async () => {
    const { http } = setup(json(200, { id: 7, extra: 'dropped' }));
    await expect(http('/x', { schema: Thing })).resolves.toEqual({ id: 7 });
  });

  it('tolerates empty bodies', async () => {
    const { http } = setup(new Response(null, { status: 200 }));
    await expect(http('/x', { schema: z.unknown() })).resolves.toBeNull();
  });

  it('surfaces server error messages', async () => {
    const { http } = setup(json(400, { error: 'Invalid updates!' }));
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({
      status: 400,
      message: 'Invalid updates!',
    });
  });

  it('accepts plain-text error bodies', async () => {
    const { http } = setup(new Response('Nope', { status: 400 }));
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({ message: 'Nope' });
  });

  it.each([
    [404, 'out of print'],
    [500, 'having a moment'],
    [422, 'didn’t fit'],
  ])('falls back to a friendly message for %i', async (status, fragment) => {
    const { http } = setup(json(status, {}));
    const error = await http('/x', { schema: Thing }).catch((e: unknown) => e);
    expect(isApiError(error) && error.message).toContain(fragment);
  });

  it('ends the session on 401 when a token was sent', async () => {
    const { http, onUnauthorized } = setup(json(401, { error: 'Please authenticate.' }));
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not end a session that never existed', async () => {
    const { http, onUnauthorized } = setup(json(401, {}), null);
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('maps network failures', async () => {
    const { http } = setup(new TypeError('Failed to fetch'));
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({ status: 0 });
  });

  it('rejects responses that break the contract', async () => {
    const { http } = setup(json(200, { id: 'one' }));
    await expect(http('/x', { schema: Thing })).rejects.toMatchObject({ status: 502 });
  });
});
