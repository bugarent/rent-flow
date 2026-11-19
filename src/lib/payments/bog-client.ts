import "server-only";

import { randomUUID } from "node:crypto";
import {
  BOG_OAUTH_TOKEN_URL,
  BOG_ORDERS_URL,
  bogCredentialsConfigured,
  getBogClientId,
  getBogSecretKey,
} from "@/lib/payments/bog-config";

export class BogConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BogConfigError";
  }
}

export class BogApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown = null) {
    super(message);
    this.name = "BogApiError";
    this.status = status;
    this.body = body;
  }
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export type BogCreateOrderInput = {
  /** Our booking id — sent as external_order_id */
  externalOrderId: string;
  /** Amount in major units (e.g. 12.50) */
  totalAmount: number;
  currency: "EUR" | "GEL" | "USD" | "GBP";
  basket: Array<{
    product_id: string;
    description?: string;
    quantity: number;
    unit_price: number;
  }>;
  callbackUrl: string;
  successRedirectUrl: string;
  failRedirectUrl: string;
  locale?: string;
};

export type BogCreateOrderResult = {
  orderId: string;
  redirectUrl: string;
};

async function fetchBogAccessToken(): Promise<string> {
  if (!bogCredentialsConfigured()) {
    throw new BogConfigError(
      "BOG credentials missing. Set BOG_CLIENT_ID and BOG_SECRET_KEY.",
    );
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  const clientId = getBogClientId();
  const secret = getBogSecretKey();
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(BOG_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    const msg =
      data?.error_description ||
      data?.error ||
      `BOG OAuth failed (${res.status})`;
    throw new BogApiError(msg, res.status, data);
  }

  const expiresInSec =
    typeof data.expires_in === "number" && data.expires_in > 0
      ? data.expires_in
      : 3600;
  tokenCache = {
    token: data.access_token,
    expiresAt: now + expiresInSec * 1000,
  };
  return data.access_token;
}

export async function createBogEcommerceOrder(
  input: BogCreateOrderInput,
): Promise<BogCreateOrderResult> {
  const token = await fetchBogAccessToken();
  const amount = Math.round(Math.max(0, input.totalAmount) * 100) / 100;
  if (!(amount > 0)) {
    throw new BogConfigError("Payment amount must be greater than zero.");
  }

  const payload = {
    callback_url: input.callbackUrl,
    external_order_id: input.externalOrderId.slice(0, 100),
    capture: "automatic",
    purchase_units: {
      currency: input.currency,
      total_amount: amount,
      basket: input.basket.map((row) => ({
        product_id: row.product_id,
        description: row.description || undefined,
        quantity: Math.max(1, Math.floor(row.quantity) || 1),
        unit_price: Math.round(row.unit_price * 100) / 100,
      })),
    },
    redirect_urls: {
      success: input.successRedirectUrl,
      fail: input.failRedirectUrl,
    },
  };

  const res = await fetch(BOG_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Language": input.locale === "ka" ? "ka" : "en",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    id?: string;
    _links?: { redirect?: { href?: string } };
    message?: string;
    error?: string;
  } | null;

  if (!res.ok || !data?.id) {
    const msg =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `BOG create order failed (${res.status})`;
    throw new BogApiError(msg, res.status, data);
  }

  const redirectUrl = String(data._links?.redirect?.href || "").trim();
  if (!redirectUrl) {
    throw new BogApiError("BOG order created but redirect URL is missing.", res.status, data);
  }

  return { orderId: data.id, redirectUrl };
}
