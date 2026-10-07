import "server-only";

/**
 * PayPal Business checkout config.
 * Sandbox (default): no live charges — bookings can complete in test mode.
 * Set PAYPAL_MODE=live only with production credentials.
 */
export type PaypalMode = "sandbox" | "live";

export function getPaypalMode(): PaypalMode {
  const raw = String(process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase();
  return raw === "live" ? "live" : "sandbox";
}

export function getPaypalClientId(): string {
  return String(process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
}

export function getPaypalClientSecret(): string {
  return String(process.env.PAYPAL_CLIENT_SECRET || "").trim();
}

/** Sandbox by default. Live only when PAYPAL_MODE=live. */
export function getPaypalApiBase(): string {
  return isPaypalSandbox() ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

export function isPaypalSandbox(): boolean {
  return getPaypalMode() !== "live";
}

export function paypalCredentialsConfigured(): boolean {
  return Boolean(getPaypalClientId() && getPaypalClientSecret());
}
