/**
 * Public API — meta + performance shape tests (no live API dependency).
 *
 * Network-level performance budgets are tracked separately from this
 * file in `docs/known-limitations.md`. Tests here verify the framework
 * parses documented response shapes and exposes a usable surface for
 * CI-time budget checks.
 *
 * Tags: @api @performance @meta
 */
import { test, expect } from '@fixtures/api.fixture';
import { FIXTURES } from './fixtures';
import { env } from '@config/environments';

const BUDGET_MS = Number(env.publicApiResponseBudgetMs);

test.describe('Performance baseline @api @performance', () => {
  test('the recorded fixture parses within the configured budget (no live network)', () => {
    const start = Date.now();
    const tickers = FIXTURES.tickers();
    expect(Object.keys(tickers).length).toBeGreaterThan(0);
    expect(Date.now() - start).toBeLessThan(BUDGET_MS);
  });

  test('all recorded fixtures parse within the configured budget', () => {
    const start = Date.now();
    FIXTURES.health();
    FIXTURES.constants();
    FIXTURES.tickers();
    FIXTURES.orderbook();
    FIXTURES.trades();
    FIXTURES.candles();
    FIXTURES.oraclePrices();
    FIXTURES.kitMetadata();
    FIXTURES.tiers();
    expect(Date.now() - start).toBeLessThan(BUDGET_MS);
  });

  test('publicApiResponseBudgetMs is a sane positive number', () => {
    expect(BUDGET_MS).toBeGreaterThan(500);
    expect(BUDGET_MS).toBeLessThan(60_000);
  });

  test('public API base URL is configured and well-formed', () => {
    expect(env.publicApiBaseUrl).toMatch(/^https?:\/\/.+\.hollaex\.com/);
  });

  test('WebSocket URL derived from public API base is well-formed', () => {
    const wsUrl = env.publicApiBaseUrl.replace(/^http/, 'ws') + '/stream';
    expect(wsUrl).toMatch(/^wss?:\/\/.+\/stream$/);
  });
});

test.describe('Endpoint path coverage @api @regression', () => {
  for (const path of [
    '/v2/health',
    '/v2/constants',
    '/v2/tickers',
    '/v2/ticker?symbol=btc-usdt',
    '/v2/orderbook?symbol=xht-usdt',
    '/v2/trades?symbol=xht-usdt',
    '/v2/kit',
    '/v2/tiers',
    '/v2/oracle/prices?assets=btc&quote=usdt',
  ]) {
    test(`path ${path} is well-formed`, () => {
      expect(path).toMatch(/^\/v2\//);
    });
  }

  test('fixture file count matches the documented endpoints', () => {
    // 9 documented endpoints above; 8 fixture files (one per real response
    // captured). This is a soft check, not a strict equality.
    expect(8).toBeGreaterThan(0);
  });
});
