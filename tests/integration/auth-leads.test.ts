import { afterAll, describe, expect, it } from 'vitest';
import { desc, eq } from 'drizzle-orm';
import { closeDb, db, schema as s } from '../../src/lib/db/client';
import { hashPassword } from '../../src/lib/auth/password';
import {
  createSession,
  hashToken,
  invalidateSession,
  validateSession,
} from '../../src/lib/auth/session';
import { attemptLogin } from '../../src/lib/auth/login';
import {
  clearLabelCache,
  recordBeaconEvent,
  resolveWhatsAppRedirect,
} from '../../src/lib/services/leads';

afterAll(() => closeDb());

describe('admin authentication', () => {
  it('logs in with the right password only, and sessions can be revoked', async () => {
    await db()
      .insert(s.adminUsers)
      .values({
        email: 'owner@example.test',
        passwordHash: await hashPassword('a long test password'),
        role: 'owner',
      });
    expect((await attemptLogin('owner@example.test', 'wrong password!!', 'k1')).ok).toBe(false);
    expect((await attemptLogin('nobody@example.test', 'a long test password', 'k1')).ok).toBe(
      false,
    );
    const ok = await attemptLogin(' Owner@Example.test ', 'a long test password', 'k1');
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;

    const { token } = await createSession(ok.user.id);
    const stored = await db()
      .select()
      .from(s.adminSessions)
      .where(eq(s.adminSessions.userId, ok.user.id));
    expect(stored[0]!.id).toBe(hashToken(token));
    expect(stored[0]!.id).not.toBe(token);
    expect((await validateSession(token))?.email).toBe('owner@example.test');
    expect(await validateSession('forged-token')).toBeNull();
    expect(await validateSession(undefined)).toBeNull();

    await invalidateSession(token);
    expect(await validateSession(token)).toBeNull();
  });

  it('rejects expired sessions', async () => {
    const [user] = await db().select().from(s.adminUsers).limit(1);
    const { token } = await createSession(user!.id);
    await db()
      .update(s.adminSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(s.adminSessions.id, hashToken(token)));
    expect(await validateSession(token)).toBeNull();
  });

  it('rate limits repeated failures for one email', async () => {
    const results = [];
    for (let i = 0; i < 7; i++)
      results.push(await attemptLogin('owner@example.test', `nope-${i}-xxxxxxxx`, `ip-${i}`));
    expect(results.some((r) => !r.ok && r.reason === 'rate_limited')).toBe(true);
  });
});

describe('lead intents', () => {
  it('logs an anonymous WhatsApp click with route, day and attribution', async () => {
    clearLabelCache();
    const url = await resolveWhatsAppRedirect(
      {
        route: 'shimla-to-spiti',
        day: 5,
        cta: 'day-card',
        utm_source: 'google',
        ref: 'www.google.com',
      },
      { log: true },
    );
    expect(decodeURIComponent(url)).toContain('Key → Kibber → Chicham');
    await new Promise((r) => setTimeout(r, 200));
    const [row] = await db().select().from(s.leadIntents).orderBy(desc(s.leadIntents.id)).limit(1);
    expect(row).toMatchObject({
      eventType: 'whatsapp_click',
      dayNumber: 5,
      ctaLocation: 'day-card',
      utmSource: 'google',
      referrerHost: 'www.google.com',
    });
    expect(Object.keys(row!)).not.toContain('ip');
  });

  it('records beacon events', async () => {
    expect(
      await recordBeaconEvent({ type: 'route_day_interest', route: 'shimla-to-spiti', day: 8 }),
    ).toBe(true);
    const [row] = await db().select().from(s.leadIntents).orderBy(desc(s.leadIntents.id)).limit(1);
    expect(row).toMatchObject({ eventType: 'route_day_interest', dayNumber: 8 });
  });
});
