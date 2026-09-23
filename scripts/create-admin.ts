/**
 * Create or reset an admin user. The password is read from stdin (hidden), never from argv/env.
 *   pnpm admin:create [email] [--role=owner|editor]
 */
import { createInterface } from 'node:readline';
import { eq } from 'drizzle-orm';
import { closeDb, db, schema as s } from '../src/lib/db/client';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/lib/auth/password';
import { invalidateAllSessions } from '../src/lib/auth/session';

const email = (
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
  process.env.ADMIN_EMAIL ??
  ''
)
  .trim()
  .toLowerCase();
const role = process.argv.includes('--role=editor') ? 'editor' : 'owner';
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('usage: pnpm admin:create you@example.com   (or set ADMIN_EMAIL)');
  process.exit(1);
}

async function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    // Non-interactive (CI/provisioning): first line of stdin.
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) return line;
    return '';
  }
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') process.exit(130);
      else if (ch === '\u007f') value = value.slice(0, -1);
      else value += ch;
    };
    stdin.on('data', onData);
  });
}

try {
  const password = await readPassword(`Password for ${email} (min ${MIN_PASSWORD_LENGTH} chars): `);
  const passwordHash = await hashPassword(password);
  const existing = await db().query.adminUsers.findFirst({ where: eq(s.adminUsers.email, email) });
  if (existing) {
    await db()
      .update(s.adminUsers)
      .set({ passwordHash, role })
      .where(eq(s.adminUsers.id, existing.id));
    await invalidateAllSessions(existing.id);
    console.info(`admin: password reset for ${email} (all sessions signed out)`);
  } else {
    await db().insert(s.adminUsers).values({ email, passwordHash, role });
    console.info(`admin: created ${email} (${role})`);
  }
} catch (err) {
  console.error('admin:create failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
