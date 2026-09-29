import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeLogin } from "@/lib/crypto";

const STORE = join(dataRoot(), "partner-bans.json");

export type PartnerBanRecord = {
  id: string;
  email: string;
  phoneDigits: string;
  phoneDisplay: string;
  /** Extra emails entered at block time */
  extraEmails: string[];
  /** Car registration / plate numbers */
  plates: string[];
  /** Free-text extra notes shown in moderation */
  notes: string;
  reason: string;
  partnerId: string | null;
  createdAt: string;
};

type StoreFile = { bans: PartnerBanRecord[] };

function phoneDigits(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function normalizePlate(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return { bans: Array.isArray(parsed.bans) ? (parsed.bans as PartnerBanRecord[]) : [] };
  } catch {
    return { bans: [] };
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function listPartnerBans(): Promise<PartnerBanRecord[]> {
  return (await readStore()).bans;
}

export async function findPartnerBanMatches(opts: {
  email?: string | null;
  phone?: string | null;
  plate?: string | null;
}): Promise<PartnerBanRecord[]> {
  const email = normalizeLogin(opts.email || "");
  const digits = phoneDigits(opts.phone || "");
  const plate = normalizePlate(opts.plate || "");
  if (!email && !digits && !plate) return [];
  const { bans } = await readStore();
  return bans.filter((b) => {
    if (email && (b.email === email || b.extraEmails.includes(email))) return true;
    if (digits.length >= 8 && b.phoneDigits === digits) return true;
    if (plate && b.plates.includes(plate)) return true;
    return false;
  });
}

export async function isPartnerContactBanned(opts: {
  email?: string | null;
  phone?: string | null;
  plate?: string | null;
}): Promise<PartnerBanRecord | null> {
  const hits = await findPartnerBanMatches(opts);
  return hits[0] || null;
}

export function formatPartnerBanWarning(ban: PartnerBanRecord, locale = "en"): string {
  const parts: string[] = [];
  if (ban.email) parts.push(locale === "ka" ? `ელფოსტა: ${ban.email}` : `Email: ${ban.email}`);
  if (ban.phoneDisplay || ban.phoneDigits) {
    parts.push(
      locale === "ka"
        ? `ტელეფონი: ${ban.phoneDisplay || ban.phoneDigits}`
        : `Phone: ${ban.phoneDisplay || ban.phoneDigits}`,
    );
  }
  for (const e of ban.extraEmails) {
    if (e && e !== ban.email) parts.push(locale === "ka" ? `დამატებითი მეილი: ${e}` : `Extra email: ${e}`);
  }
  for (const p of ban.plates) {
    parts.push(locale === "ka" ? `მანქანის ნომერი: ${p}` : `Vehicle plate: ${p}`);
  }
  if (ban.notes) parts.push(locale === "ka" ? `შენიშვნა: ${ban.notes}` : `Note: ${ban.notes}`);
  const head =
    locale === "ka"
      ? "დაბლოკილია"
      : locale === "ru"
        ? "Заблокировано"
        : "Blocked";
  return `${head}: ${parts.join(" · ") || ban.reason}`;
}

export async function upsertPartnerBan(input: {
  email: string;
  phone: string;
  extraEmails?: string[];
  plates?: string[];
  notes?: string;
  reason?: string;
  partnerId?: string | null;
}): Promise<PartnerBanRecord> {
  const email = normalizeLogin(input.email);
  const digits = phoneDigits(input.phone);
  const extraEmails = [...new Set((input.extraEmails || []).map((e) => normalizeLogin(e)).filter(Boolean))];
  const plates = [...new Set((input.plates || []).map(normalizePlate).filter(Boolean))];
  const notes = String(input.notes || "").trim();
  if (!email && !digits && !extraEmails.length && !plates.length) {
    throw new Error("Email, phone, plate or extra detail required to block");
  }
  const store = await readStore();
  const existing = store.bans.findIndex(
    (b) =>
      (email && b.email === email) ||
      (digits && b.phoneDigits === digits) ||
      (input.partnerId && b.partnerId === input.partnerId),
  );
  const row: PartnerBanRecord = {
    id: existing >= 0 ? store.bans[existing].id : randomUUID(),
    email: email || (existing >= 0 ? store.bans[existing].email : ""),
    phoneDigits: digits || (existing >= 0 ? store.bans[existing].phoneDigits : ""),
    phoneDisplay: String(input.phone || "").trim(),
    extraEmails:
      existing >= 0
        ? [...new Set([...store.bans[existing].extraEmails, ...extraEmails])]
        : extraEmails,
    plates: existing >= 0 ? [...new Set([...store.bans[existing].plates, ...plates])] : plates,
    notes: notes || (existing >= 0 ? store.bans[existing].notes : ""),
    reason: (input.reason || "Blocked by admin").trim(),
    partnerId: input.partnerId ?? (existing >= 0 ? store.bans[existing].partnerId : null),
    createdAt: existing >= 0 ? store.bans[existing].createdAt : new Date().toISOString(),
  };
  if (existing >= 0) store.bans[existing] = row;
  else store.bans.unshift(row);
  await writeStore(store);
  return row;
}

export async function removePartnerBan(opts: {
  email?: string | null;
  phone?: string | null;
  partnerId?: string | null;
  banId?: string | null;
}): Promise<boolean> {
  const email = normalizeLogin(opts.email || "");
  const digits = phoneDigits(opts.phone || "");
  const store = await readStore();
  const before = store.bans.length;
  store.bans = store.bans.filter((b) => {
    if (opts.banId && b.id === opts.banId) return false;
    if (opts.partnerId && b.partnerId === opts.partnerId) return false;
    if (email && b.email === email) return false;
    if (digits && b.phoneDigits === digits) return false;
    return true;
  });
  if (store.bans.length === before) return false;
  await writeStore(store);
  return true;
}
