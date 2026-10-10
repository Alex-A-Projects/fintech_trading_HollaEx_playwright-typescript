/**
 * Zod schemas for verified HollaEx public API responses.
 *
 * Discovery source: subagent report 2026-10-09 + manual probes against
 *   https://api.hollaex.com/v2/...
 *
 * Verified facts that shaped these schemas:
 *   - Order book responses are wrapped in a pair-keyed envelope OR a naked
 *     object. Either is acceptable.
 *   - Each order book entry includes a top-level `timestamp` ISO field.
 *   - Constants payload has `coins` and `pairs` keys (NOT /v2/markets or
 *     /v2/currencies).
 *   - Trade objects use `size` not `amount`; some older payloads use `time`
 *     and some use `timestamp`.
 *   - Auth is HMAC-signed (api-key / api-signature / api-expires), not JWT.
 */
import { z } from 'zod';

// ---------- primitives ----------

export const Iso8601Schema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'must be ISO-8601 UTC');

export const SymbolSchema = z
  .string()
  .regex(/^[a-z0-9]{2,10}-[a-z0-9]{2,10}$/i, 'must look like btc-usdt');

export const NumericStringSchema = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform((v) => (typeof v === 'number' ? v : Number(v)));

const finiteNumber = z
  .number()
  .refine((n) => Number.isFinite(n), { message: 'must be finite' });

// ---------- ticker ----------

const TickerBase = z.object({
  symbol: SymbolSchema,
  open: finiteNumber,
  close: finiteNumber,
  high: finiteNumber,
  low: finiteNumber,
  last: finiteNumber,
  volume: z.number().nonnegative(),
  time: Iso8601Schema.optional(),
  timestamp: Iso8601Schema.optional(),
});

export const TickerSchema: z.ZodType<z.infer<typeof TickerBase>> = TickerBase;
export const TickersEnvelopeSchema = z.record(z.string(), TickerBase);
export const SingleTickerEnvelopeSchema = z.union([
  z.record(z.string(), TickerBase),
  TickerBase,
]);

// ---------- order book ----------

const OrderBookLevelSchema = z.tuple([finiteNumber, z.number().nonnegative()]);

export const OrderBookSchema = z
  .object({
    bids: z.array(OrderBookLevelSchema),
    asks: z.array(OrderBookLevelSchema),
    timestamp: Iso8601Schema.optional(),
  })
  .passthrough();

export const OrderBookEnvelopeSchema = z.union([
  z.record(z.string(), OrderBookSchema),
  OrderBookSchema,
]);

// ---------- trades ----------

export const PublicTradeSchema = z
  .object({
    tid: z.union([z.string(), z.number()]).optional(),
    price: finiteNumber,
    size: z.number().nonnegative(),
    amount: z.number().nonnegative().optional(),
    date: Iso8601Schema.optional(),
    timestamp: Iso8601Schema.optional(),
    time: Iso8601Schema.optional(),
    side: z.enum(['buy', 'sell']).optional(),
  })
  .passthrough();

export const TradesEnvelopeSchema = z.union([
  z.array(PublicTradeSchema),
  z.record(z.string(), z.array(PublicTradeSchema)),
]);

// ---------- chart (UDF-style) ----------

export const ChartSchema = z
  .object({
    c: z.array(finiteNumber).optional(),
    o: z.array(finiteNumber).optional(),
    h: z.array(finiteNumber).optional(),
    l: z.array(finiteNumber).optional(),
    v: z.array(z.number().nonnegative()).optional(),
    t: z.array(z.number()).optional(),
    s: z.enum(['ok', 'no_data', 'error']).optional(),
  })
  .passthrough();

// ---------- constants (large envelope) ----------

export const CurrencySchema = z
  .object({
    id: z.number().int().nonnegative(),
    fullname: z.string(),
    symbol: z.string().min(2).max(12),
    active: z.boolean(),
    verified: z.boolean().optional(),
    allow_deposit: z.boolean().optional(),
    allow_withdrawal: z.boolean().optional(),
    withdrawal_fee: NumericStringSchema.optional(),
    min: NumericStringSchema.optional(),
    max: NumericStringSchema.optional(),
    increment_unit: NumericStringSchema.optional(),
    logo: z.string().url().optional(),
    code: z.string().optional(),
    is_public: z.boolean().optional(),
    network: z.string().optional(),
    issuer: z.string().optional(),
    type: z.string().optional(),
    is_risky: z.boolean().optional(),
    estimated_price: finiteNumber.optional(),
    withdrawal_fees: z.record(z.string(), z.unknown()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const PairSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    symbol: SymbolSchema,
    base: z.string(),
    quote: z.string(),
    active: z.boolean(),
    is_public: z.boolean().optional(),
    description: z.string().optional(),
    taker_fee: NumericStringSchema.optional(),
    maker_fee: NumericStringSchema.optional(),
    min_size: NumericStringSchema.optional(),
    max_size: NumericStringSchema.optional(),
    min_price: NumericStringSchema.optional(),
    max_price: NumericStringSchema.optional(),
    increment_unit: NumericStringSchema.optional(),
    listed: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ConstantsSchema = z
  .object({
    coins: z.record(z.string(), CurrencySchema),
    pairs: z.record(z.string(), PairSchema).optional(),
  })
  .passthrough();

// ---------- tiers ----------

export const TierSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    icon: z.string().optional(),
    description: z.string().optional(),
    fees: z.record(z.string(), z.record(z.string(), z.number().nonnegative())).optional(),
    deposit_limit: NumericStringSchema.optional(),
    withdrawal_limit: NumericStringSchema.optional(),
    note: z.string().optional(),
  })
  .passthrough();

export const TiersSchema = z.record(z.string(), TierSchema);

// ---------- health ----------

export const HealthSchema = z.object({
  name: z.string(),
  version: z.string(),
  host: z.string().url().optional(),
  domain: z.string().url().optional(),
  basePath: z.string().optional(),
  uptime: z.number().nonnegative(),
});

// ---------- oracle / kit ----------
export const OraclePricesSchema = z.record(z.string(), z.number());
export const KitSchema = z.record(z.string(), z.unknown());
