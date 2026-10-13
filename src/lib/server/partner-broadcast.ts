import "server-only";

import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/crypto";
import { parsePartnerMessengers } from "@/lib/partner";
import { sendPartnerMail } from "@/lib/mail";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { listStoredPartnerChatIds } from "@/lib/telegram/notify-chats";
import { sendSms } from "@/lib/sms/smsoffice";
import { loadAdminPartnerRows } from "@/lib/server/admin-partner-rows";
import { listFilePartnerApplications } from "@/lib/server/partner-applications-store";
import type {
  PartnerBroadcastChannel,
  PartnerBroadcastContact,
  PartnerBroadcastResult,
  PartnerBroadcastTarget,
} from "@/lib/partners/broadcast-types";
import { uniquePhones } from "@/lib/partners/partner-phones";

type ResolvedContact = PartnerBroadcastContact & { chatIds: string[] };

/** Contacts are read on the server so the browser cannot redirect a broadcast to other numbers. */
export async function resolveBroadcastContacts(targets: PartnerBroadcastTarget[]): Promise<ResolvedContact[]> {
  const wanted = new Map(targets.map((target) => [target.id, target.slots]));
  const { partners } = await loadAdminPartnerRows();
  const rows = partners.filter((p) => wanted.has(p.id));
  if (!rows.length) return [];

  const ids = rows.map((p) => p.id);
  const dbPartners = await prisma.partner
    .findMany({
      where: { id: { in: ids } },
      select: { id: true, telegramChatId: true, messengers: true, messenger: true },
    })
    .catch(() => []);
  const dbById = new Map(dbPartners.map((p) => [p.id, p]));
  const fileById = new Map(
    (await listFilePartnerApplications().catch(() => [])).map((p) => [p.id, p]),
  );

  return Promise.all(
    rows.map(async (row) => {
      const db = dbById.get(row.id);
      const file = fileById.get(row.id);
      const chatIds = new Set<string>();
      const dbChat = db?.telegramChatId?.trim();
      if (dbChat) chatIds.add(dbChat);
      const stored = await listStoredPartnerChatIds({ partnerId: row.id, email: row.email }).catch(() => []);
      for (const id of stored) if (id.trim()) chatIds.add(id.trim());
      const messengers = db
        ? parsePartnerMessengers(db.messengers, db.messenger)
        : parsePartnerMessengers(file?.messengers ?? []);
      const slots = new Set(wanted.get(row.id) ?? []);
      const phones = uniquePhones([
        slots.has("primary") ? row.phone : "",
        slots.has("secondary") ? row.secondaryPhone : "",
      ]);
      return {
        id: row.id,
        name: row.displayName,
        phone: phones[0] || "",
        phones,
        email: String(row.email || "").trim(),
        messengers,
        hasTelegram: chatIds.size > 0,
        chatIds: [...chatIds],
      };
    }),
  );
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendOne(
  contact: ResolvedContact,
  text: string,
  channels: Set<PartnerBroadcastChannel>,
): Promise<PartnerBroadcastResult> {
  const result: PartnerBroadcastResult = { id: contact.id, name: contact.name };
  if (channels.has("telegram") && contact.chatIds.length) {
    let ok = false;
    for (const chatId of contact.chatIds) {
      const sent = await sendTelegramMessage(chatId, text);
      ok = ok || sent.ok;
    }
    result.telegram = ok;
  }
  if (channels.has("email") && isValidEmail(contact.email)) {
    const subject = text.split("\n")[0]?.trim().slice(0, 120) || "RentAirportCars";
    const mail = await sendPartnerMail({
      to: contact.email,
      subject,
      text,
      html: `<div style="font-family:sans-serif;line-height:1.5;white-space:pre-wrap">${escapeHtml(text)}</div>`,
      event: "PARTNER_NOTICE",
      payload: { partnerId: contact.id },
    });
    result.email = mail.sent;
  }
  if (channels.has("sms") && contact.phones.length) {
    let ok = true;
    for (const phone of contact.phones) {
      ok = (await sendSms(phone, text)).ok && ok;
    }
    result.sms = ok;
  }
  return result;
}

/** Each partner gets an individual message; a few run in parallel to stay inside the function time limit. */
export async function sendPartnerBroadcast(
  contacts: ResolvedContact[],
  text: string,
  channels: PartnerBroadcastChannel[],
): Promise<PartnerBroadcastResult[]> {
  const wanted = new Set(channels);
  const results: PartnerBroadcastResult[] = [];
  const queue = [...contacts];
  const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      results.push(await sendOne(next, text, wanted));
    }
  });
  await Promise.all(workers);
  const order = new Map(contacts.map((c, i) => [c.id, i]));
  return results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
