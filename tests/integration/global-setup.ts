/**
 * Fresh database for integration tests: drop everything, apply migrations from zero, seed.
 * Refuses to touch any database whose name does not end in "_test".
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../../src/lib/db/schema';
import { seedDatabase } from '../../src/lib/db/seed/seed';

export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgres://spiti:spitipass@localhost:5434/spiti_test';
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_test')) throw new Error(`Refusing to reset non-test database "${name}"`);
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  await sql.unsafe(
    'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
  );
  const database = drizzle(sql, { schema, casing: 'snake_case' });
  await migrate(database, { migrationsFolder: './drizzle' });
  await seedDatabase(database);
  await sql.end();
}
