/**
 * Schema-discovery queries used by the database test suite to verify the
 * HollaEx Kit's PostgreSQL schema actually contains the expected tables,
 * columns, and constraints.
 */
export const QUERIES = Object.freeze({
  /** All tables in the public schema. */
  allTables: `SELECT table_name FROM information_schema.tables
              WHERE table_schema = current_schema()
              ORDER BY table_name`,

  /** List a table's columns. */
  columnsFor: (tableName: string) =>
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = '${tableName.replace(/'/g, "''")}'
       ORDER BY ordinal_position`,

  /** Foreign-key constraints for a table. */
  foreignKeysFor: (tableName: string) =>
    `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = current_schema()
        AND tc.table_name = '${tableName.replace(/'/g, "''")}'`,

  /** Indexes on a table. */
  indexesFor: (tableName: string) =>
    `SELECT indexname, indexdef FROM pg_indexes
       WHERE schemaname = current_schema() AND tablename = '${tableName.replace(/'/g, "''")}'`,
});
