import "server-only";

/** Bank of Georgia (BOG) ecommerce payments — env + public URLs. */

export function getBogClientId(): string {
  return String(process.env.BOG_CLIENT_ID || "").trim();
}

/** Preferred name from BOG merchant portal; falls back to BOG_CLIENT_SECRET. */
export function getBogSecretKey(): string {
  return String(
    process.env.BOG_SECRET_KEY || process.env.BOG_CLIENT_SECRET || "",
  ).trim();
}

export function bogCredentialsConfigured(): boolean {
  return Boolean(getBogClientId() && getBogSecretKey());
}

/**
 * Public site origin for redirect_urls + callback_url.
 * Prefers SITE_URL, then NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL.
 */
export function getBogSiteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  return String(raw).trim().replace(/\/$/, "");
}

export const BOG_OAUTH_TOKEN_URL =
  "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

export const BOG_ORDERS_URL = "https://api.bog.ge/payments/v1/ecommerce/orders";

/** Official BOG callback RSA public key (SHA256withRSA). */
export const BOG_CALLBACK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;
