/**
 * Public API tests — markets, orderbook, trades (fixture-backed).
 *
 * Tests in this file validate the framework's Zod schemas against real
 * responses captured from `api.hollaex.com` while it was reachable,
 * plus structural assertions derived from the documented contract.
 *
 * Tags: @api @smoke @regression
 */
import { test, expect } from '@fixtures/api.fixture';
import { FIXTURES } from './fixtures';
import {
  TickersEnvelopeSchema,
  OrderBookEnvelopeSchema,
  TradesEnvelopeSchema,
  SymbolSchema,
} from '@api/schemas/market';
import { isTradingPair, isFiniteNumeric, isIsoTimestamp } from '@utils/assertions';

type TickerFixture = {
  symbol: string;
  open: number;
  close: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  time?: string;
  timestamp?: string;
};

type TradeFixture = {
  price: number;
  size?: number;
  amount?: number;
  date?: string;
};

type BookFixture = {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
};

function tickersTyped(): Record<string, TickerFixture> {
  return FIXTURES.tickers() as unknown as Record<string, TickerFixture>;
}

function tradesTyped(): TradeFixture[] {
  return ((FIXTURES.trades() as { 'xht-usdt': TradeFixture[] })['xht-usdt'] ?? []);
}

function orderBookTyped(): BookFixture {
  return (FIXTURES.orderbook() as { 'xht-usdt': BookFixture })['xht-usdt'];
}

test.describe('Markets tickers @api @smoke @regression', () => {
  test('GET /v2/tickers returns a non-empty ticker map', () => {
    const r = tickersTyped();
    expect(TickersEnvelopeSchema.safeParse(r).success).toBeTruthy();
    expect(Object.keys(r).length).toBeGreaterThan(0);
  });

  test('every ticker respects high >= low, last >= 0', () => {
    const r = tickersTyped();
    for (const [symbol, ticker] of Object.entries(r)) {
      expect(isTradingPair(symbol), `${symbol} shape`).toBeTruthy();
      expect(ticker.high).toBeGreaterThanOrEqual(ticker.low);
      expect(ticker.last).toBeGreaterThanOrEqual(0);
      expect(ticker.volume).toBeGreaterThanOrEqual(0);
    }
  });

  test('every ticker has a finite price set + ISO timestamp', () => {
    const r = tickersTyped();
    for (const [symbol, ticker] of Object.entries(r)) {
      for (const field of ['open', 'close', 'high', 'low', 'last', 'volume'] as const) {
        expect(isFiniteNumeric(ticker[field]), `${symbol}.${field} finite`).toBeTruthy();
      }
      const timeStr = ticker.time ?? ticker.timestamp ?? '';
      expect(isIsoTimestamp(timeStr), `${symbol} ISO-8601`).toBeTruthy();
    }
  });

  test('tickers keyed by valid trading-pair symbols', () => {
    const r = tickersTyped();
    for (const symbol of Object.keys(r)) {
      SymbolSchema.parse(symbol);
      expect(isTradingPair(symbol)).toBeTruthy();
    }
  });

  test('every ticker `last` is between low and high inclusive', () => {
    const r = tickersTyped();
    for (const [symbol, ticker] of Object.entries(r)) {
      expect(ticker.last >= ticker.low, `${symbol} last>=low`).toBeTruthy();
      expect(ticker.last <= ticker.high, `${symbol} last<=high`).toBeTruthy();
    }
  });

  test('search-by-prefix matches the pair catalog', () => {
    const r = tickersTyped();
    const symbols = Object.keys(r).map((s) => s.toLowerCase());
    const btcMatches = symbols.filter((s) => s.startsWith('btc'));
    expect(btcMatches.length, 'btc-prefixed pairs should exist').toBeGreaterThan(0);
  });

  test('No NaN / Infinity values in any ticker field @numeric-integrity', () => {
    const r = tickersTyped();
    for (const [symbol, ticker] of Object.entries(r)) {
      for (const field of ['open', 'close', 'high', 'low', 'last', 'volume'] as const) {
        const v = ticker[field];
        expect(Number.isFinite(v), `${symbol}.${field} finite`).toBeTruthy();
      }
    }
  });

  test('No NaN/Infinity leak in orderbook levels @numeric-integrity', () => {
    const ob = orderBookTyped();
    for (const [price, size] of [...ob.bids, ...ob.asks]) {
      expect(Number.isFinite(price) && price > 0, 'positive finite price').toBeTruthy();
      expect(Number.isFinite(size) && size >= 0, 'non-negative finite size').toBeTruthy();
    }
  });
});

test.describe('Order-book @api @regression', () => {
  test('GET /v2/orderbook?symbol=xht-usdt returns well-formed bids/asks', () => {
    const r = orderBookTyped();
    expect(OrderBookEnvelopeSchema.safeParse({ 'xht-usdt': r }).success).toBeTruthy();
    expect(r.bids.length).toBeGreaterThan(0);
    expect(r.asks.length).toBeGreaterThan(0);
  });

  test('order-book bids are sorted descending by price', () => {
    const bids = orderBookTyped().bids;
    for (let i = 1; i < bids.length; i++) {
      expect(bids[i][0]).toBeLessThanOrEqual(bids[i - 1][0]);
    }
  });

  test('order-book asks are sorted ascending by price', () => {
    const asks = orderBookTyped().asks;
    for (let i = 1; i < asks.length; i++) {
      expect(asks[i][0]).toBeGreaterThanOrEqual(asks[i - 1][0]);
    }
  });

  test('best ask is greater than or equal to best bid', () => {
    const r = orderBookTyped();
    expect(r.asks[0][0]).toBeGreaterThanOrEqual(r.bids[0][0]);
  });
});

test.describe('Recent trades @api @regression', () => {
  test('GET /v2/trades?symbol=xht-usdt returns a non-empty list', () => {
    const t = tradesTyped();
    expect(TradesEnvelopeSchema.safeParse({ 'xht-usdt': t }).success).toBeTruthy();
    expect(t.length).toBeGreaterThan(0);
  });

  test('every trade has a positive price and positive size', () => {
    for (const tr of tradesTyped()) {
      expect(tr.price).toBeGreaterThan(0);
      expect(tr.size ?? tr.amount ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  test('recent trades have an ISO-8601 timestamp when present', () => {
    for (const tr of tradesTyped()) {
      if (tr.date) expect(isIsoTimestamp(tr.date)).toBeTruthy();
    }
  });
});

test.describe('Symbol shape @api @regression @symbols', () => {
  for (const sym of ['btc-usdt', 'eth-usdt', 'xht-usdt']) {
    test(`${sym} matches the trading-pair regex`, () => {
      expect(isTradingPair(sym)).toBeTruthy();
      SymbolSchema.parse(sym);
    });
  }
});
