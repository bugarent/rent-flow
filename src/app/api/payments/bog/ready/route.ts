import { NextResponse } from "next/server";
import {
  bogCredentialsConfigured,
  getBogSiteUrl,
} from "@/lib/payments/bog-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight check so checkout can fail before creating a booking. */
export async function GET() {
  const configured = bogCredentialsConfigured();
  const siteUrl = getBogSiteUrl();
  const siteOk = Boolean(siteUrl && /^https:\/\//i.test(siteUrl));
  const ready = configured && siteOk;
  return NextResponse.json(
    {
      ready,
      configured,
      siteOk,
      ...(ready
        ? {}
        : {
            error: !configured
              ? "Bank of Georgia payments are not configured."
              : "SITE_URL must be a public https origin.",
          }),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
