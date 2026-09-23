/** argon2id with OWASP-recommended minimums (19 MiB, t=2, p=1). No custom crypto. */
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = {
  algorithm: 2 /* Argon2id */,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
export function dummyVerify(password: string) {
  dummyHash ??= hash('not-a-real-password-just-timing', OPTIONS);
  return dummyHash.then((h) => verifyPassword(h, password)).then(() => false);
}
