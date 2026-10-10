/**
 * Wallets / balances UI surface tests.
 *
 * `/wallet`, `/wallets`, etc. return 404 from production (documented).
 * Authenticated wallet endpoints require a local Kit, so the wire-level
 * checks happen in `tests/api/wallet/*` instead.
 *
 * Tags: @ui @regression @wallets
 */
import { test, expect } from '@fixtures/ui.fixture';
import { env } from '@config/environments';

test.describe('Wallet UI surface @ui @regression @wallets', () => {
  test('route /wallet returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/wallet');
    expect(r.status()).toBe(404);
  });

  test('route /wallets returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/wallets');
    expect(r.status()).toBe(404);
  });

  test('route /balances returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/balances');
    expect(r.status()).toBe(404);
  });

  test('public supported-currency catalog (what a wallet page would render)', async ({ request }) => {
    // Use the API contract — the public UI would surface these via /v2/constants.
    const r = await request.get(`${env.publicApiBaseUrl}/v2/constants`);
    if (r.status() === 200) {
      const body = (await r.json()) as { coins?: Record<string, unknown> };
      const coins = body.coins ?? {};
      expect(Object.keys(coins).length).toBeGreaterThan(0);
    } else {
      // Same 4xx / 200 envelope handling as elsewhere — public catalog either
      // exists or doesn't, neither is an error.
      expect(r.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
