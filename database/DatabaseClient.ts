/**
 * PostgreSQL client wrapper for HollaEx Kit verification.
 *
 * Uses connection pooling so multiple tests can share the same client.
 * Read-only mode is enforced by default for safety on shared environments.
 *
 * Reference schema: see `docs/database-schema.md`. The schema below is
 * deliberately generic — concrete tables only become part of the suite once
 * they're verified in the live HollaEx Kit database.
 */
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env } from '@config/environments';
import { logger } from '@utils/logger';

export interface DatabaseClientOptions {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  /** If true, only SELECT queries can be issued. */
  readOnly?: boolean;
  /** Max pool size. */
  max?: number;
}

const WRITE_KEYWORDS = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create)\b/i;

export class DatabaseClient {
  private pool?: Pool;
  public readonly readOnly: boolean;

  constructor(opts: DatabaseClientOptions = {}) {
    this.readOnly = opts.readOnly ?? env.dbReadOnly;
    const config: PoolConfig = {
      host: opts.host ?? env.dbHost,
      port: opts.port ?? env.dbPort,
      database: opts.database ?? env.dbName,
      user: opts.user ?? env.dbUser,
      password: opts.password ?? env.dbPassword,
      max: opts.max ?? 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    };
    this.pool = new Pool(config);
  }

  async init(): Promise<void> {
    if (!this.pool) return;
    try {
      const r = await this.pool.query('SELECT 1 AS ok');
      logger.info('db:init:ok', { ok: r.rows[0]?.ok });
    } catch (err) {
      logger.warn('db:init:failed', { error: (err as Error).message });
      throw err;
    }
  }

  async dispose(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }

  /**
   * Execute a SQL statement. Parameterised queries are enforced via the
   * `params` argument — never string-interpolate user input.
   */
  async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<QueryResult<R>> {
    if (this.readOnly && WRITE_KEYWORDS.test(sql)) {
      throw new Error(
        `Refusing write query against read-only database. Set DB_READ_ONLY=false ` +
          `(and confirm the environment is safe) to enable writes.`,
      );
    }
    if (!this.pool) throw new Error('DatabaseClient not initialised');
    return this.pool.query<R>(sql, params as unknown[]);
  }

  async one<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<R | undefined> {
    const r = await this.query<R>(sql, params);
    return r.rows[0];
  }

  async all<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<R[]> {
    const r = await this.query<R>(sql, params);
    return r.rows;
  }

  /**
   * Run a function inside a transaction. The transaction is rolled back on
   * any thrown error. Even though we don't enable writes, the wrapping is
   * useful for tests that switch DB_READ_ONLY off in isolated environments.
   */
  async transaction<T>(fn: (client: DatabaseClient) => Promise<T>): Promise<T> {
    if (this.readOnly) {
      throw new Error('transaction() requires DB_READ_ONLY=false');
    }
    if (!this.pool) throw new Error('DatabaseClient not initialised');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient = new DatabaseClient({ readOnly: false }) as unknown as {
        query: <R extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<QueryResult<R>>;
      };
      // Replace pool with this dedicated client for the duration.
      (txClient as unknown as { pool?: Pool }).pool = { query: client.query.bind(client) } as unknown as Pool;
      const result = await fn(txClient as unknown as DatabaseClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Lightweight helper: assert a table exists in the current database.
 */
export async function tableExists(db: DatabaseClient, tableName: string): Promise<boolean> {
  const r = await db.one<{ count: string }>(
    `SELECT COUNT(*) AS count FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = $1`,
    [tableName],
  );
  return Number(r?.count ?? 0) > 0;
}
