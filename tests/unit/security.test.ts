import { describe, expect, it } from 'vitest';
import { RateLimiter, clientKey } from '../../src/lib/http/rate-limit';
import { generateToken, hashToken, tokensMatch } from '../../src/lib/auth/session';
import { hashPassword, verifyPassword } from '../../src/lib/auth/password';
import { SECURITY_HEADERS } from '../../src/lib/http/security-headers';

describe('rate limiter', () => {
  it('allows max hits per window, then blocks until the window resets', () => {
    let now = 0;
    const rl = new RateLimiter(2, 1000, () => now);
    expect([rl.hit('a'), rl.hit('a'), rl.hit('a')]).toEqual([true, true, false]);
    expect(rl.hit('b')).toBe(true);
    now = 1001;
    expect(rl.hit('a')).toBe(true);
  });

  it('only trusts X-Forwarded-For behind a trusted proxy, taking the right-most hop', () => {
    const req = new Request('http://x/', { headers: { 'x-forwarded-for': '6.6.6.6, 1.2.3.4' } });
    expect(clientKey(req, '127.0.0.1', false)).toBe('127.0.0.1');
    expect(clientKey(req, '127.0.0.1', true)).toBe('1.2.3.4');
  });
});

describe('session tokens', () => {
  it('are long, random and stored only as a keyed hash', () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
    expect(hashToken(a, 'secret-one-secret-one-secret-one-xx')).not.toBe(
      hashToken(a, 'secret-two-secret-two-secret-two-xx'),
    );
    expect(hashToken(a)).toHaveLength(64);
    expect(hashToken(a)).not.toContain(a);
    expect(tokensMatch('abc', 'abc')).toBe(true);
    expect(tokensMatch('abc', 'abd')).toBe(false);
  });
});

describe('passwords', () => {
  it('hash with argon2id and verify', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, 'correct horse battery')).toBe(true);
    expect(await verifyPassword(h, 'wrong horse battery')).toBe(false);
    await expect(hashPassword('short')).rejects.toThrow();
  });
});

describe('security headers', () => {
  it('include the baseline protections', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS['Referrer-Policy']).toBeTruthy();
  });
});
