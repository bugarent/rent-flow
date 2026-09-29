import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { OTP_LENGTH } from "@/lib/brand";

const KEYLEN = 64;
const BCRYPT_ROUNDS = 12;

export function hashSecret(plain: string) {
  return hashSync(plain, BCRYPT_ROUNDS);
}

export function verifySecret(plain: string, stored: string) {
  if (!stored) return false;
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return compareSync(plain, stored);
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(plain, salt, KEYLEN);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function generateOtp(length = OTP_LENGTH) {
  const digits = "0123456789";
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += digits[bytes[i] % 10];
  }
  return code;
}

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

/** Lightweight email shape check for forms / booking APIs. */
export function isValidEmail(value: string): boolean {
  const email = String(value || "").trim();
  if (!email || email.length > 160) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
