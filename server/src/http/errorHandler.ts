import type { ErrorRequestHandler } from 'express';
import { isHttpError } from './errors';

const bodyParserStatus: Record<string, [number, string]> = {
  'entity.parse.failed': [400, 'Malformed JSON body.'],
  'entity.too.large': [413, 'Request body is too large.'],
};

export const errorHandler =
  (onUnexpected: (error: unknown) => void): ErrorRequestHandler =>
  (error, _req, res, _next) => {
    if (isHttpError(error)) {
      res
        .status(error.status)
        .json(error.details ? { error: error.message, details: error.details } : { error: error.message });
      return;
    }
    const parserFailure = bodyParserStatus[(error as { type?: string }).type ?? ''];
    if (parserFailure) {
      res.status(parserFailure[0]).json({ error: parserFailure[1] });
      return;
    }
    onUnexpected(error);
    res.status(500).json({ error: 'Something went wrong.' });
  };
