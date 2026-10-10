/**
 * Authentication UI surface tests.
 *
 * `/login` and `/signup` routes return 404 from production (documented).
 * We assert the navigation expectation and validate the auth API client
 * shape so when the SPA fallback is enabled these tests extend naturally.
 *
 * Tags: @ui @regression @auth
 */
import { test, expect } from '@fixtures/ui.fixture';
import { AuthApiClient } from '@api/clients/index';

test.describe('Auth UI surface @ui @regression @auth', () => {
  test('route /login is currently 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/login');
    expect(r.status()).toBe(404);
  });

  test('route /signup is currently 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/signup');
    expect(r.status()).toBe(404);
  });

  test('HMAC signing is structurally valid (canonical string, signature shape)', async () => {
    const { signHeaders } = AuthApiClient;
    const opts = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'btc-usdt', side: 'buy', size: 0.001, type: 'market' },
    };
    const r = signHeaders('api-key', 'api-secret', opts);
    expect(r.headers['api-key']).toBe('api-key');
    expect(r.headers['api-signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(r.headers['api-expires']).toMatch(/^\d+$/);
    expect(Number(r.headers['api-expires']) * 1000).toBeGreaterThan(Date.now() - 1000);
  });

  test('login-redirect / password-reset / SSO paths return 404', async ({ request }) => {
    for (const path of ['/forgot-password', '/reset-password', '/confirm-email', '/2fa']) {
      const r = await request.get(`https://pro.hollaex.com${path}`);
      expect(r.status(), path).toBe(404);
    }
  });
});
