/**
 * Common test fixtures barrel — exports the union of fixture types so
 * consumers can import `test`/`expect` from one place.
 *
 * NOTE: We deliberately do NOT re-export `test` here because each fixture
 * file defines its own typed `test`. Importing the right one explicitly is
 * how the fixture's types flow to consumers:
 *
 *     import { test, expect } from '@fixtures/api.fixture';
 */
export type { ApiFixtures } from './api.fixture';
export type { DbFixtures } from './db.fixture';
export type { AuthFixtures } from './auth.fixture';
