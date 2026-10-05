import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout sur la version web de l'application, contre une vraie pile Supabase locale
 * (`supabase start`) ; l'IA, les e-mails et les paiements sont simulés. Voir e2e/README.md.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8765',
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Pixel 7'],
  },
  webServer: [
    {
      command: 'node support/stack.mjs',
      url: 'http://127.0.0.1:54320/__ready',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'node support/static.mjs',
      url: 'http://127.0.0.1:8765',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
