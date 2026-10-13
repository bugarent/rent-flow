import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { isSmsConfigured } from "@/lib/sms/smsoffice";
import { resolveBroadcastContacts, sendPartnerBroadcast } from "@/lib/server/partner-broadcast";
import {
  PARTNER_BROADCAST_CHANNELS,
  PARTNER_BROADCAST_MAX_RECIPIENTS,
  PARTNER_BROADCAST_MAX_TEXT,
  type PartnerBroadcastChannel,
  type PartnerBroadcastTarget,
  type PhoneSlot,
} from "@/lib/partners/broadcast-types";

export const maxDuration = 60;

function readIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

function readSlots(value: unknown): PhoneSlot[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((slot) => String(slot)))].filter(
    (slot): slot is PhoneSlot => slot === "primary" || slot === "secondary",
  );
}

/** Checked phone slots. A bare partner id list selects both numbers. */
function readTargets(body: Record<string, unknown>): PartnerBroadcastTarget[] {
  if (Array.isArray(body.targets)) {
    const byId = new Map<string, PhoneSlot[]>();
    for (const raw of body.targets) {
      if (!raw || typeof raw !== "object") continue;
      const id = String((raw as { id?: unknown }).id || "").trim();
      if (!id) continue;
      const slots = readSlots((raw as { slots?: unknown }).slots);
      const prev = byId.get(id) ?? [];
      byId.set(id, [...new Set([...prev, ...slots])]);
    }
    return [...byId.entries()].map(([id, slots]) => ({ id, slots }));
  }
  return readIds(body.partnerIds).map((id) => ({ id, slots: ["primary", "secondary"] }));
}

/** action "contacts": who can be reached on which channel. action "send": deliver the text. */
export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const targets = readTargets(body);
  if (!targets.length) return NextResponse.json({ error: "none" }, { status: 400 });
  if (targets.length > PARTNER_BROADCAST_MAX_RECIPIENTS) {
    return NextResponse.json({ error: "too-many" }, { status: 400 });
  }

  const contacts = await resolveBroadcastContacts(targets);
  const smsConfigured = isSmsConfigured();

  if (body.action === "contacts") {
    return NextResponse.json(
      {
        smsConfigured,
        contacts: contacts.map(({ chatIds: _chatIds, ...contact }) => contact),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const text = String(body.text || "").trim();
  if (!text || text.length > PARTNER_BROADCAST_MAX_TEXT) {
    return NextResponse.json({ error: "text" }, { status: 400 });
  }
  const channels = (Array.isArray(body.channels) ? body.channels : [])
    .map((c) => String(c))
    .filter((c): c is PartnerBroadcastChannel =>
      PARTNER_BROADCAST_CHANNELS.includes(c as PartnerBroadcastChannel),
    )
    .filter((c) => c !== "sms" || smsConfigured);
  if (!channels.length) return NextResponse.json({ error: "channels" }, { status: 400 });

  const results = await sendPartnerBroadcast(contacts, text, channels);
  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}
