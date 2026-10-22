import { bypass, http } from 'msw';
import { setupServer } from 'msw/node';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../server/src/app';
import { seedDemo } from '../../server/src/seed';
import { createStore } from '../../server/src/store/store';
import { apiBase } from '../api/config';

const seeded = await seedDemo({ rounds: 4 });
const store = await createStore(undefined, seeded);
const listener = createApp({ store, passwordRounds: 4 }).listen(0, '127.0.0.1');
await new Promise((resolve) => listener.once('listening', resolve));
const origin = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;

export const backend = {
  store,
  reset: () => store.update(() => [seeded, null] as const),
  close: () => new Promise((resolve) => listener.close(resolve)),
  ordered: () =>
    [...store.read().tasks]
      .filter((task) => task.owner === seeded.users[0]?.id)
      .sort((a, b) => a.position - b.position),
};

const forward = async (request: Request) => {
  const url = new URL(request.url);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const target = `${origin}${url.pathname.slice(new URL(apiBase).pathname.length)}${url.search}`;
  return fetch(bypass(target, { method: request.method, headers: request.headers, body }));
};

export const network = setupServer(http.all(`${apiBase}/*`, ({ request }) => forward(request)));
