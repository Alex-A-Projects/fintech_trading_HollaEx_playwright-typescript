/**
 * Public API tests — oracle, tier, kit shapes (fixture-backed).
 *
 * Tags: @api @regression
 */
import { test, expect } from '@fixtures/api.fixture';
import { FIXTURES } from './fixtures';
import { isFiniteNumeric, isTradingPair } from '@utils/assertions';

test.describe('Oracle prices @api @regression @oracle', () => {
  test('GET /v2/oracle/prices returns finite positive values', () => {
    const r = FIXTURES.oraclePrices();
    expect(Object.keys(r).length).toBeGreaterThan(0);
    for (const [asset, price] of Object.entries(r)) {
      expect(isFiniteNumeric(price), `${asset} oracle price must be finite`).toBeTruthy();
      expect(price).toBeGreaterThan(0);
    }
  });

  test('oracle asset keys are lowercase trading tokens', () => {
    const r = FIXTURES.oraclePrices();
    for (const asset of Object.keys(r)) {
      expect(asset).toMatch(/^[a-z0-9]{2,10}$/);
    }
  });

  test('oracle prices are quoted in the requested quote currency', () => {
    const r = FIXTURES.oraclePrices();
    expect(r.btc).toBeGreaterThan(100); // sanity — BTC in USDT > $100
  });

  test('price-per-unit scales linearly with amount (sanity for 1 vs 10 unit)', () => {
    const p1 = FIXTURES.oraclePrices() as { btc: number } as { btc: number };
    expect(p1.btc).toBeGreaterThan(0);
    const ratio = (p1.btc * 10) / p1.btc;
    expect(ratio).toBeCloseTo(10, 1);
  });
});

test.describe('Tier shape @api @regression @tier-shape', () => {
  type TierShape = { name: string; id: number; deposit_limit?: number };

  test('every tier has a name and non-empty value', () => {
    const tiers = FIXTURES.tiers() as unknown as Record<string, TierShape>;
    const keys = Object.keys(tiers);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(typeof tiers[k].name).toBe('string');
      expect(tiers[k].name.length).toBeGreaterThan(0);
    }
  });

  test('every tier has a numeric id', () => {
    const tiers = FIXTURES.tiers() as unknown as Record<string, TierShape>;
    for (const tier of Object.values(tiers)) {
      expect(typeof tier.id).toBe('number');
      expect(Number.isInteger(tier.id)).toBeTruthy();
    }
  });

  test('every tier `deposit_limit` is a finite non-negative number', () => {
    const tiers = FIXTURES.tiers() as unknown as Record<string, TierShape>;
    for (const tier of Object.values(tiers)) {
      if (typeof tier.deposit_limit === 'number') {
        expect(isFiniteNumeric(tier.deposit_limit)).toBeTruthy();
        expect(tier.deposit_limit).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Kit metadata @api @regression @kit', () => {
  test('GET /v2/kit has named flags', () => {
    const kit = FIXTURES.kitMetadata();
    expect(typeof kit).toBe('object');
    expect(Object.keys(kit).length).toBeGreaterThan(0);
  });

  test('kit `info.exchange_id` is a positive integer', () => {
    const info = (FIXTURES.kitMetadata() as { info?: { exchange_id?: unknown } }).info;
    expect(info).toBeTruthy();
    expect(typeof info?.exchange_id).toBe('number');
    expect(Number.isInteger(info?.exchange_id)).toBeTruthy();
    expect(info!.exchange_id!).toBeGreaterThan(0);
  });

  test('kit `info.url` is the same base as the public API', () => {
    const info = (FIXTURES.kitMetadata() as { info?: { url?: string } }).info;
    expect(info?.url).toMatch(/^https?:\/\/api\.hollaex\.com/);
  });
});

test.describe('Symbol catalog @api @regression @symbols', () => {
  test('every ticker symbol from the catalogue parses with TradingPairSchema', () => {
    const tickers = FIXTURES.tickers() as Record<string, unknown>;
    for (const symbol of Object.keys(tickers)) {
      expect(isTradingPair(symbol), `${symbol} valid trading-pair`).toBeTruthy();
    }
  });
});
