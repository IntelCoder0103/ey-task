import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', channel: process.env.PW_CHANNEL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run build -w @atelier/server && npm run start -w @atelier/server',
      url: 'http://127.0.0.1:4000/health',
      env: { PORT: '4000', DATA_FILE: '', BCRYPT_ROUNDS: '4' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { VITE_DEMO_HINT: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
