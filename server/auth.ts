// Passord: lagres bare som scrypt-hash med eget salt («scrypt$salt$hash», base64url).
// Brukes av serveren (påmelding, innlogging, bytte passord) og adminverktøyet (nullstille passord).
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 64;

/** Feilmelding hvis passordet ikke kan brukes, ellers null. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Passordet må ha minst ${PASSWORD_MIN} tegn.`;
  if (pw.length > PASSWORD_MAX) return `Passordet kan ha høyst ${PASSWORD_MAX} tegn.`;
  return null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function checkPassword(pw: string, stored: string | null | undefined): boolean {
  const [kind, salt, hash] = (stored ?? '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64url');
  const got = scryptSync(pw, Buffer.from(salt, 'base64url'), want.length);
  return timingSafeEqual(got, want);
}
