import { NextResponse } from "next/server";
import {
  bogCredentialsConfigured,
  getBogSiteUrl,
} from "@/lib/payments/bog-config";
import { paypalCredentialsConfigured } from "@/lib/payments/paypal-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Combined readiness for checkout UI (no secrets returned). */
export async function GET() {
  const siteUrl = getBogSiteUrl();
  const siteOk = Boolean(siteUrl && /^https:\/\//i.test(siteUrl));
  const bogConfigured = bogCredentialsConfigured();
  const paypalConfigured = paypalCredentialsConfigured();
  return NextResponse.json(
    {
      siteUrl,
      siteOk,
      bog: { ready: bogConfigured && siteOk, configured: bogConfigured },
      paypal: { ready: paypalConfigured && siteOk, configured: paypalConfigured },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
