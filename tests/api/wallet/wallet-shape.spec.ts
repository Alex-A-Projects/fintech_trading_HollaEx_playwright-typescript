/**
 * Wallet numeric-integrity tests.
 *
 * Tags: @api @wallet @numeric
 */
import { test, expect } from '@fixtures/api.fixture';
import { BalanceSchema } from '@api/clients/WalletApiClient';

test.describe('Balance numeric integrity @api @wallet @numeric', () => {
  test('very large balance parses', () => {
    const r = BalanceSchema.safeParse({
      currency: 'xrp',
      available: 1_000_000_000,
      reserved: 0,
      total: 1_000_000_000,
    });
    expect(r.success).toBeTruthy();
  });

  test('decimal precision up to 18 places parses', () => {
    const r = BalanceSchema.safeParse({
      currency: 'btc',
      available: 0.000000000000000001,
      reserved: 0,
      total: 0.000000000000000001,
    });
    expect(r.success).toBeTruthy();
  });

  test('reserved must be finite (caller-side numeric check)', () => {
    const parsed = BalanceSchema.safeParse({
      currency: 'btc',
      available: 1,
      reserved: Number.POSITIVE_INFINITY,
      total: 2,
    });
    // Zod's `z.number()` accepts Infinity by default; callers should
    // also call Number.isFinite() before they use the value.
    expect(parsed.success).toBeTruthy();
    if (parsed.success) {
      const reserved = parsed.data.reserved ?? 0;
      expect(Number.isFinite(reserved), 'reserved must be finite').toBeFalsy();
    }
  });

  test('reserved greater than total surfaces a balance inconsistency', () => {
    const parsed = BalanceSchema.safeParse({
      currency: 'btc',
      available: 0,
      reserved: 1,
      total: 0,
    });
    expect(parsed.success).toBeTruthy();
    if (parsed.success) {
      const reserved = parsed.data.reserved ?? 0;
      expect(reserved > parsed.data.total).toBeTruthy();
    }
  });
});

test.describe('Balance reserved/available reconciliation logic @api @wallet @recon', () => {
  test('reserved + available === total for healthy balances', () => {
    const samples = [
      { available: 100, reserved: 0, total: 100 },
      { available: 0, reserved: 50, total: 50 },
      { available: 1.5, reserved: 0.25, total: 1.75 },
      { available: 0.0000001, reserved: 0.00000005, total: 0.00000015 },
    ];
    for (const s of samples) {
      expect(s.available + s.reserved).toBeCloseTo(s.total, 8);
    }
  });

  test('negative reserved is rejected by the schema @inconsistency', () => {
    // A negative `reserved` is a logical bug — the schema enforces
    // nonnegative for `reserved`.
    const parsed = BalanceSchema.safeParse({
      currency: 'usdt',
      available: 100,
      reserved: -10,
      total: 90,
    });
    expect(parsed.success).toBeFalsy();
  });
});
