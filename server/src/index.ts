import { createApp } from './app';
import { readConfig } from './config';
import { seedDemo } from './seed';
import { filePersistence } from './store/file';
import { createStore } from './store/store';

const config = readConfig(process.env);
const store = await createStore(config.dataFile ? filePersistence(config.dataFile) : undefined);

if (config.seedDemo && store.read().users.length === 0) {
  const seeded = await seedDemo({ rounds: config.passwordRounds });
  await store.update(() => [seeded, null] as const);
}

const app = createApp({
  store,
  passwordRounds: config.passwordRounds,
  sessionTtlMs: config.sessionTtlMs,
  corsOrigin: config.corsOrigin,
  onError: (error) => process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`),
});

const server = app.listen(config.port, () => {
  process.stdout.write(`Atelier API listening on port ${config.port}\n`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown).on('SIGINT', shutdown);
