/**
 * Reusable validators that turn database rows into semantic assertions.
 *
 * These are pure functions — they throw on failure and return `undefined`
 * on success. They don't talk to Playwright directly so they can be reused
 * from integration tests and from one-shot scripts.
 */
import { expect } from '@utils/assertions';

export function assertPositiveFinite(name: string, value: unknown): asserts value is number {
  expect(typeof value, `${name} should be a number`).toBe('number');
  expect(Number.isFinite(value), `${name} should be finite`).toBeTruthy();
  expect(value, `${name} should be > 0`).toBeGreaterThan(0);
}

export function assertNonNegativeFinite(name: string, value: unknown): asserts value is number {
  expect(typeof value, `${name} should be a number`).toBe('number');
  expect(Number.isFinite(value), `${name} should be finite`).toBeTruthy();
  expect(value, `${name} should be >= 0`).toBeGreaterThanOrEqual(0);
}

export function assertBalanceIntegrity(
  available: number,
  reserved: number,
  total: number,
): void {
  assertNonNegativeFinite('available', available);
  assertNonNegativeFinite('reserved', reserved);
  assertNonNegativeFinite('total', total);
  expect(
    available + reserved,
    'balance accounting: total must equal available + reserved',
  ).toBeCloseTo(total, 6);
}

/**
 * Reject SQL injection-shaped payloads that would be illegal to interpolate.
 * Used by the SQL security tests to assert the framework's input handling.
 */
export const MALICIOUS_INPUTS = Object.freeze([
  "'; DROP TABLE users;--",
  "' OR '1'='1",
  '"; DELETE FROM balances WHERE 1=1; --',
  '\\x27 UNION SELECT * FROM admin_users--',
]);
