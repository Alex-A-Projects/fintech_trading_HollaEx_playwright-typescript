/**
 * Static test data shared across the suite. Anything user-specific or
 * time-dependent lives in fixtures/factories — only stable, public,
 * non-sensitive values live here.
 */

export const KNOWN_TRADING_PAIRS = Object.freeze([
  'btc-usdt',
  'eth-usdt',
  'xrp-usdt',
  'ltc-usdt',
  'bch-usdt',
  'bnb-usdt',
  'ada-usdt',
  'doge-usdt',
  'sol-usdt',
  'matic-usdt',
]);

export const KNOWN_QUOTE_CURRENCIES = Object.freeze(['usdt', 'btc', 'eth', 'busd']);

export const UNSUPPORTED_TRADING_PAIRS = Object.freeze([
  'foo-bar',
  'zzz-yyy',
  'not-a-pair',
  'this-is-not-a-symbol',
  '../../../etc/passwd',
  '<script>alert(1)</script>',
]);

/**
 * Search keywords used by the markets page test. Pairs vary across exchanges
 * so we keep this curated list of common ones plus a small number of negative
 * cases.
 */
export const MARKET_SEARCH_KEYWORDS = Object.freeze({
  valid: ['btc', 'BTC', 'btc-usdt', 'BTC-USDT', 'eth', 'ETH'],
  invalid: ['zzzznotreal', 'no-such-coin-xyz', 'NOTAREALCOIN123'],
  special: ["O'Reilly", '<script>alert(1)</script>', '../../etc/passwd', '   '],
  empty: [''],
  long: ['x'.repeat(256), 'a'.repeat(1024)],
  whitespace: ['  btc  ', 'btc\n', '\tbtc\t'],
});

export const TIMEFRAMES = Object.freeze([
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
]);

/**
 * Viewport presets for responsive testing.
 */
export const VIEWPORTS = Object.freeze({
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  mobileSmall: { width: 360, height: 640 },
});

/**
 * Order side / type values accepted by the documented API.
 */
export const ORDER_SIDES = Object.freeze(['buy', 'sell'] as const);
export const ORDER_TYPES = Object.freeze(['limit', 'market'] as const);

export type OrderSide = (typeof ORDER_SIDES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];

/**
 * Documented error codes observed on the public API. Extend as we discover
 * more during execution.
 */
export const ERROR_CODES = Object.freeze({
  invalidCredentials: 'INVALID_CREDENTIALS',
  invalidToken: 'INVALID_TOKEN',
  missingToken: 'TOKEN_REQUIRED',
  rateLimited: 'RATE_LIMIT_EXCEEDED',
  invalidSymbol: 'INVALID_SYMBOL',
  invalidAmount: 'INVALID_AMOUNT',
  invalidPrice: 'INVALID_PRICE',
  insufficientFunds: 'INSUFFICIENT_FUNDS',
  notFound: 'NOT_FOUND',
  validationError: 'INVALID_INPUT',
  serverError: 'SERVER_ERROR',
});
