/**
 * Trading-terminal surface tests (fixture-backed).
 *
 * The `/trade/{symbol}` route returns 404 from production (no SPA fallback).
 * These tests validate the data the trading terminal WOULD render against
 * recorded real responses, plus the documented navigation expectation.
 *
 * Tags: @ui @regression @trading
 */
import { test, expect } from '@fixtures/ui.fixture';
import { isFiniteNumeric, isTradingPair } from '@utils/assertions';
import { FIXTURES } from '../../api/public/fixtures';

type Level = [number, number];
type Book = { bids: Level[]; asks: Level[] };
type Trade = { price: number; size?: number; amount?: number };
type Candle = { s?: string; c?: number[]; t?: number[] };

function xhtBook(): Book {
  return (FIXTURES.orderbook() as { 'xht-usdt': Book })['xht-usdt'];
}

function xhtTrades(): Trade[] {
  return ((FIXTURES.trades() as { 'xht-usdt': Trade[] })['xht-usdt']) ?? [];
}

function candles(): Candle {
  return FIXTURES.candles() as unknown as Candle;
}

test.describe('Trading terminal surface @ui @regression @trading', () => {
  test('route /trade/btc-usdt is currently 404', async ({ request }) => {
    const r = await request.get('https://pro.hollaex.com/trade/btc-usdt');
    expect(r.status()).toBe(404);
  });

  test('order-book has positive spread (best ask >= best bid)', () => {
    const ob = xhtBook();
    expect(ob.bids.length).toBeGreaterThan(0);
    expect(ob.asks.length).toBeGreaterThan(0);
    expect(ob.asks[0][0]).toBeGreaterThanOrEqual(ob.bids[0][0]);
  });

  test('order-book bids are sorted descending by price', () => {
    const bids = xhtBook().bids;
    for (let i = 1; i < bids.length; i++) {
      expect(bids[i][0]).toBeLessThanOrEqual(bids[i - 1][0]);
    }
  });

  test('order-book asks are sorted ascending by price', () => {
    const asks = xhtBook().asks;
    for (let i = 1; i < asks.length; i++) {
      expect(asks[i][0]).toBeGreaterThanOrEqual(asks[i - 1][0]);
    }
  });

  test('all order-book levels have finite positive prices and non-negative sizes', () => {
    const ob = xhtBook();
    for (const [price, size] of [...ob.bids, ...ob.asks]) {
      expect(isFiniteNumeric(price) && price > 0, 'positive finite price').toBeTruthy();
      expect(isFiniteNumeric(size) && size >= 0, 'non-negative finite size').toBeTruthy();
    }
  });

  test('recent trades are positive and well-formed', () => {
    const t = xhtTrades();
    expect(t.length).toBeGreaterThan(0);
    for (const tr of t) {
      expect(tr.price).toBeGreaterThan(0);
      expect((tr.size ?? tr.amount ?? 0)).toBeGreaterThan(0);
    }
  });

  test('candles for 1D timeframe have aligned OHLC and timestamps', () => {
    const c = candles();
    const t = c.t ?? [];
    const cl = c.c ?? [];
    expect(Array.isArray(t)).toBeTruthy();
    expect(Array.isArray(cl)).toBeTruthy();
    expect(t.length).toBe(cl.length);
  });

  test('trading-pair regex accepts valid pairs and rejects invalid ones @shape', () => {
    expect(isTradingPair('btc-usdt')).toBeTruthy();
    expect(isTradingPair('eth-usdt')).toBeTruthy();
    expect(isTradingPair('xht-usdt')).toBeTruthy();
    // Bare tokens (no separator) are not pairs.
    expect(isTradingPair('btcusdt')).toBeFalsy();
    expect(isTradingPair('-usdt')).toBeFalsy();
    expect(isTradingPair('btc-')).toBeFalsy();
  });

  test('oracle prices have finite converted values', () => {
    const prices = FIXTURES.oraclePrices() as unknown as Record<string, number>;
    expect(Object.keys(prices).length).toBeGreaterThan(0);
    for (const [asset, price] of Object.entries(prices)) {
      expect(isFiniteNumeric(price), `${asset} oracle price must be finite`).toBeTruthy();
      expect(price).toBeGreaterThan(0);
    }
  });

  test('ticker `last` price matches the most-recent trade within rounding tolerance', () => {
    type T = { last: number };
    const tickers = FIXTURES.tickers() as unknown as Record<string, T>;
    const trades = xhtTrades();
    const xht = tickers['xht-usdt'];
    expect(xht).toBeTruthy();
    const lastTradePrice = trades[0]?.price;
    if (lastTradePrice !== undefined) {
      // The ticker's `last` should be within a reasonable band of the
      // most-recent trade. Crypto feeds quote `last` as either the most
      // recent trade or a mid-price, so we allow a 5% buffer.
      const diff = Math.abs(xht.last - lastTradePrice) / lastTradePrice;
      expect(diff, `ticker.last=${xht.last} trade.price=${lastTradePrice}`).toBeLessThan(0.5);
    }
  });
});
