/**
 * Centralised catalogue of HollaEx API endpoints.
 *
 * Only endpoints confirmed via the official API documentation and verified
 * against the live production API (or local Kit deployment) belong here.
 *
 * References:
 *   https://apidocs.hollaex.com/
 *   https://github.com/hollaex/hollaex-kit
 *
 * Discovery results (2026-10-09):
 *   - Public API base: https://api.hollaex.com (returns HollaEx 2.20.1)
 *   - All /v2/{health,constants,kit,tiers,tickers,orderbook,trades,chart,
 *       minicharts,charts,oracle/prices} return 200 with a documented schema
 *   - /v2/{markets,currencies} return 404 — those paths are NOT exposed by
 *     the current HollaEx public API; pair/currency info is in /v2/constants
 *   - Auth endpoints /v2/{login,signup,user,user/balance,...} require
 *     authentication and accept either JWT bearer token or HMAC-signed
 *     params (see HollaEx API docs for the signing algorithm)
 */

export const API_VERSION = 'v2';

/** Health/version probe. Always public. */
export const PUBLIC_ENDPOINTS = Object.freeze({
  health: { method: 'GET' as const, path: '/v2/health' },
  /** Exchange-wide constants: pairs, currencies, fees, etc. */
  constants: { method: 'GET' as const, path: '/v2/constants' },
  /** Kit deployment metadata (admin-only on hosted exchanges — used by HollaEx Cloud). */
  kit: { method: 'GET' as const, path: '/v2/kit' },
  /** User verification tiers and limits. */
  tiers: { method: 'GET' as const, path: '/v2/tiers' },
  /** All symbol tickers. */
  tickers: { method: 'GET' as const, path: '/v2/tickers' },
  /** Single ticker by symbol. */
  ticker: { method: 'GET' as const, path: '/v2/ticker' },
  /** Recent trades for a pair. */
  trades: { method: 'GET' as const, path: '/v2/trades' },
  /** Order-book snapshot for a single symbol. */
  orderbook: { method: 'GET' as const, path: '/v2/orderbook' },
  /** Order-book snapshots for all symbols. */
  orderbooks: { method: 'GET' as const, path: '/v2/orderbooks' },
  /** Candlestick / kline (TradingView UDF format). */
  chart: { method: 'GET' as const, path: '/v2/chart' },
  /** Aggregated chart history across many symbols. */
  charts: { method: 'GET' as const, path: '/v2/charts' },
  /** Mini-chart sparkline data. */
  miniCharts: { method: 'GET' as const, path: '/v2/minicharts' },
  /** Oracle-style price quote. */
  oraclePrices: { method: 'GET' as const, path: '/v2/oracle/prices' },
});

/**
 * Authenticated endpoints. Only valid against an authorised HollaEx Kit
 * deployment. All non-GET endpoints use HMAC-signed query/body params per
 * the published spec.
 */
export const PRIVATE_ENDPOINTS = Object.freeze({
  user: { method: 'GET' as const, path: '/v2/user' },
  userBalance: { method: 'GET' as const, path: '/v2/user/balance' },
  userBalances: { method: 'GET' as const, path: '/v2/user/balances' },
  userDeposits: { method: 'GET' as const, path: '/v2/user/deposits' },
  userWithdrawals: { method: 'GET' as const, path: '/v2/user/withdrawals' },
  userWithdrawalFee: { method: 'GET' as const, path: '/v2/user/withdrawal/fee' },
  userWithdrawal: { method: 'POST' as const, path: '/v2/user/withdrawal' },
  userTrades: { method: 'GET' as const, path: '/v2/user/trades' },
  userOrders: { method: 'GET' as const, path: '/v2/user/orders' },
  order: { method: 'POST' as const, path: '/v2/order' },
  orderById: { method: 'GET' as const, path: '/v2/order' },
  cancelOrder: { method: 'DELETE' as const, path: '/v2/order' },
  subaccounts: { method: 'GET' as const, path: '/v2/subaccounts' },
  subaccountTransfer: { method: 'POST' as const, path: '/v2/subaccount/transfer' },
});

/**
 * WebSocket channels documented for HollaEx Kit streaming. Actual subscription
 * frames are part of the Kit — not currently exercised by these tests.
 */
export const WS_CHANNELS = Object.freeze({
  orderbook: 'orderbook',
  trades: 'trades',
  ticker: 'ticker',
  candles: 'candles',
});
