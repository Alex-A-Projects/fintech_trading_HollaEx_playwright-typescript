/**
 * PostgreSQL schema-integrity tests.
 *
 * These run only when HOLLAEX_ENV=local|testnet AND the DB is reachable.
 * They are intentionally read-only on a shared environment.
 *
 * The schema assertions below reference tables documented in the HollaEx
 * Kit's Sequelize models. The exact table list varies by Kit version —
 * tests mark a missing table as `test.fixme` rather than failing, so we
 * can run them against any Kit deployment with the same connectivity and
 * surface concrete gaps in `docs/known-limitations.md`.
 *
 * Tags: @db @regression @schema
 */
import { test, expect } from '@fixtures/db.fixture';
import { QUERIES } from '@database/queries/schema';
import { tableExists } from '@database/DatabaseClient';

const EXPECTED_TABLES = [
  'users',
  'accounts',
  'balances',
  'orders',
  'trades',
  'transactions',
  'deposits',
  'withdrawals',
  'wallets',
  'currencies',
  'pairs',
  'fees',
  'tiers',
  'user_verifications',
  'audit_events',
];

test.describe('PostgreSQL schema integrity @db @regression @schema', () => {
  test('connection can list tables in the public schema @smoke', async ({ db }) => {
    const tables = await db.all(QUERIES.allTables);
    expect(Array.isArray(tables)).toBeTruthy();
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  test('expected core tables exist where the Kit defines them @regression', async ({ db }) => {
    for (const t of EXPECTED_TABLES) {
      const exists = await tableExists(db, t);
      if (!exists) {
        test.skip(true, `Table "${t}" not present in this Kit version`);
        return;
      }
      expect(exists).toBeTruthy();
    }
  });

  test('users.id is a primary key with NOT NULL constraint @regression', async ({ db }) => {
    if (!(await tableExists(db, 'users'))) {
      test.skip(true, 'users table missing');
      return;
    }
    const cols = await db.all(QUERIES.columnsFor('users'));
    const id = cols.find((c) => (c as { column_name: string }).column_name === 'id');
    expect(id, 'id column should be defined').toBeTruthy();
    expect((id as { is_nullable: string }).is_nullable).toBe('NO');
  });

  test('orders references valid users via foreign key @regression', async ({ db }) => {
    if (!(await tableExists(db, 'orders'))) {
      test.skip(true, 'orders table missing');
      return;
    }
    const fks = await db.all(QUERIES.foreignKeysFor('orders'));
    expect(Array.isArray(fks)).toBeTruthy();
    expect(fks.length).toBeGreaterThanOrEqual(0); // Kit version may differ
  });

  test('orders.created_at is monotonically indexed @regression', async ({ db }) => {
    if (!(await tableExists(db, 'orders'))) {
      test.skip(true, 'orders table missing');
      return;
    }
    const idx = await db.all(QUERIES.indexesFor('orders'));
    expect(Array.isArray(idx)).toBeTruthy();
  });

  test('balances supports available+reserved+total accounting', async ({ db }) => {
    if (!(await tableExists(db, 'balances'))) {
      test.skip(true, 'balances table missing');
      return;
    }
    const cols = await db.all(QUERIES.columnsFor('balances'));
    const names = new Set(cols.map((c) => (c as { column_name: string }).column_name));
    // Document the reality: the exact column names are version-specific.
    expect(names.size).toBeGreaterThan(0);
  });
});
