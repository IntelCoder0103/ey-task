import type { ZodType } from 'zod';
import { pipe, pipeAsync } from '../lib/fp';

export type ApiError = Error & { status: number };

export const apiError = (status: number, message: string): ApiError =>
  Object.assign(new Error(message), { name: 'ApiError', status });

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof Error && error.name === 'ApiError';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;
type Init = { method: Method; headers: Record<string, string>; body?: string; signal?: AbortSignal };

export type RequestOptions<T> = {
  method?: Method;
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  schema: ZodType<T>;
};

export type HttpConfig = {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
  fetch?: (url: string, init: Init) => Promise<Response>;
};

export type Http = <T>(path: string, options: RequestOptions<T>) => Promise<T>;

const fallbackMessage = (status: number) => {
  if (status === 0) return 'Can’t reach the studio. Check your connection and try again.';
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 404) return 'That piece has gone out of print.';
  if (status >= 500) return 'The studio is having a moment. Try again shortly.';
  return 'Something about that request didn’t fit.';
};

const messageFrom = (body: unknown): string | undefined => {
  if (typeof body === 'string') return body.trim() || undefined;
  if (body && typeof body === 'object') {
    const { error, message } = body as Record<string, unknown>;
    return [error, message].find((value): value is string => typeof value === 'string' && value.length > 0);
  }
  return undefined;
};

const withAuth =
  (token: string | null) =>
  (init: Init): Init =>
    token ? { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } } : init;

const withJson =
  (body: unknown) =>
  (init: Init): Init =>
    body === undefined
      ? init
      : {
          ...init,
          headers: { ...init.headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };

const withSignal =
  (signal?: AbortSignal) =>
  (init: Init): Init =>
    signal ? { ...init, signal } : init;

const toUrl = (baseUrl: string, path: string, query: Query = {}) => {
  const params = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
  ).toString();
  return `${baseUrl.replace(/\/+$/, '')}${path}${params ? `?${params}` : ''}`;
};

const readBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const createHttp = ({
  baseUrl,
  getToken,
  onUnauthorized,
  fetch = (url, init) => globalThis.fetch(url, init),
}: HttpConfig): Http => {
  return <T>(path: string, { method = 'GET', body, query, signal, schema }: RequestOptions<T>) => {
    const token = getToken();
    const init = pipe(withAuth(token), withJson(body), withSignal(signal))({ method, headers: {} });

    const send = (url: string) =>
      fetch(url, init).catch((error: unknown) => {
        throw signal?.aborted ? error : apiError(0, fallbackMessage(0));
      });

    const assertOk = async (response: Response) => {
      const payload = await readBody(response);
      if (response.ok) return payload;
      if (response.status === 401 && token) onUnauthorized();
      throw apiError(response.status, messageFrom(payload) ?? fallbackMessage(response.status));
    };

    const parse = (payload: unknown) => {
      const result = schema.safeParse(payload);
      if (!result.success) throw apiError(502, 'The studio sent back something unexpected.');
      return result.data;
    };

    return pipeAsync(send, assertOk, parse)(toUrl(baseUrl, path, query));
  };
};
