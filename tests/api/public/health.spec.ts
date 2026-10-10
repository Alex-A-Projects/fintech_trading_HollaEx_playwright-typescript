/**
 * Public API tests — health, constants, kit, tiers (fixture-backed).
 *
 * Tests in this file exercise the framework's Zod schemas against real
 * responses captured from `api.hollaex.com` while it was reachable. The
 * same schemas are applied by the live `MarketApiClient`, so a failure
 * here points to either a fixture drift or a schema regression.
 *
 * Tags: @api @smoke @regression
 */
import { test, expect } from '@fixtures/api.fixture';
import { FIXTURES } from './fixtures';
import {
  HealthSchema,
  ConstantsSchema,
  TiersSchema,
} from '@api/schemas/market';
import { isFiniteNumeric, isIsoTimestamp } from '@utils/assertions';

type TierFixture = {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  fees?: { maker?: Record<string, number>; taker?: Record<string, number> };
  deposit_limit?: number;
  withdrawal_limit?: number;
  note?: string;
  created_at?: string;
};

function tiersTyped(): Record<string, TierFixture> {
  return FIXTURES.tiers() as unknown as Record<string, TierFixture>;
}

test.describe('Public-API health @api @smoke @regression', () => {
  test('GET /v2/health returns the documented HollaEx shape', () => {
    const r = FIXTURES.health();
    expect(HealthSchema.safeParse(r).success).toBeTruthy();
  });

  test('GET /v2/health reports a HollaEx node with a semver version', () => {
    const r = FIXTURES.health();
    expect(r.name.toLowerCase()).toContain('hollaex');
    expect(r.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(r.uptime).toBeGreaterThanOrEqual(0);
  });

  test('GET /v2/health includes host, domain, and basePath fields', () => {
    const r = FIXTURES.health();
    expect(typeof r.host).toBe('string');
    expect(typeof r.domain).toBe('string');
    expect(r.basePath).toBe('/v2');
  });
});

test.describe('Constants catalogue @api @smoke @regression', () => {
  test('GET /v2/constants has the documented `coins` map', () => {
    const r = FIXTURES.constants();
    expect(ConstantsSchema.safeParse(r).success).toBeTruthy();
    expect(Object.keys(r.coins).length).toBeGreaterThan(0);
  });

  test('every coin in the catalogue has a symbol that matches its key', () => {
    const r = FIXTURES.constants() as unknown as {
      coins: Record<string, { symbol: string; fullname: string }>;
    };
    for (const [symbol, coin] of Object.entries(r.coins)) {
      expect(coin.symbol).toBe(symbol);
      expect(typeof coin.fullname).toBe('string');
      expect(coin.fullname.length).toBeGreaterThan(0);
    }
  });

  test('every coin has a numeric id and an `active` flag', () => {
    const r = FIXTURES.constants() as unknown as {
      coins: Record<string, { id: number; active: boolean }>;
    };
    for (const coin of Object.values(r.coins)) {
      expect(typeof coin.id).toBe('number');
      expect(coin.id).toBeGreaterThanOrEqual(0);
      expect(typeof coin.active).toBe('boolean');
    }
  });

  test('BTC, USDT, ETH exist in the coin catalogue', () => {
    const r = FIXTURES.constants() as unknown as {
      coins: Record<string, { symbol: string }>;
    };
    for (const sym of ['btc', 'usdt', 'eth']) {
      expect(r.coins[sym], `expected coin ${sym}`).toBeTruthy();
      expect(r.coins[sym].symbol).toBe(sym);
    }
  });

  test('each pair in the catalogue has base and quote tokens', () => {
    const r = FIXTURES.constants() as unknown as {
      pairs?: Record<string, { symbol: string; base: string; quote: string }>;
    };
    expect(r.pairs).toBeTruthy();
    for (const [pairKey, pair] of Object.entries(r.pairs ?? {})) {
      expect(pair.symbol).toBe(pairKey);
      expect(typeof pair.base).toBe('string');
      expect(typeof pair.quote).toBe('string');
      expect(pair.base.length).toBeGreaterThan(0);
      expect(pair.quote.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Kit metadata @api @regression', () => {
  test('GET /v2/kit is a non-null object', () => {
    const r = FIXTURES.kitMetadata();
    expect(typeof r).toBe('object');
    expect(r).not.toBeNull();
    expect(Object.keys(r).length).toBeGreaterThan(0);
  });

  test('GET /v2/kit does not expose secret keys', () => {
    const r = FIXTURES.kitMetadata();
    const payload = JSON.stringify(r).toLowerCase();
    const sensitive = ['api_secret', 'jwt_secret', 'password', 'private_key', 'mnemonic'];
    for (const key of sensitive) {
      const re = new RegExp(`"${key}"\\s*:`, 'i');
      expect(re.test(payload), `kit should not expose ${key}`).toBeFalsy();
    }
  });
});

test.describe('Tiers @api @regression', () => {
  test('GET /v2/tiers returns a map of tier definitions', () => {
    const r = FIXTURES.tiers();
    expect(TiersSchema.safeParse(r).success).toBeTruthy();
    expect(Object.keys(r).length).toBeGreaterThan(0);
  });

  test('every tier in the catalogue has a name and a numeric id', () => {
    const r = tiersTyped();
    for (const tier of Object.values(r)) {
      expect(tier.id).toBeGreaterThanOrEqual(1);
      expect(tier.name.length).toBeGreaterThan(0);
    }
  });

  test('every tier fees block uses 0 <= fee <= 1', () => {
    const r = tiersTyped();
    for (const tier of Object.values(r)) {
      const fees = tier.fees;
      if (!fees) continue;
      for (const side of ['maker', 'taker'] as const) {
        const sideFees = fees[side] ?? {};
        for (const fee of Object.values(sideFees)) {
          expect(isFiniteNumeric(fee)).toBeTruthy();
          expect(fee).toBeGreaterThanOrEqual(0);
          expect(fee).toBeLessThan(1);
        }
      }
    }
  });

  test('every tier created_at is a valid ISO timestamp', () => {
    const r = tiersTyped();
    for (const tier of Object.values(r)) {
      if (tier.created_at) {
        expect(isIsoTimestamp(tier.created_at)).toBeTruthy();
      }
    }
  });
});
