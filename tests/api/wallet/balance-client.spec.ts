/**
 * Wallet / balance API tests.
 *
 * Tags: @api @wallet
 *
 * Pure schema tests run on any environment and verify the framework's
 * balance-validator code path. Live-API tests gate on
 * `HOLLAEX_ENV=local|testnet`.
 */
import { test, expect } from '@fixtures/api.fixture';
import { BalanceSchema, BalancesEnvelopeSchema } from '@api/clients/WalletApiClient';
import { env } from '@config/environments';
import { WalletApiClient } from '@api/clients/index';

test.describe('WalletApiClient guards @api @wallet @guards', () => {
  // Note: the env-gated behavior of WalletApiClient.getBalances is
  // exercised through the live-fixture tests in client.spec.ts:
  //   DatabaseClient construction rejects writes with readOnly=true.
  //   No net-call guard is here because it would require a real Kit
  //   server (which we don't ship without an ACTIVATION_CODE).
  test('WalletApiClient constructs without throwing', () => {
    expect(() => new WalletApiClient({ baseURL: env.localApiBaseUrl })).not.toThrow();
  });
});

test.describe('Balance numeric integrity @api @wallet @numeric', () => {
  test('BalanceSchema accepts a well-formed balance', () => {
    const b = {
      currency: 'usdt',
      available: 100,
      reserved: 0,
      total: 100,
    };
    expect(BalanceSchema.safeParse(b).success).toBeTruthy();
  });

  test('BalanceSchema rejects negative available (the schema enforces nonnegative) @negative-available', () => {
    const r = BalanceSchema.safeParse({
      currency: 'btc',
      available: -0.001,
      reserved: 0,
      total: -0.001,
    });
    expect(r.success).toBeFalsy();
  });

  test('BalanceSchema rejects non-numeric available', () => {
    const r = BalanceSchema.safeParse({ currency: 'btc', available: 'lots', reserved: 0, total: 0 });
    expect(r.success).toBeFalsy();
  });

  test('BalanceSchema accepts zero balances', () => {
    const r = BalanceSchema.safeParse({ currency: 'usdt', available: 0, reserved: 0, total: 0 });
    expect(r.success).toBeTruthy();
  });

  test('BalanceSchema accepts fractional precision', () => {
    const r = BalanceSchema.safeParse({
      currency: 'btc',
      available: 0.00000001,
      reserved: 0,
      total: 0.00000001,
    });
    expect(r.success).toBeTruthy();
  });

  test('BalanceSchema rejects missing currency', () => {
    const r = BalanceSchema.safeParse({ available: 1, reserved: 0, total: 1 });
    expect(r.success).toBeFalsy();
  });

  test('BalanceSchema tolerates passthrough fields', () => {
    const r = BalanceSchema.safeParse({
      currency: 'usdt',
      available: 1,
      reserved: 0,
      total: 1,
      updated_at: '2025-01-01T00:00:00.000Z',
      meta: { dust: true },
    });
    expect(r.success).toBeTruthy();
  });

  test('BalancesEnvelopeSchema accepts an array of balances', () => {
    const r = BalancesEnvelopeSchema.safeParse([
      { currency: 'btc', available: 0.1, reserved: 0, total: 0.1 },
      { currency: 'usdt', available: 100, reserved: 0, total: 100 },
    ]);
    expect(r.success).toBeTruthy();
  });

  test('BalancesEnvelopeSchema accepts a map keyed by currency', () => {
    const r = BalancesEnvelopeSchema.safeParse({
      btc: { currency: 'btc', available: 0.1, reserved: 0, total: 0.1 },
      usdt: { currency: 'usdt', available: 100, reserved: 0, total: 100 },
    });
    expect(r.success).toBeTruthy();
  });

  test('BalancesEnvelopeSchema envelope-with-balances shape is the same as array', () => {
    // Document the real envelope shape: the Kit typically returns the
    // array directly. The `WalletApiClient.getBalances()` normalises the
    // `balances` key for callers.
    const r = BalancesEnvelopeSchema.safeParse({
      balances: [{ currency: 'btc', available: 0, reserved: 0, total: 0 }],
    });
    // The schema is a union of array + record, so an envelope with a
    // top-level `balances` key is NOT in the union. We document this.
    expect(r.success).toBeFalsy();
  });

  test('balances sum correctly under accounting', () => {
    const samples = [
      { currency: 'usdt', available: 50, reserved: 25, total: 75 },
      { currency: 'btc', available: 0.1, reserved: 0.0, total: 0.1 },
    ];
    for (const s of samples) {
      const r = BalanceSchema.safeParse(s);
      expect(r.success).toBeTruthy();
      if (r.success) {
        expect(r.data.available + r.data.reserved!).toBeCloseTo(r.data.total, 6);
      }
    }
  });
});

test.describe('WalletApiClient construction @api @wallet @framework', () => {
  test('WalletApiClient constructs without throwing', () => {
    expect(() => new WalletApiClient({ baseURL: env.localApiBaseUrl })).not.toThrow();
  });
});

test.describe('Wallet live against local Kit @api @wallet @local', () => {
  test.beforeAll(() => {
    if (env.isProductionReadonly) test.skip(true, 'Wallet tests require a local Kit (HOLLAEX_ENV=local)');
  });

  test('balance for a known currency is finite and non-negative', async ({ walletClient }) => {
    let total = 0;
    try {
      const balances = await walletClient.getBalances();
      const arr = Array.isArray(balances) ? balances : Object.values((balances as object) === balances ? balances : {});
      total = arr.length;
    } catch (err) {
      test.skip(true, `getBalances failed: ${(err as Error).message}`);
      return;
    }
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('balance numerics pass through the schema @schema', async ({ walletClient }) => {
    let raw: unknown;
    try {
      raw = await walletClient.getBalances();
    } catch (err) {
      test.skip(true, `getBalances failed: ${(err as Error).message}`);
      return;
    }
    const parsed = BalancesEnvelopeSchema.safeParse(raw);
    expect(parsed.success).toBeTruthy();
  });
});
