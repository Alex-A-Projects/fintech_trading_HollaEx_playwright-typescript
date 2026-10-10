/**
 * Reusable domain-specific assertions for trading, numeric formatting, and
 * HollaEx response shapes. Tests can `import { expect } from '@utils/assertions'`
 * for tight, intent-revealing matchers.
 */
import { expect as baseExpect } from '@playwright/test';

export const tradingPairRegex = /^[a-z0-9]{2,10}-[a-z0-9]{2,10}$/i;

export function isTradingPair(value: string): boolean {
  return tradingPairRegex.test(value);
}

export const numericString = /^-?\d+(\.\d+)?$/;

export const iso8601Utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;

export function isIsoTimestamp(value: string): boolean {
  return iso8601Utc.test(value);
}

export function isFiniteNumeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Assert that a price-change percentage is plausible. Crypto markets move fast
 * but we still cap expected change so a flaky feed doesn't mask a bug.
 */
export function assertPlausible24hChange(change: number): void {
  baseExpect(Number.isFinite(change), `change ${change} is not a number`).toBeTruthy();
  baseExpect(change).toBeGreaterThanOrEqual(-99);
  baseExpect(change).toBeLessThanOrEqual(10_000);
}

/**
 * Asserts that a numeric amount respects a precision bound. Counts decimal
 * places; assumes no scientific notation.
 */
export function assertPrecision(value: number, maxDecimals: number): void {
  const s = value.toString();
  const idx = s.indexOf('.');
  const decimals = idx === -1 ? 0 : s.length - idx - 1;
  baseExpect(decimals, `value ${value} has ${decimals} decimals, max is ${maxDecimals}`).toBeLessThanOrEqual(
    maxDecimals,
  );
}

export const expect = baseExpect;
