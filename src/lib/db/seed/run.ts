/** pnpm db:seed [--force]   (--force rebuilds seed routes; never use it on production data) */
import { closeDb, db } from '../client';
import { seedDatabase } from './seed';

const force = process.argv.includes('--force');
try {
  const { created } = await seedDatabase(db(), { force });
  console.info(
    created.length
      ? `seed: created ${created.join(', ')}`
      : 'seed: nothing to do (routes already exist)',
  );
} catch (err) {
  console.error('seed: FAILED', err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
