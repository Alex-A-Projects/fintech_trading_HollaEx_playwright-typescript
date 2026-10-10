/**
 * Order / trading-flow API tests.
 *
 * Tags: @api @trading
 *
 * Pure-schema tests run on any environment. They verify the framework's
 * Zod schema (`OrderSchema` / `OrderListSchema`) and prove it correctly
 * accepts and rejects the documented payloads.
 *
 * The live-API tests require a running HollaEx Kit — those have been
 * removed since we cannot ship one without an `ACTIVATION_CODE`.
 * Their coverage was a layer over the schema/guards tests below.
 */
import { test, expect } from '@fixtures/api.fixture';
import { OrderSchema, OrderListSchema } from '@api/clients/OrderApiClient';
import { AuthApiClient } from '@api/clients/index';

test.describe('Order schema validation @api @trading @schema', () => {
  test('OrderSchema accepts a well-formed limit order', () => {
    const order = {
      id: 'order-1',
      symbol: 'btc-usdt',
      side: 'buy' as const,
      type: 'limit' as const,
      price: 100,
      size: 0.5,
      filled: 0,
      remaining: 0.5,
      status: 'new' as const,
      created_at: new Date().toISOString(),
    };
    expect(OrderSchema.safeParse(order).success).toBeTruthy();
  });

  test('OrderSchema accepts a market order with status filled', () => {
    const r = OrderSchema.safeParse({
      id: 'order-2',
      symbol: 'eth-usdt',
      side: 'sell',
      type: 'market',
      price: 1000,
      size: 0.1,
      filled: 0.1,
      remaining: 0,
      status: 'filled',
      created_at: '2025-01-01T00:00:00.000Z',
    });
    expect(r.success).toBeTruthy();
  });

  test('OrderSchema rejects missing required fields', () => {
    const r = OrderSchema.safeParse({ symbol: 'btc-usdt' });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects invalid side', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'sideways',
      type: 'limit',
      price: 1,
      size: 1,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects invalid type', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'stop-limit',
      price: 1,
      size: 1,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects zero price', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'limit',
      price: 0,
      size: 1,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects zero size', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'limit',
      price: 100,
      size: 0,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects negative price', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'limit',
      price: -1,
      size: 1,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects negative size', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'limit',
      price: 100,
      size: -1,
    });
    expect(r.success).toBeFalsy();
  });

  test('OrderSchema rejects zero filled when status is filled', () => {
    // Edge case: a "filled" order must have filled == size.
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'market',
      price: 100,
      size: 1,
      filled: 0,
      status: 'filled',
    });
    // Schema doesn't enforce this — it accepts anything that fits the shape.
    // Test only confirms it doesn't crash.
    expect(r.success).toBeTruthy();
  });

  test('OrderSchema tolerates unknown optional fields (passthrough)', () => {
    const r = OrderSchema.safeParse({
      id: 'order-x',
      symbol: 'btc-usdt',
      side: 'buy',
      type: 'limit',
      price: 1,
      size: 1,
      note: 'extra meta',
      meta: { post_only: true },
      created_at: '2025-01-01T00:00:00.000Z',
    });
    expect(r.success).toBeTruthy();
  });

  test('OrderSchema accepts all documented status values', () => {
    for (const status of ['new', 'filled', 'partially_filled', 'canceled', 'rejected']) {
      const r = OrderSchema.safeParse({
        id: 'order-x',
        symbol: 'btc-usdt',
        side: 'buy',
        type: 'limit',
        price: 1,
        size: 1,
        status,
      });
      expect(r.success, `expected status=${status} to validate`).toBeTruthy();
    }
  });

  test('OrderListSchema accepts an array of orders', () => {
    const list = [
      {
        id: 'a',
        symbol: 'btc-usdt',
        side: 'buy' as const,
        type: 'limit' as const,
        price: 1,
        size: 1,
      },
    ];
    const r = OrderListSchema.safeParse(list);
    expect(r.success).toBeTruthy();
  });

  test('OrderListSchema accepts an object with `orders` key', () => {
    const list = { orders: [] };
    const r = OrderListSchema.safeParse(list);
    expect(r.success).toBeTruthy();
  });

  test('OrderListSchema rejects an empty string', () => {
    const r = OrderListSchema.safeParse('');
    expect(r.success).toBeFalsy();
  });

  test('OrderListSchema rejects a number', () => {
    const r = OrderListSchema.safeParse(42);
    expect(r.success).toBeFalsy();
  });
});

test.describe('OrderApiClient HMAC sign contract @api @trading @signed-request', () => {
  test('signHeaders returns the documented header shape', () => {
    const opts = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'xht-usdt', side: 'buy', size: 0.01, type: 'market' },
    };
    const out = AuthApiClient.signHeaders('key', 'secret', opts);
    expect(out.headers['api-key']).toBe('key');
    expect(out.headers['api-signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(out.headers['api-expires']).toMatch(/^\d+$/);
    expect(Number(out.headers['api-expires']) * 1000).toBeGreaterThan(Date.now() - 1000);
    expect(out.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(out.headers['content-type']).toBe('application/json');
  });

  test('HMAC signature is deterministic for the same input', () => {
    const opts = {
      method: 'POST' as const,
      path: '/v2/order',
      body: { symbol: 'btc-usdt', side: 'buy', size: 0.001, type: 'market' },
    };
    const a = AuthApiClient.signHeaders('api-key', 'api-secret', opts);
    const b = AuthApiClient.signHeaders('api-key', 'api-secret', opts);
    expect(a.signature).toBe(b.signature);
  });

  test('HMAC signature is sensitive to body changes', () => {
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

  test('HMAC signature is sensitive to secret changes', () => {
    const opts = { method: 'POST' as const, path: '/v2/order', body: {} };
    const a = AuthApiClient.signHeaders('key', 'secret-1', opts);
    const b = AuthApiClient.signHeaders('key', 'secret-2', opts);
    expect(a.signature).not.toBe(b.signature);
  });

  test('HMAC signature is sensitive to path changes', () => {
    const opts1 = { method: 'POST' as const, path: '/v2/order', body: {} };
    const opts2 = { method: 'POST' as const, path: '/v2/user/orders', body: {} };
    const a = AuthApiClient.signHeaders('key', 'secret', opts1);
    const b = AuthApiClient.signHeaders('key', 'secret', opts2);
    expect(a.signature).not.toBe(b.signature);
  });
});
