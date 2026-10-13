import type { PartnerBroadcastTarget, PhoneSlot } from "@/lib/partners/broadcast-types";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function settingsPhones(companySettings: unknown): { primary: string; secondary: string } {
  let value = companySettings;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      value = null;
    }
  }
  if (!value || typeof value !== "object") return { primary: "", secondary: "" };
  const row = value as { primaryPhone?: unknown; secondaryPhone?: unknown };
  return {
    primary: typeof row.primaryPhone === "string" ? row.primaryPhone.trim() : "",
    secondary: typeof row.secondaryPhone === "string" ? row.secondaryPhone.trim() : "",
  };
}

/** Numbers shown in the admin list. Profile phones win when the partner saved them. */
export function listedPartnerPhones(input: {
  phone?: string | null;
  secondaryPhone?: string | null;
  companySettings?: unknown;
}): { phone: string; secondaryPhone: string } {
  const fromSettings = settingsPhones(input.companySettings);
  const phone = (fromSettings.primary || String(input.phone || "")).trim();
  let secondary = (fromSettings.secondary || String(input.secondaryPhone || "")).trim();
  if (secondary && digits(secondary) === digits(phone)) secondary = "";
  return { phone, secondaryPhone: secondary };
}

export function uniquePhones(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = digits(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function phonePickKey(partnerId: string, slot: PhoneSlot | "row") {
  return `${partnerId}:${slot}`;
}

export function partnerPhoneSlots(
  phone: string,
  secondaryPhone?: string | null,
): Array<{ slot: PhoneSlot; phone: string }> {
  const listed = listedPartnerPhones({ phone, secondaryPhone });
  const entries: Array<{ slot: PhoneSlot; phone: string }> = [];
  if (listed.phone && listed.phone !== "—") entries.push({ slot: "primary", phone: listed.phone });
  if (listed.secondaryPhone) entries.push({ slot: "secondary", phone: listed.secondaryPhone });
  return entries;
}

/** One key per phone. A partner with no number still has a row key so email/Telegram can be selected. */
export function selectionKeys(partner: { id: string; phone: string; secondaryPhone?: string | null }) {
  const slots = partnerPhoneSlots(partner.phone, partner.secondaryPhone);
  if (!slots.length) return [phonePickKey(partner.id, "row")];
  return slots.map((entry) => phonePickKey(partner.id, entry.slot));
}

export function broadcastTargetsFromRows<T extends { id: string; phone: string; secondaryPhone?: string | null }>(
  rows: T[],
  picked: Set<string>,
): PartnerBroadcastTarget[] {
  const targets: PartnerBroadcastTarget[] = [];
  for (const row of rows) {
    const slots = partnerPhoneSlots(row.phone, row.secondaryPhone)
      .filter((entry) => picked.has(phonePickKey(row.id, entry.slot)))
      .map((entry) => entry.slot);
    const rowOnly = picked.has(phonePickKey(row.id, "row"));
    if (!slots.length && !rowOnly) continue;
    targets.push({ id: row.id, slots });
  }
  return targets;
}
