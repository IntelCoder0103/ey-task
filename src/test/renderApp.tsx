import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { authApi } from '../api/client';
import { session } from '../api/session';
import { AppRoutes } from '../App';
import { routerFuture } from '../app/router';
import { createQueryClient } from '../app/queryClient';
import { DEMO } from '../mocks/demo';

export const renderApp = (route = '/', { fakeTimers = false } = {}) => {
  const client = createQueryClient({ retry: false });
  const user = userEvent.setup(fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : {});
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, user, client };
};

export const signInAsDemo = async () => {
  const { token } = await authApi.login(DEMO);
  session.set(token);
};
