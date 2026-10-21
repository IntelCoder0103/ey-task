import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../api/http';

const isTransient = (error: unknown) => !isApiError(error) || error.status === 0 || error.status >= 500;

const defaultRetry = (failures: number, error: unknown) => failures < 2 && isTransient(error);

export const createQueryClient = ({ retry = defaultRetry }: { retry?: typeof defaultRetry | false } = {}) =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry },
      mutations: { retry: false },
    },
  });
