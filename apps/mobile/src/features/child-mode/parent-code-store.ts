import { lockoutSeconds } from '@cote-a-cote/shared';
import * as Crypto from 'expo-crypto';

import { secureStorage } from './device-storage';

const CODE_KEY = 'parent_code';
const ATTEMPTS_KEY = 'parent_code_attempts';

interface StoredCode {
  salt: string;
  hash: string;
}

interface Attempts {
  failed: number;
  lockedUntil: number;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashCode(salt: string, code: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${code}`);
}

async function readAttempts(): Promise<Attempts> {
  const raw = await secureStorage.get(ATTEMPTS_KEY);
  return raw ? (JSON.parse(raw) as Attempts) : { failed: 0, lockedUntil: 0 };
}

export async function hasParentCode(): Promise<boolean> {
  return (await secureStorage.get(CODE_KEY)) !== null;
}

export async function saveParentCode(code: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  const stored: StoredCode = { salt, hash: await hashCode(salt, code) };
  await secureStorage.set(CODE_KEY, JSON.stringify(stored));
  await secureStorage.remove(ATTEMPTS_KEY);
}

export async function clearParentCode(): Promise<void> {
  await secureStorage.remove(CODE_KEY);
  await secureStorage.remove(ATTEMPTS_KEY);
}

/** Secondes restantes avant de pouvoir réessayer (0 si aucun blocage). */
export async function remainingLockout(now = Date.now()): Promise<number> {
  const { lockedUntil } = await readAttempts();
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}

export type VerifyResult = { ok: true } | { ok: false; lockedSeconds: number };

export async function verifyParentCode(code: string, now = Date.now()): Promise<VerifyResult> {
  const lockedSeconds = await remainingLockout(now);
  if (lockedSeconds > 0) return { ok: false, lockedSeconds };

  const raw = await secureStorage.get(CODE_KEY);
  if (!raw) return { ok: true };
  const stored = JSON.parse(raw) as StoredCode;

  if ((await hashCode(stored.salt, code)) === stored.hash) {
    await secureStorage.remove(ATTEMPTS_KEY);
    return { ok: true };
  }

  const attempts = await readAttempts();
  const failed = attempts.failed + 1;
  const lockout = lockoutSeconds(failed);
  await secureStorage.set(ATTEMPTS_KEY, JSON.stringify({ failed, lockedUntil: now + lockout * 1000 }));
  return { ok: false, lockedSeconds: lockout };
}
