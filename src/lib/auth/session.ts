/**
 * Database sessions (the pattern documented by the Lucia/Oslo project, implemented directly).
 * Cookie holds a 256-bit random token; the database stores only HMAC-SHA256(SESSION_SECRET, token),
 * so a leaked sessions table cannot be replayed as cookies.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { AstroCookies } from 'astro';
import { db, schema as s } from '../db/client';
import { isProduction, requireSessionSecret } from '../config/env';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AdminUser {
  id: number;
  email: string;
  role: 'owner' | 'editor';
}

export function sessionCookieName() {
  // __Host- prefix: Secure, host-only, Path=/ enforced by the browser (HTTPS only).
  return isProduction() ? '__Host-sd_admin' : 'sd_admin';
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string, secret = requireSessionSecret()): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function tokensMatch(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db()
    .insert(s.adminSessions)
    .values({ id: hashToken(token), userId, expiresAt });
  await db()
    .update(s.adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(s.adminUsers.id, userId));
  return { token, expiresAt };
}

export async function validateSession(token: string | undefined): Promise<AdminUser | null> {
  if (!token || token.length > 100) return null;
  const rows = await db()
    .select({ id: s.adminUsers.id, email: s.adminUsers.email, role: s.adminUsers.role })
    .from(s.adminSessions)
    .innerJoin(s.adminUsers, eq(s.adminUsers.id, s.adminSessions.userId))
    .where(and(eq(s.adminSessions.id, hashToken(token)), gt(s.adminSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function invalidateSession(token: string | undefined) {
  if (!token) return;
  await db()
    .delete(s.adminSessions)
    .where(eq(s.adminSessions.id, hashToken(token)));
}

export async function invalidateAllSessions(userId: number) {
  await db().delete(s.adminSessions).where(eq(s.adminSessions.userId, userId));
}

export async function purgeExpiredSessions() {
  await db().delete(s.adminSessions).where(lt(s.adminSessions.expiresAt, new Date()));
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date) {
  cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(sessionCookieName(), { path: '/' });
}
