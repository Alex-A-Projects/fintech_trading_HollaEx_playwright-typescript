/**
 * Database test fixtures.
 *
 * Two-layer behaviour:
 *
 * 1. `production-readonly` env → DB tests skip with a clear pointer to
 *    `docker/README.md` so the developer can bring the HollaEx Kit up.
 * 2. The fixture then tries to reach `localhost:5432` (10s timeout). If
 *    the connection fails, the test skips with the actual error so the
 *    user can quickly diagnose missing Docker / wrong port / wrong
 *    credentials.
 *
 * Tags: @db
 */
import { test as base, TestInfo } from '@playwright/test';
import { DatabaseClient } from '@database/DatabaseClient';
import { env } from '@config/environments';
import { logger } from '@utils/logger';

export type DbFixtures = {
  db: DatabaseClient;
};

export const test = base.extend<DbFixtures>({
  db: async ({}, use, testInfo: TestInfo) => {
    if (env.isProductionReadonly) {
      logger.info('db:skip', {
        test: testInfo.title,
        reason: 'production-readonly env — DB tests need a local/testnet HollaEx Kit',
      });
      testInfo.skip(
        true,
        'Database tests require HOLLAEX_ENV=local or HOLLAEX_ENV=testnet. ' +
          'Bring up the HollaEx Kit per docker/README.md and re-run.',
      );
      return;
    }
    const client = new DatabaseClient({ readOnly: env.dbReadOnly });
    try {
      await client.init();
    } catch (err) {
      const reason = (err as Error).message;
      logger.warn('db:init:failed', { test: testInfo.title, reason });
      testInfo.skip(
        true,
        `Database unavailable: ${reason}. ` +
          `Bring up the HollaEx Kit per docker/README.md ` +
          `(Postgres on ${env.dbHost}:${env.dbPort}).`,
      );
      return;
    }
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
