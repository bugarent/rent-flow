import "server-only";

import https from "node:https";
import tls from "node:tls";
import {
  getPaypalApiBase,
  getPaypalClientId,
  getPaypalClientSecret,
  paypalCredentialsConfigured,
} from "@/lib/payments/paypal-config";
import type { PaypalCheckoutIntent } from "@/lib/payments/paypal-commission";

export class PaypalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaypalConfigError";
  }
}

export class PaypalApiError extends Error {
  status: number;
  debugId: string;

  constructor(message: string, status: number, debugId = "") {
    super(message);
    this.name = "PaypalApiError";
    this.status = status;
    this.debugId = debugId;
  }
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

type PaypalOrder = {
  id: string;
  status: string;
  approveUrl: string | null;
};

/**
 * Node's bundled CA list rejects PayPal's certificate on some Windows installs.
 * Prefer the OS trust store when it is available; otherwise use global fetch.
 */
function systemCaCertificates(): string[] | undefined {
  const getCerts = (tls as { getCACertificates?: (type: string) => string[] }).getCACertificates;
  if (typeof getCerts !== "function") return undefined;
  try {
    const certs = getCerts("system");
    return Array.isArray(certs) && certs.length > 0 ? certs : undefined;
  } catch {
    return undefined;
  }
}

async function paypalRequest(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
): Promise<{ status: number; data: unknown }> {
  const ca = systemCaCertificates();
  if (!ca) {
    const res = await fetch(url, { method: init.method, headers: init.headers, body: init.body, cache: "no-store" });
    return { status: res.status, data: await res.json().catch(() => null) };
  }

  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: init.method,
        headers: { ...init.headers, "Content-Length": Buffer.byteLength(init.body) },
        ca,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data: unknown = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = null;
          }
          resolve({ status: res.statusCode || 0, data });
        });
      },
    );
    req.on("error", reject);
    req.end(init.body);
  });
}

function paypalFailure(data: unknown, fallback: string): { message: string; debugId: string } {
  if (!data || typeof data !== "object") return { message: fallback, debugId: "" };
  const row = data as { message?: unknown; error_description?: unknown; debug_id?: unknown };
  const message = String(row.message || row.error_description || fallback).slice(0, 300);
  const debugId = String(row.debug_id || "").slice(0, 80);
  return { message, debugId };
}

export function clearPaypalAccessTokenCache() {
  tokenCache = null;
}

export async function getPaypalAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) return tokenCache.token;
  if (!paypalCredentialsConfigured()) {
    throw new PaypalConfigError("PayPal credentials are not configured");
  }

  const clientId = getPaypalClientId();
  const secret = getPaypalClientSecret();
  const authorization = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await paypalRequest(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });
  const data = res.data as { access_token?: unknown; expires_in?: unknown } | null;
  if (res.status < 200 || res.status >= 300 || !data || typeof data.access_token !== "string" || !data.access_token) {
    const failure = paypalFailure(data, "PayPal token request failed");
    throw new PaypalApiError(failure.message, res.status, failure.debugId);
  }

  const expiresInSec = Number(data.expires_in);
  const ttlMs = (Number.isFinite(expiresInSec) && expiresInSec > 90 ? expiresInSec - 60 : 240) * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

export async function createPaypalCheckoutOrder(input: {
  intent: PaypalCheckoutIntent;
  amount: string;
  currency: string;
  description: string;
}): Promise<PaypalOrder> {
  const create = async (token: string) => {
    const res = await paypalRequest(`${getPaypalApiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: input.intent,
        purchase_units: [
          {
            description: input.description.slice(0, 127),
            amount: {
              currency_code: input.currency,
              value: input.amount,
            },
          },
        ],
      }),
    });
    const data = res.data as {
      id?: unknown;
      status?: unknown;
      links?: { rel?: string; href?: string }[];
    } | null;
    return { status: res.status, data };
  };

  let token = await getPaypalAccessToken();
  let { status, data } = await create(token);
  if (status === 401) {
    clearPaypalAccessTokenCache();
    token = await getPaypalAccessToken();
    ({ status, data } = await create(token));
  }

  const orderId = data && typeof data.id === "string" ? data.id : "";
  if (status < 200 || status >= 300 || !orderId) {
    const failure = paypalFailure(data, "PayPal order creation failed");
    throw new PaypalApiError(failure.message, status, failure.debugId);
  }

  const approve = Array.isArray(data?.links)
    ? data.links.find((link) => link?.rel === "approve" || link?.rel === "payer-action")
    : undefined;

  return {
    id: orderId,
    status: typeof data?.status === "string" ? data.status : "CREATED",
    approveUrl: typeof approve?.href === "string" ? approve.href : null,
  };
}
