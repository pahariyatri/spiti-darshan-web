import { eq } from 'drizzle-orm';
import { db, schema as s } from '../db/client';
import { env } from '../config/env';
import { RateLimiter } from '../http/rate-limit';
import { dummyVerify, verifyPassword } from './password';
import type { AdminUser } from './session';

let byClient: RateLimiter | undefined;
let byEmail: RateLimiter | undefined;

function limiters() {
  const e = env();
  const windowMs = e.RATE_LIMIT_LOGIN_WINDOW_SECONDS * 1000;
  byClient ??= new RateLimiter(e.RATE_LIMIT_LOGIN_MAX * 4, windowMs);
  byEmail ??= new RateLimiter(e.RATE_LIMIT_LOGIN_MAX, windowMs);
  return { byClient, byEmail };
}

export type LoginResult =
  { ok: true; user: AdminUser } | { ok: false; reason: 'invalid' | 'rate_limited' };

export async function attemptLogin(
  email: string,
  password: string,
  clientKey: string,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const { byClient, byEmail } = limiters();
  if (!byClient.hit(clientKey) || !byEmail.hit(normalized))
    return { ok: false, reason: 'rate_limited' };

  const user = await db().query.adminUsers.findFirst({ where: eq(s.adminUsers.email, normalized) });
  if (!user) {
    await dummyVerify(password);
    return { ok: false, reason: 'invalid' };
  }
  if (!(await verifyPassword(user.passwordHash, password))) return { ok: false, reason: 'invalid' };
  byEmail.reset(normalized);
  return { ok: true, user: { id: user.id, email: user.email, role: user.role } };
}
