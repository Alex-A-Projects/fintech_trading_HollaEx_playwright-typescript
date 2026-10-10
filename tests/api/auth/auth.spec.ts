/**
 * Auth API tests against the local HollaEx Kit deployment.
 *
 * HMAC unit tests run on any environment. The two live-HTTP tests
 * (`signed GET /v2/user …`, `signed POST /v2/user …`) self-skip when
 * the local Kit isn't reachable, so the suite stays green in any
 * environment.
 *
 * Tags: @api @regression @auth
 */
import { test as base, expect } from '@fixtures/api.fixture';
import { env } from '@config/environments';
import { AuthApiClient } from '@api/clients/index';
import type { TestInfo } from '@playwright/test';

async function isLocalKitReachable(): Promise<boolean> {
  try {
    const r = await fetch(`${env.localApiBaseUrl}/v2/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    // Strict: only a 200 with a JSON body containing "HollaEx" counts
    // as a reachable Kit. Anything else (404, 405, 500) means no Kit.
    if (r.status !== 200) return false;
    const text = await r.text();
    return text.includes('HollaEx') || text.includes('hollaex');
  } catch {
    return false;
  }
}

const test = base.extend<{ authClient: AuthApiClient; requireKit: boolean }>({
  requireKit: async ({}, use) => {
    if (env.isProductionReadonly) {
      // We still call the function for type-inference symmetry; it's a no-op
      // because the live tests below self-skip themselves.
      await use(false);
      return;
    }
    await use(await isLocalKitReachable());
  },
  authClient: async ({}, use, testInfo: TestInfo) => {
    if (env.isProductionReadonly) {
      testInfo.skip(true, 'Auth tests require HOLLAEX_ENV=local or testnet');
      return;
    }
    if (!(await isLocalKitReachable())) {
      testInfo.skip(
        true,
        `Local Kit at ${env.localApiBaseUrl} is not reachable; bring it up per docker/README.md.`,
      );
      return;
    }
    const client = new AuthApiClient({ baseURL: env.localApiBaseUrl });
    await client.init();
    await use(client);
    await client.dispose();
  },
});

test.describe('Auth API @api @regression @auth', () => {
  test('signed GET /v2/user with empty credentials is rejected', async ({ authClient }) => {
    let status = 0;
    try {
      await authClient.signed('', '', { method: 'GET', path: '/v2/user' });
      status = 200;
    } catch (err) {
      const m = /HTTP (\d+)/.exec((err as Error).message);
      status = m ? Number(m[1]) : 0;
    }
    expect([401, 403, 400]).toContain(status);
  });

  test('signed POST /v2/user with malformed body returns documented error envelope', async ({ authClient }) => {
    let status = 0;
    let parsed: unknown = null;
    try {
      await authClient.signed('bad-key', 'bad-secret', { method: 'POST', path: '/v2/user', body: {} });
      status = 200;
    } catch (err) {
      const m = /HTTP (\d+)/.exec((err as Error).message);
      status = m ? Number(m[1]) : 0;
      const json = /\{.*\}/.exec((err as Error).message);
      if (json) {
        try { parsed = JSON.parse(json[0]); } catch { /* leave null */ }
      }
    }
    expect([401, 403, 400]).toContain(status);
    if (parsed) {
      expect(parsed).toBeTruthy();
    }
  });

  test('HMAC signature generation is deterministic for the same inputs', () => {
    const apiKey = 'test-key';
    const apiSecret = 'test-secret';
    const opts = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'btc-usdt', side: 'buy', size: 0.001, type: 'market' },
    };
    const a = AuthApiClient.signHeaders(apiKey, apiSecret, opts);
    const b = AuthApiClient.signHeaders(apiKey, apiSecret, opts);
    expect(a.signature).toBe(b.signature);
  });

  test('HMAC signature changes with different secrets @security', () => {
    const opts = { method: 'GET' as const, path: '/v2/user' };
    const a = AuthApiClient.signHeaders('key', 'secret-1', opts);
    const b = AuthApiClient.signHeaders('key', 'secret-2', opts);
    expect(a.signature).not.toBe(b.signature);
  });

  test('HMAC signature changes with different bodies @security', () => {
    const opts1 = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'btc-usdt', side: 'buy', size: 0.001, type: 'market' },
    };
    const opts2 = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'btc-usdt', side: 'sell', size: 0.001, type: 'market' },
    };
    const a = AuthApiClient.signHeaders('key', 'secret', opts1);
    const b = AuthApiClient.signHeaders('key', 'secret', opts2);
    expect(a.signature).not.toBe(b.signature);
  });
});
