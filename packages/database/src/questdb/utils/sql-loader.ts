/**
 * SQL Query Loader Utility
 * Loads SQL queries from @repo/schema/sql/ directory
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";

/**
 * Load SQL query from @repo/schema/sql/
 * @param queryPath - Path relative to sql/ directory (e.g., 'candles/select-by-time-range')
 * @returns SQL query string
 */
export function loadSqlQuery(queryPath: string): string {
  const sqlPath = queryPath.endsWith(".sql") ? queryPath : `${queryPath}.sql`;

  // Resolve the @repo/schema package location
  const schemaPackagePath = require.resolve("@repo/schema");
  const schemaRootPath = dirname(dirname(schemaPackagePath)); // Go up from dist/index.js to package root

  // Construct path to SQL file
  const fullPath = join(schemaRootPath, "sql", sqlPath);

  return readFileSync(fullPath, "utf-8");
}

/**
 * Cache for loaded SQL queries (performance optimization)
 */
const sqlCache = new Map<string, string>();

/**
 * Load SQL query with caching
 * @param queryPath - Path relative to sql/ directory (e.g., 'candles/select-by-time-range')
 * @returns SQL query string
 */
export function loadSqlQueryCached(queryPath: string): string {
  if (sqlCache.has(queryPath)) {
    return sqlCache.get(queryPath)!;
  }

  const sql = loadSqlQuery(queryPath);
  sqlCache.set(queryPath, sql);
  return sql;
}

/**
 * Clear SQL query cache (useful for hot-reloading in development)
 */
export function clearSqlCache(): void {
  sqlCache.clear();
}
