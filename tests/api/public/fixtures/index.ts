/**
 * Fixture loader for the public-API test suite.
 *
 * Real responses captured from `api.hollaex.com` while it was reachable.
 * Once the live endpoint is verified working, the framework can opt in
 * to live-fetch via `LIVE_API=true`; otherwise the fixtures are the
 * authoritative source of "what HollaEx is documented to return".
 *
 * This makes the framework deterministic in any environment (CI, local,
 * offline) and exercises the same Zod schemas that the live `MarketApiClient`
 * applies. The fixture files are JSON so they can be diff-reviewed.
 */
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname);

function read<T>(name: string): T {
  const file = path.join(FIXTURES_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Fixture missing: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

export const FIXTURES = Object.freeze({
  health: () => read<{
    name: string;
    version: string;
    host: string;
    domain: string;
    basePath: string;
    uptime: number;
  }>('health.json'),
  constants: () => read<{
    coins: Record<string, Record<string, unknown>>;
    pairs?: Record<string, Record<string, unknown>>;
  }>('constants.json'),
  tickers: () => read<Record<string, Record<string, unknown>>>('ticker-btc-usdt.json'),
  orderbook: () => read<Record<string, Record<string, unknown>>>('orderbook-xht-usdt.json'),
  trades: () => read<Record<string, unknown[]>>('trades-xht-usdt.json'),
  oraclePrices: () => read<Record<string, number>>('oracle-prices.json'),
  kitMetadata: () => read<Record<string, unknown>>('kit-metadata.json'),
  tiers: () => read<Record<string, Record<string, unknown>>>('tiers-catalog.json'),
  candles: () => read<Record<string, unknown>>('candles-1d.json'),
});

/**
 * Strategy flag — set to `true` to additionally hit the live API at
 * runtime; default is to use fixtures only.
 */
export const USE_LIVE_API = process.env.HOLLAEX_QA_LIVE_API === 'true';
