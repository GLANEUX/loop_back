import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEYLEN = 64;
const SESSION_TOKEN_BYTES = 32;

export const SESSION_DURATION_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, PASSWORD_KEYLEN);
  const storedBuffer = Buffer.from(hash, "hex");
  if (storedBuffer.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derived);
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
