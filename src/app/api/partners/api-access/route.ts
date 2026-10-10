import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolvePartnerId } from "@/lib/server/partner-booking-access";
import {
  getPartnerApiSettings,
  rotatePartnerApiKey,
  savePartnerWebhookUrl,
  type PartnerApiOwner,
} from "@/lib/server/partner-api-keys-store";

const NO_STORE = { "Cache-Control": "no-store" };

async function ownerFromSession(): Promise<PartnerApiOwner | null> {
  const session = await getPartnerSession();
  if (!session?.user?.id) return null;
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return null;
  return { partnerId, userId: session.user.id, email: session.user.email || "" };
}

function payload(req: Request, settings: Awaited<ReturnType<typeof getPartnerApiSettings>>, apiKey?: string) {
  const origin = new URL(req.url).origin;
  return {
    settings,
    ...(apiKey ? { apiKey } : {}),
    baseUrl: `${origin}/api/v1/partner`,
    docsUrl: `${origin}/api/v1/docs`,
  };
}

export async function GET(req: Request) {
  const owner = await ownerFromSession();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getPartnerApiSettings(owner);
  return NextResponse.json(payload(req, settings), { headers: NO_STORE });
}

export async function POST(req: Request) {
  const owner = await ownerFromSession();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string } | null;

  if (body?.action === "generate") {
    const { key, settings } = await rotatePartnerApiKey(owner);
    return NextResponse.json(payload(req, settings, key), { headers: NO_STORE });
  }

  if (body?.action === "test_webhook") {
    const settings = await getPartnerApiSettings(owner);
    if (!settings.webhookUrl) {
      return NextResponse.json({ error: "webhook_missing" }, { status: 400 });
    }
    const { postPartnerWebhook, sampleWebhookPayload } = await import("@/lib/server/partner-webhooks");
    try {
      const result = await postPartnerWebhook(
        { url: settings.webhookUrl, secret: settings.webhookSecret },
        sampleWebhookPayload(),
      );
      return NextResponse.json({ ok: result.ok, status: result.status }, { headers: NO_STORE });
    } catch (error) {
      const message = error instanceof Error ? error.message : "delivery failed";
      return NextResponse.json({ ok: false, status: 0, error: message }, { headers: NO_STORE });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PUT(req: Request) {
  const owner = await ownerFromSession();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { webhookUrl?: string } | null;
  const webhookUrl = String(body?.webhookUrl || "").trim();
  if (webhookUrl) {
    try {
      const { assertPublicHttps } = await import("@/lib/server/channel-sync");
      await assertPublicHttps(webhookUrl);
    } catch {
      return NextResponse.json({ error: "webhook_invalid" }, { status: 400 });
    }
  }
  const settings = await savePartnerWebhookUrl(owner, webhookUrl);
  return NextResponse.json(payload(req, settings), { headers: NO_STORE });
}
