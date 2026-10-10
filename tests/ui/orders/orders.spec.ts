/**
 * Orders & trade-history UI surface tests.
 *
 * `/orders`, `/history`, `/trades` routes return 404 from production.
 * Authenticated order endpoints are exercised in `tests/api/trading/*`
 * against a local Kit.
 *
 * Tags: @ui @regression @orders
 */
import { test, expect } from '@fixtures/ui.fixture';

test.describe('Orders UI surface @ui @regression @orders', () => {
  test('route /orders returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/orders');
    expect(r.status()).toBe(404);
  });

  test('route /history returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/history');
    expect(r.status()).toBe(404);
  });

  test('route /trades returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/trades');
    expect(r.status()).toBe(404);
  });

  test('route /order-book returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/order-book');
    expect(r.status()).toBe(404);
  });

  test('route /open-orders returns 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/open-orders');
    expect(r.status()).toBe(404);
  });
});
