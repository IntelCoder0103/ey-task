import type { ZodError } from 'zod';

export type Issue = { path: string; message: string };
export type HttpError = Error & { status: number; details?: Issue[] };

export const httpError = (status: number, message: string, details?: Issue[]): HttpError =>
  Object.assign(new Error(message), { name: 'HttpError', status, details });

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof Error && error.name === 'HttpError';

export const validationError = ({ issues }: ZodError) => {
  const details = issues.map(({ path, message }) => ({ path: path.join('.'), message }));
  return httpError(400, details[0]?.message ?? 'Invalid request.', details);
};

export const required = <T>(value: T | undefined, error: () => HttpError): T => {
  if (value === undefined) throw error();
  return value;
};
