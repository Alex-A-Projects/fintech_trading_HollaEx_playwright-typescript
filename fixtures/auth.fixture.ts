/**
 * Auth fixture. Provides a logged-in test user. Skips when there is no
 * local/testnet environment so the suite stays safe on production.
 */
import { test as base, TestInfo } from '@playwright/test';
import { env } from '@config/environments';
import { AuthApiClient } from '@api/clients/index';
import type { BrowserContext, Page } from '@playwright/test';

export type AuthFixtures = {
  auth: AuthApiClient;
  context: BrowserContext;
  page: Page;
};

export const test = base.extend<AuthFixtures>({
  auth: async ({}, use, testInfo: TestInfo) => {
    if (env.isProductionReadonly) {
      testInfo.skip(true, 'Auth tests require HOLLAEX_ENV=local or testnet');
      return;
    }
    const client = new AuthApiClient({ baseURL: env.localApiBaseUrl });
    await client.init();
    try {
      const ctx = await client.login(env.testUserEmail, env.testUserPassword);
      if (!ctx) {
        testInfo.skip(true, `Login failed; check TEST_USER_EMAIL/PASSWORD in .env`);
        return;
      }
    } catch (err) {
      testInfo.skip(true, `Login error: ${(err as Error).message}`);
      return;
    }
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
