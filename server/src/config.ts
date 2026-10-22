import { z } from 'zod';

const HOUR_MS = 60 * 60 * 1000;

const Env = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().min(0).default(4000),
  DATA_FILE: z.string().default('data/db.json'),
  SEED_DEMO: z.enum(['true', 'false']).optional(),
  CORS_ORIGIN: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
});

export const readConfig = (env: Record<string, string | undefined>) => {
  const parsed = Env.parse(env);
  return {
    port: parsed.PORT,
    dataFile: parsed.DATA_FILE || null,
    seedDemo: (parsed.SEED_DEMO ?? (parsed.NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
    corsOrigin: parsed.CORS_ORIGIN,
    passwordRounds: parsed.BCRYPT_ROUNDS,
    sessionTtlMs: parsed.SESSION_TTL_HOURS * HOUR_MS,
  };
};
