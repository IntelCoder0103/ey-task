import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { session } from '../api/session';
import { backend, network } from './network';

beforeAll(() => network.listen({ onUnhandledRequest: 'error' }));

afterEach(async () => {
  cleanup();
  network.resetHandlers();
  session.clear();
  localStorage.clear();
  await backend.reset();
});

afterAll(async () => {
  network.close();
  await backend.close();
});
