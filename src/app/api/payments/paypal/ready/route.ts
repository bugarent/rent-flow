import { NextResponse } from "next/server";
import { paypalCredentialsConfigured } from "@/lib/payments/paypal-config";
import { getBogSiteUrl } from "@/lib/payments/bog-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = paypalCredentialsConfigured();
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
              ? "PayPal payments are not configured."
              : "SITE_URL must be a public https origin.",
          }),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
