import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireDatabaseUrl } from '../config/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

let sqlClient: postgres.Sql | undefined;
let database: Database | undefined;

/** Lazily-created singleton; the connection opens on first query, not at import. */
export function db(): Database {
  if (!database) {
    sqlClient = postgres(requireDatabaseUrl(), {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 30,
      connect_timeout: 5,
      prepare: true,
      onnotice: () => undefined,
    });
    database = drizzle(sqlClient, { schema, casing: 'snake_case' });
  }
  return database;
}

export async function closeDb() {
  await sqlClient?.end({ timeout: 5 });
  sqlClient = undefined;
  database = undefined;
}

export { schema };
