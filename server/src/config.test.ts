import { readConfig } from './config';

describe('readConfig', () => {
  it('applies defaults', () => {
    expect(readConfig({})).toEqual({
      port: 4000,
      dataFile: 'data/db.json',
      seedDemo: true,
      corsOrigin: undefined,
      passwordRounds: 10,
      sessionTtlMs: 168 * 3_600_000,
    });
  });

  it('parses overrides and treats an empty DATA_FILE as in-memory', () => {
    expect(
      readConfig({
        PORT: '8081',
        DATA_FILE: '',
        SEED_DEMO: 'false',
        BCRYPT_ROUNDS: '12',
        SESSION_TTL_HOURS: '1',
      }),
    ).toMatchObject({
      port: 8081,
      dataFile: null,
      seedDemo: false,
      passwordRounds: 12,
      sessionTtlMs: 3_600_000,
    });
  });

  it('does not seed the demo account in production unless asked to', () => {
    expect(readConfig({ NODE_ENV: 'production' }).seedDemo).toBe(false);
    expect(readConfig({ NODE_ENV: 'production', SEED_DEMO: 'true' }).seedDemo).toBe(true);
  });

  it('rejects invalid values at boot', () => {
    expect(() => readConfig({ BCRYPT_ROUNDS: '2' })).toThrow();
  });
});
