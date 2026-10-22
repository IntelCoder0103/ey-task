import type { RequestHandler, Response } from 'express';
import type { z, ZodTypeAny } from 'zod';
import { validationError } from './errors';

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

type Input<S extends Schemas> = {
  [K in keyof Schemas]-?: S[K] extends ZodTypeAny ? z.infer<S[K]> : undefined;
};

export type Reply = { status: number; body?: unknown };

export const reply = {
  ok: (body: unknown): Reply => ({ status: 200, body }),
  created: (body: unknown): Reply => ({ status: 201, body }),
  noContent: (): Reply => ({ status: 204 }),
};

const parse = (schema: ZodTypeAny | undefined, value: unknown) => {
  if (!schema) return undefined;
  const result = schema.safeParse(value);
  if (!result.success) throw validationError(result.error);
  return result.data;
};

export const route =
  <S extends Schemas>(
    schemas: S,
    handler: (input: Input<S>, res: Response) => Reply | Promise<Reply>,
  ): RequestHandler =>
  async (req, res) => {
    const input = {
      body: parse(schemas.body, req.body ?? {}),
      query: parse(schemas.query, req.query),
      params: parse(schemas.params, req.params),
    } as Input<S>;
    const { status, body } = await handler(input, res);
    if (body === undefined) res.status(status).end();
    else res.status(status).json(body);
  };
