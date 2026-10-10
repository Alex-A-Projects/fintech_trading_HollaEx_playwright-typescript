/**
 * Public catalog endpoint shape tests (fixture-backed).
 *
 * Tags: @api @regression
 */
import { test, expect } from '@fixtures/api.fixture';
import { FIXTURES } from './fixtures';

test.describe('Tier catalogue @api @regression', () => {
  test('the tier catalogue has at least Silver, Ruby, and Diamond tiers', () => {
    const tiers = FIXTURES.tiers();
    const names = Object.values(tiers).map((t) => t.name);
    expect(names).toContain('Silver');
    expect(names).toContain('Ruby');
    expect(names).toContain('Diamond');
  });

  test('tier fees are sensible percentages', () => {
    const tiers = FIXTURES.tiers() as Record<
      string,
      { fees?: { maker?: Record<string, number>; taker?: Record<string, number> } }
    >;
    for (const tier of Object.values(tiers)) {
      if (!tier.fees) continue;
      for (const side of ['maker', 'taker'] as const) {
        const sideFees = tier.fees[side] ?? {};
        for (const fee of Object.values(sideFees)) {
          expect(fee).toBeGreaterThanOrEqual(0);
          expect(fee).toBeLessThan(1);
        }
      }
    }
  });

  test('tier `note` field, when present, is a non-empty string', () => {
    const tiers = FIXTURES.tiers();
    for (const tier of Object.values(tiers)) {
      if (tier.note !== undefined) {
        expect(typeof tier.note).toBe('string');
        expect((tier.note as string).length).toBeGreaterThan(0);
      }
    }
  });

  test('kit deployment info is consistent (status=true, initialized=true)', () => {
    const info = (FIXTURES.kitMetadata() as { info?: { status?: boolean; initialized?: boolean } }).info;
    expect(info?.status).toBe(true);
    expect(info?.initialized).toBe(true);
  });

  test('kit `info.collateral_level` is one of the documented values', () => {
    const info = (FIXTURES.kitMetadata() as { info?: { collateral_level?: string } }).info;
    expect(['member', 'pro', 'premium', 'vip']).toContain(info?.collateral_level);
  });
});
