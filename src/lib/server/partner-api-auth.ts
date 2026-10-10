import "server-only";

import { NextResponse } from "next/server";
import { findPartnerByApiKey, type PartnerApiOwner } from "@/lib/server/partner-api-keys-store";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const hits = new Map<string, { start: number; count: number }>();

function readApiKey(req: Request) {
  const header = req.headers.get("x-api-key");
  if (header?.trim()) return header.trim();
  const auth = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || "";
}

function rateLimited(partnerId: string) {
  const now = Date.now();
  const entry = hits.get(partnerId);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(partnerId, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Resolves the partner from `X-API-KEY` or `Authorization: Bearer <key>`. */
export async function authenticatePartnerApi(
  req: Request,
): Promise<{ owner: PartnerApiOwner } | { response: NextResponse }> {
  const key = readApiKey(req);
  if (!key) {
    return { response: apiError(401, "missing_api_key", "Send your key in the X-API-KEY header or as a Bearer token.") };
  }
  const owner = await findPartnerByApiKey(key);
  if (!owner) return { response: apiError(401, "invalid_api_key", "API key is invalid or was revoked.") };
  if (rateLimited(owner.partnerId)) {
    return { response: apiError(429, "rate_limited", `Limit is ${MAX_REQUESTS} requests per minute.`) };
  }
  return { owner };
}
