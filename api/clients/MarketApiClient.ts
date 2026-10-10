/**
 * Public-market API client. Verified endpoints from
 *   https://apidocs.hollaex.com/
 *   live probes against https://api.hollaex.com (subagent report 2026-10-09)
 */
import {
  HealthSchema,
  ConstantsSchema,
  TickersEnvelopeSchema,
  SingleTickerEnvelopeSchema,
  OrderBookEnvelopeSchema,
  TradesEnvelopeSchema,
  ChartSchema,
  KitSchema,
  TiersSchema,
  OraclePricesSchema,
} from '../schemas/market';
import { z } from 'zod';
import { parseWithSchema } from '@utils/testHelpers';
import { BaseApiClient, QueryParams } from './BaseApiClient';
import { PUBLIC_ENDPOINTS } from '@config/endpoints';
import { ApiError } from './BaseApiClient';

export class MarketApiClient extends BaseApiClient {
  async getHealth() {
    return parseWithSchema(HealthSchema, await this.get(PUBLIC_ENDPOINTS.health.path));
  }

  async getConstants() {
    return parseWithSchema(ConstantsSchema, await this.get(PUBLIC_ENDPOINTS.constants.path));
  }

  async getKit() {
    return parseWithSchema(KitSchema, await this.get(PUBLIC_ENDPOINTS.kit.path));
  }

  async getTiers() {
    return parseWithSchema(TiersSchema, await this.get(PUBLIC_ENDPOINTS.tiers.path));
  }

  /** All tickers keyed by symbol. */
  async getTickers(): Promise<z.infer<typeof TickersEnvelopeSchema>> {
    return parseWithSchema(TickersEnvelopeSchema, await this.get(PUBLIC_ENDPOINTS.tickers.path));
  }

  async getTicker(symbol: string): Promise<z.infer<typeof SingleTickerEnvelopeSchema>> {
    const params: QueryParams = { symbol };
    const raw = await this.get<unknown>(PUBLIC_ENDPOINTS.ticker.path, params);
    // The endpoint accepts a pair and returns either a single object or a
    // pair-keyed envelope. We accept both.
    return parseWithSchema(SingleTickerEnvelopeSchema, raw) as z.infer<typeof SingleTickerEnvelopeSchema>;
  }

  async getOrderBook(symbol: string): Promise<z.infer<typeof OrderBookEnvelopeSchema>> {
    return parseWithSchema(
      OrderBookEnvelopeSchema,
      await this.get(PUBLIC_ENDPOINTS.orderbook.path, { symbol }),
    );
  }

  async getAllOrderBooks(): Promise<z.infer<typeof OrderBookEnvelopeSchema>> {
    return parseWithSchema(OrderBookEnvelopeSchema, await this.get(PUBLIC_ENDPOINTS.orderbooks.path));
  }

  async getTrades(symbol?: string): Promise<z.infer<typeof TradesEnvelopeSchema>> {
    const params: QueryParams = symbol ? { symbol } : {};
    return parseWithSchema(TradesEnvelopeSchema, await this.get(PUBLIC_ENDPOINTS.trades.path, params));
  }

  /**
   * Chart request using the TradingView UDF format. Returns either the
   * standard {s,c,o,h,l,v,t} envelope or an empty list (older deployments).
   * Always returns the parsed schema — empty arrays are normalised to an
   * "ok"-status empty record.
   */
  async getChart(symbol: string, resolution: string, from: number, to: number) {
    const raw = await this.get(PUBLIC_ENDPOINTS.chart.path, { symbol, resolution, from, to });
    if (Array.isArray(raw)) {
      return { s: 'ok' as const, c: [], o: [], h: [], l: [], v: [], t: [] };
    }
    return parseWithSchema(ChartSchema, raw);
  }

  async getOraclePrices(assets: string, quote = 'usdt', amount = 1) {
    return parseWithSchema(
      OraclePricesSchema,
      await this.get(PUBLIC_ENDPOINTS.oraclePrices.path, { assets, quote, amount } as unknown as Record<string, string>),
    );
  }

  async getMiniCharts(assets: string, quote?: string, from?: number, to?: number) {
    const params: Record<string, string> = { assets };
    if (quote) params.quote = quote;
    if (from !== undefined) params.from = String(from);
    if (to !== undefined) params.to = String(to);
    return this.get(PUBLIC_ENDPOINTS.miniCharts.path, params);
  }

  async getCharts(resolution: string, from: number, to: number) {
    return this.get(PUBLIC_ENDPOINTS.charts.path, {
      resolution,
      from: String(from),
      to: String(to),
    });
  }

  /**
   * Returns the raw response (with status, headers, timing) for an endpoint
   * call. Used by tests that need to assert HTTP-level semantics.
   */
  async rawTickers(): Promise<{ status: number; contentType: string; ms: number; body: unknown }> {
    const start = Date.now();
    const res = await this.rawGet(PUBLIC_ENDPOINTS.tickers.path);
    const ms = Date.now() - start;
    const contentType = res.headers()['content-type'] ?? '';
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    if (!res.ok()) {
      throw new ApiError(`Tickers request failed: ${res.status()}`, res.status(), PUBLIC_ENDPOINTS.tickers.path, body);
    }
    return { status: res.status(), contentType, ms, body };
  }
}
