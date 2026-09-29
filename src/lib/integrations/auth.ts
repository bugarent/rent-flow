import { randomBytes } from "node:crypto";
import { hashSecret, verifySecret } from "@/lib/crypto";

export type ApiKeyKind = "live" | "test";

export function generateIntegrationApiKey(kind: ApiKeyKind = "live") {
  const prefix = kind === "test" ? "rac_test_" : "rac_live_";
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${prefix}${secret}`;
  return {
    fullKey,
    prefix: fullKey.slice(0, 16),
    hash: hashSecret(fullKey),
  };
}

export function hashIntegrationApiKey(fullKey: string) {
  return hashSecret(fullKey);
}

export function verifyIntegrationApiKey(fullKey: string, storedHash: string) {
  return verifySecret(fullKey, storedHash);
}

/** Extract API key from Authorization Bearer or X-RAC-Api-Key. */
export function extractApiKeyFromHeaders(headers: Headers): string | null {
  const custom = headers.get("x-rac-api-key")?.trim();
  if (custom) return custom;
  const auth = headers.get("authorization")?.trim();
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || null;
}

export function isTestApiKey(fullKey: string) {
  return fullKey.startsWith("rac_test_");
}
