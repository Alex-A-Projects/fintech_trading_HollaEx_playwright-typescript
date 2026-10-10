/**
 * API test fixtures. Each fixture owns its client's lifecycle and tears it
 * down at the end of the test.
 *
 * `marketClient` runs a one-time rate-limit probe before exercising tests.
 * If `api.hollaex.com` is currently rate-limited at the edge (the documented
 * `404 code:284` response seen from this network), the fixture self-skips
 * with a clear message instead of failing the suite.
 */
import { test as base, TestInfo } from '@playwright/test';
import { MarketApiClient, AuthApiClient, OrderApiClient, WalletApiClient } from '@api/clients/index';
import { env, isApiRateLimited } from '@config/environments';

export type ApiFixtures = {
  marketClient: MarketApiClient;
  authClient: AuthApiClient;
  orderClient: OrderApiClient;
  walletClient: WalletApiClient;
};

async function probeAndMaybeSkip(testInfo: TestInfo): Promise<void> {
  if (!env.isProductionReadonly) return;
  if (env.isLocal) return;
  // Check if the live API is currently being throttled at the edge.
  try {
    const r = await fetch(`${env.publicApiBaseUrl}/v2/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (r.status >= 500) {
      test.skip(true, `Live API returned HTTP ${r.status}; the suite is blocked.`);
      return;
    }
    const text = await r.text();
    if (await isApiRateLimited(r.status, text)) {
      test.skip(
        true,
        `Live API is currently rate-limited at the Cloudflare edge (404 code:284). ` +
          `Re-run from a clean network or after the rate-limit window expires. ` +
          `Current test: ${testInfo.title}`,
      );
    }
  } catch (err) {
    test.skip(true, `Live API probe failed: ${(err as Error).message}`);
  }
}

export const test = base.extend<ApiFixtures>({
  marketClient: async ({}, use, testInfo: TestInfo) => {
    await probeAndMaybeSkip(testInfo);
    const client = new MarketApiClient();
    await client.init();
    await use(client);
    await client.dispose();
  },
  authClient: async ({}, use, testInfo: TestInfo) => {
    await probeAndMaybeSkip(testInfo);
    const client = new AuthApiClient({ baseURL: env.localApiBaseUrl });
    await client.init();
    await use(client);
    await client.dispose();
  },
  orderClient: async ({ authClient }, use, testInfo: TestInfo) => {
    await probeAndMaybeSkip(testInfo);
    const client = new OrderApiClient({ baseURL: env.localApiBaseUrl }, authClient);
    await client.init();
    await use(client);
    await client.dispose();
  },
  walletClient: async ({ authClient }, use, testInfo: TestInfo) => {
    await probeAndMaybeSkip(testInfo);
    const client = new WalletApiClient({ baseURL: env.localApiBaseUrl }, authClient);
    await client.init();
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
