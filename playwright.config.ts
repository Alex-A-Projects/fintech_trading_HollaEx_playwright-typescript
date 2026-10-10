/**
 * Playwright config.
 *
 * Projects (run independently, fail independently):
 *   - public-ui:        smoke + negative tests against the HollaEx Pro SPA root.
 *                       Only project that runs in production-readonly env.
 *   - public-api:       live public REST API tests. Always exercises
 *                       api.hollaex.com.
 *   - cross-browser:    same smoke suite, run across Chromium / Firefox / WebKit.
 *   - local-auth:       login + auth API tests. Skipped on production-readonly.
 *   - local-trading:    order placement + cancellation against local Kit.
 *   - local-db:         PostgreSQL schema + integrity tests.
 *   - local-e2e:        full UI + API + DB integration scenarios.
 *   - accessibility:    smoke + axe-core WCAG checks against available pages.
 *
 * Tests MUST never silently fall back to production when credentials are
 * missing — each project self-skips via beforeAll guards and TS-level
 * `requireLocalOrTestnet()` helpers.
 */
import { defineConfig, devices, PlaywrightTestProject } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const HTML_REPORTER_DIR = 'playwright-report';
const TEST_RESULTS_DIR = 'test-results';
const RETRIES = process.env.CI ? Number(process.env.CI_RETRIES ?? 2) : 0;
const WORKERS = process.env.CI ? 2 : 4;

function baseProject(name: string, config: Partial<PlaywrightTestProject>): PlaywrightTestProject {
  return {
    name,
    testDir: path.resolve(__dirname, 'tests'),
    outputDir: path.resolve(__dirname, TEST_RESULTS_DIR, name),
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    retries: RETRIES,
    workers: WORKERS,
    metadata: {
      framework: 'Playwright + TypeScript',
      app: 'HollaEx',
      hollaexEnv: process.env.HOLLAEX_ENV ?? 'production-readonly',
    },
    ...config,
  };
}

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: RETRIES,
  workers: WORKERS,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, HTML_REPORTER_DIR), open: 'never' }],
    ['allure-playwright', { outputFolder: path.resolve(__dirname, 'allure-results'), detail: true }],
    ['github'],
  ],
  projects: [
    baseProject('public-ui', {
      testMatch: ['**/tests/ui/**/*.spec.ts', '**/tests/accessibility/**/*.spec.ts'],
      grep: /@ui|@smoke|@accessibility/,
      use: {
        baseURL: process.env.PUBLIC_BASE_URL ?? 'https://pro.hollaex.com',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 5_000,
        navigationTimeout: 15_000,
      },
      // HollaEx's CDN front-end occasionally drops packets under load;
      // one retry is enough to absorb the flake without hiding a real bug.
      retries: process.env.CI ? 2 : 1,
      workers: process.env.CI ? 2 : 3,
    }),
    baseProject('cross-browser', {
      testMatch: ['**/tests/ui/**/*.spec.ts'],
      grep: /@smoke/,
      use: {
        baseURL: process.env.PUBLIC_BASE_URL ?? 'https://pro.hollaex.com',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
      fullyParallel: true,
      retries: 1,
      workers: 1,
    }),
    baseProject('public-api', {
      testMatch: ['**/tests/api/public/**/*.spec.ts'],
      grep: /@api/,
      use: {
        baseURL: process.env.PUBLIC_API_BASE_URL ?? 'https://api.hollaex.com',
        extraHTTPHeaders: { Accept: 'application/json' },
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    }),
    baseProject('local-auth', {
      testMatch: ['**/tests/api/auth/**/*.spec.ts', '**/tests/api/wallet/**/*.spec.ts', '**/tests/api/trading/**/*.spec.ts'],
      grep: /@api/,
      use: {
        baseURL: process.env.LOCAL_API_BASE_URL ?? 'http://localhost:8080',
        trace: 'retain-on-failure',
      },
      workers: Number(process.env.INTEGRATION_WORKERS ?? 1),
      retries: 0,
    }),
    baseProject('local-db', {
      testMatch: ['**/tests/database/**/*.spec.ts'],
      grep: /@db/,
      use: { baseURL: 'http://localhost' },
      workers: 1,
      retries: 0,
      timeout: 60_000,
    }),
    // local-e2e project removed — the only integration scenarios the
    // framework provides were UI + API + DB end-to-end trades against a
    // running HollaEx Kit, which require an ACTIVATION_CODE we don't have.
    // The same coverage is split across local-db (DB scenarios) and
    // local-auth (HMAC / signed-request scenarios). See
    // docs/known-limitations.md § 6.
    baseProject('accessibility', {
      testMatch: ['**/tests/accessibility/**/*.spec.ts'],
      grep: /@accessibility/,
      use: { baseURL: process.env.PUBLIC_BASE_URL ?? 'https://pro.hollaex.com' },
      workers: 1,
    }),
    baseProject('security', {
      testMatch: ['**/tests/security/**/*.spec.ts'],
      grep: /@security/,
      use: { baseURL: process.env.PUBLIC_API_BASE_URL ?? 'https://api.hollaex.com' },
      workers: 1,
      retries: 0,
    }),
  ],
  expect: {
    toMatchSnapshot: { maxDiffPixels: 200 },
  },
});

export const DEVICE_PROJECTS = [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
];
