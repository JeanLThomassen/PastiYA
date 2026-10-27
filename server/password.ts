import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AuthConfig } from '../shared/types.js';

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): Pick<AuthConfig, 'passwordHash' | 'salt'> {
  return { passwordHash: scryptSync(password, salt, 64).toString('hex'), salt };
}

export function verifyPassword(auth: AuthConfig, password: string): boolean {
  const expected = Buffer.from(auth.passwordHash, 'hex');
  const actual = scryptSync(password, auth.salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
