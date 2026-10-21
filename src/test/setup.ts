import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { session } from '../api/session';
import { db, server } from '../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  db.reset();
  session.clear();
  localStorage.clear();
});

afterAll(() => server.close());
