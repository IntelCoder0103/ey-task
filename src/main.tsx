import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { usingMock } from './api/config';
import { App } from './App';
import { createQueryClient } from './app/queryClient';
import './styles/global.css';

const startApi = () =>
  usingMock ? import('./mocks/browser').then(({ startMockApi }) => startMockApi()) : null;

Promise.resolve(startApi()).finally(() =>
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App client={createQueryClient()} />
    </StrictMode>,
  ),
);
