/**
 * Applies pending SQL migrations from /drizzle. Safe to run on every deploy (idempotent,
 * transactional per migration). Never uses `drizzle-kit push` against production.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDb, db } from './client';

try {
  await migrate(db(), { migrationsFolder: './drizzle' });
  console.info('migrations: up to date');
} catch (err) {
  console.error('migrations: FAILED', err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
