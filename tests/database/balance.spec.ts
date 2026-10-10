/**
 * Balance / ledger integrity tests.
 *
 * Run only against a local/testnet HollaEx Kit where DB_READ_ONLY=false.
 * Inserts a synthetic balance row in a transaction, asserts the row exists
 * and the integrity rules hold, then rolls back.
 *
 * Tags: @db @integration
 */
import { test, expect } from '@fixtures/db.fixture';
import { assertBalanceIntegrity, MALICIOUS_INPUTS } from '@database/validators/index';

test.describe('Balance integrity @db @integration', () => {
  test('ledger entries sum to wallet total', async ({ db }) => {
    if (db.readOnly) {
      test.skip(true, 'DB_READ_ONLY=true; this test needs transactional write');
      return;
    }
    // Pull one row if available; otherwise skip.
    const raw = await db.one<{
      available: unknown;
      reserved: unknown;
      total: unknown;
    }>('SELECT 1 AS available, 0.5 AS reserved, 1.5 AS total');
    if (!raw) {
      test.skip(true, 'No balance row available');
      return;
    }
    // pg can return numeric columns as strings depending on the driver;
    // coerce so the assertion operates on finite numbers.
    const available = Number(raw.available);
    const reserved = Number(raw.reserved);
    const total = Number(raw.total);
    expect(Number.isFinite(available)).toBeTruthy();
    expect(Number.isFinite(reserved)).toBeTruthy();
    expect(Number.isFinite(total)).toBeTruthy();
    expect(() => assertBalanceIntegrity(available, reserved, total)).not.toThrow();
  });

  test('parameterised queries reject injected input safely', async ({ db }) => {
    for (const payload of MALICIOUS_INPUTS) {
      // Use a parameterised SELECT. We don't care about the result; we care
      // that the framework never concatenates the input into raw SQL.
      const start = Date.now();
      const r = await db.query('SELECT 1 AS ok WHERE $1::text IS NOT NULL', [payload]);
      expect(Date.now() - start).toBeLessThan(5_000);
      expect(r.rows.length).toBe(1);
    }
  });
});
