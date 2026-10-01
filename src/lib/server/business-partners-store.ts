import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  BusinessPartner,
  BusinessPartnerApplyInput,
  BusinessPartnerBalanceLine,
  BusinessPartnerEarning,
  BusinessPartnerSettings,
  BusinessPartnerStatus,
  BusinessPartnerTransfer,
} from "@/lib/catalog/business-partners";
import { DEFAULT_BUSINESS_PARTNER_COUNTRIES } from "@/lib/catalog/business-partners";
import {
  normalizeBusinessPartnerPayoutTiers,
  isIsoInMonthLocal,
  monthKeyLocal,
  partnerAmountFromSiteEarned,
  resolvePartnerOfSitePercent,
  DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS,
} from "@/lib/business-partner/payout-tiers";
import {
  generateReferralCode,
  isValidReferralCode,
  normalizeReferralCode,
} from "@/lib/business-partner/codes";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";
import {
  normalizePayoutMethod,
  validatePayoutPreferences,
} from "@/lib/business-partner/payout-validation";
import { hashSecret, verifySecret } from "@/lib/crypto";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "business-partners.json");

/** Matches admin stats / landing partner share per attributed booking. */
export const BUSINESS_PARTNER_SHARE_USD = 30;

type StoreFile = {
  partners: BusinessPartner[];
  settings: BusinessPartnerSettings;
  transfers: BusinessPartnerTransfer[];
  earnings: BusinessPartnerEarning[];
};

function emptyStore(): StoreFile {
  return {
    partners: [],
    settings: {
      countryIso2s: [...DEFAULT_BUSINESS_PARTNER_COUNTRIES],
      notificationEmail: "",
      adminPaypalEmail: "",
      payoutTiers: { ...DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS },
    },
    transfers: [],
    earnings: [],
  };
}

function normalizePartner(raw: Partial<BusinessPartner> & { id: string }): BusinessPartner {
  const status = (raw.status || "PENDING") as BusinessPartnerStatus;
  const earnedUsd = Math.max(0, Number(raw.earnedUsd) || 0);
  const paidUsd = Math.max(0, Number(raw.paidUsd) || 0);
  const messengers = Array.isArray(raw.messengers)
    ? raw.messengers.map((m) => String(m || "").trim().toUpperCase()).filter(Boolean)
    : [];
  return {
    id: raw.id,
    fullName: String(raw.fullName || ""),
    email: String(raw.email || ""),
    phone: String(raw.phone || ""),
    messengers,
    category: String(raw.category || ""),
    website: String(raw.website || ""),
    notes: String(raw.notes || ""),
    personalId: String(raw.personalId || "").trim(),
    payoutMethod: normalizePayoutMethod(raw.payoutMethod),
    payoutAccount: String(raw.payoutAccount || "").trim(),
    payoutSwift: String(raw.payoutSwift || "").trim().toUpperCase(),
    paypalAccount: String(raw.paypalAccount || "").trim().toLowerCase(),
    referralCode: normalizeReferralCode(String(raw.referralCode || "")),
    passwordHash: String(raw.passwordHash || ""),
    passwordPlain: String(raw.passwordPlain || ""),
    status: ["ACTIVE", "PENDING", "DISABLED", "REJECTED"].includes(status) ? status : "PENDING",
    countryIso2: String(raw.countryIso2 || "").toUpperCase(),
    referralBookings: Math.max(0, Math.floor(Number(raw.referralBookings) || 0)),
    earnedUsd,
    paidUsd: Math.min(paidUsd, earnedUsd),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

function normalizeTransfer(raw: Partial<BusinessPartnerTransfer> & { id: string }): BusinessPartnerTransfer {
  return {
    id: raw.id,
    partnerId: String(raw.partnerId || ""),
    partnerName: String(raw.partnerName || ""),
    amountUsd: Math.max(0, Number(raw.amountUsd) || 0),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    note: String(raw.note || ""),
  };
}

function normalizeEarning(raw: Partial<BusinessPartnerEarning> & { id: string }): BusinessPartnerEarning {
  const amountUsd = Math.max(0, Number(raw.amountUsd) || 0);
  const paidUsd = Math.min(amountUsd, Math.max(0, Number(raw.paidUsd) || 0));
  let siteEarnedUsd = Math.max(0, Number(raw.siteEarnedUsd) || 0);
  // Legacy / seed rows often stored partner share only — recover site program share (partner = 40%).
  if (siteEarnedUsd <= 0 && amountUsd > 0) {
    siteEarnedUsd = Math.round(((amountUsd * 100) / 40) * 100) / 100;
  }
  const customerFirstName = String(raw.customerFirstName || "").trim();
  const customerLastName = String(raw.customerLastName || "").trim();
  const customerName =
    String(raw.customerName || "").trim() ||
    [customerFirstName, customerLastName].filter(Boolean).join(" ").trim();
  return {
    id: raw.id,
    partnerId: String(raw.partnerId || ""),
    bookingRef: String(raw.bookingRef || "").trim() || `RAC-${raw.id.slice(0, 6).toUpperCase()}`,
    amountUsd,
    siteEarnedUsd,
    paidUsd,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    airport: String(raw.airport || "").trim().toUpperCase(),
    customerName,
    customerEmail: String(raw.customerEmail || "").trim().toLowerCase(),
    customerFirstName,
    customerLastName,
    note: String(raw.note || "").trim(),
  };
}

export function earningUnpaidUsd(e: BusinessPartnerEarning): number {
  return Math.max(0, (Number(e.amountUsd) || 0) - (Number(e.paidUsd) || 0));
}

const SAMPLE_AIRPORTS = ["TBS", "IST", "DXB", "EVN", "GYD"] as const;

/** Build per-booking earnings from aggregate partner counters when ledger is empty. */
function synthesizeEarningsForPartner(partner: BusinessPartner): BusinessPartnerEarning[] {
  const count = Math.max(
    0,
    Math.floor(Number(partner.referralBookings) || 0) ||
      Math.round((Number(partner.earnedUsd) || 0) / BUSINESS_PARTNER_SHARE_USD),
  );
  if (count <= 0) return [];

  const share =
    count > 0 && partner.earnedUsd > 0
      ? (Number(partner.earnedUsd) || 0) / count
      : BUSINESS_PARTNER_SHARE_USD;

  const created = new Date(partner.createdAt || Date.now()).getTime();
  const rows: BusinessPartnerEarning[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: randomUUID(),
      partnerId: partner.id,
      bookingRef: `RAC-${1000 + i + (partner.referralCode.charCodeAt(0) % 50) * 10}`,
      amountUsd: Math.round(share * 100) / 100,
      siteEarnedUsd: Math.round(share * (100 / 40) * 100) / 100,
      paidUsd: 0,
      createdAt: new Date(created + i * 86_400_000).toISOString(),
      airport: SAMPLE_AIRPORTS[i % SAMPLE_AIRPORTS.length]!,
      customerName: `Guest ${i + 1}`,
      customerEmail: "",
      customerFirstName: "Guest",
      customerLastName: String(i + 1),
      note: "",
    });
  }

  // Apply existing paidUsd FIFO onto synthesized lines
  let remainingPaid = Math.max(0, Number(partner.paidUsd) || 0);
  for (const row of rows) {
    if (remainingPaid <= 0) break;
    const apply = Math.min(row.amountUsd, remainingPaid);
    row.paidUsd = apply;
    remainingPaid -= apply;
  }
  return rows;
}

function ensureEarningsLedger(store: StoreFile): boolean {
  if (!Array.isArray(store.earnings)) store.earnings = [];
  if (store.earnings.length > 0) return false;

  const next: BusinessPartnerEarning[] = [];
  for (const partner of store.partners) {
    if ((Number(partner.earnedUsd) || 0) <= 0 && (Number(partner.referralBookings) || 0) <= 0) {
      continue;
    }
    next.push(...synthesizeEarningsForPartner(partner));
  }
  if (!next.length) return false;
  store.earnings = next;
  return true;
}

/** Keep partner counters aligned with the earnings ledger (source of truth). */
function reconcilePartnerCountersFromEarnings(store: StoreFile): boolean {
  if (!Array.isArray(store.earnings)) store.earnings = [];
  let changed = false;
  for (let i = 0; i < store.partners.length; i++) {
    const partner = store.partners[i]!;
    const rows = store.earnings.filter((e) => e.partnerId === partner.id);
    // Partners with counters but no ledger rows yet: synthesize (legacy seed) instead of zeroing.
    if (rows.length === 0) {
      if ((Number(partner.earnedUsd) || 0) > 0 || (Number(partner.referralBookings) || 0) > 0) {
        const synthesized = synthesizeEarningsForPartner(partner);
        if (synthesized.length) {
          store.earnings.push(...synthesized);
          changed = true;
        }
      }
      continue;
    }
    const earnedUsd = Math.round(rows.reduce((s, e) => s + (Number(e.amountUsd) || 0), 0) * 100) / 100;
    const paidFromLines = Math.round(rows.reduce((s, e) => s + (Number(e.paidUsd) || 0), 0) * 100) / 100;
    const paidUsd = Math.min(earnedUsd, Math.max(paidFromLines, Number(partner.paidUsd) || 0));
    const referralBookings = rows.length;
    if (
      partner.earnedUsd !== earnedUsd ||
      partner.referralBookings !== referralBookings ||
      partner.paidUsd !== paidUsd
    ) {
      store.partners[i] = {
        ...partner,
        earnedUsd,
        referralBookings,
        paidUsd,
      };
      changed = true;
    }
  }
  return changed;
}

/** Serialize read-modify-write so concurrent booking credits cannot clobber each other. */
let storeWriteChain: Promise<unknown> = Promise.resolve();

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeWriteChain.then(fn, fn);
  storeWriteChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const partners = Array.isArray(parsed.partners)
      ? parsed.partners.map((p) => normalizePartner(p as BusinessPartner))
      : [];
    const countryIso2s = Array.isArray(parsed.settings?.countryIso2s)
      ? parsed.settings!.countryIso2s.map((c) => String(c).toUpperCase()).filter(Boolean)
      : [...DEFAULT_BUSINESS_PARTNER_COUNTRIES];
    const rawEarnings = Array.isArray(parsed.earnings)
      ? (parsed.earnings as BusinessPartnerEarning[])
      : [];
    const earnings = rawEarnings.map((e) => normalizeEarning(e));
    const earningsRepaired = earnings.some((e, i) => {
      const rawSite = Math.max(0, Number(rawEarnings[i]?.siteEarnedUsd) || 0);
      return rawSite <= 0 && e.siteEarnedUsd > 0;
    });
    const store: StoreFile = {
      partners,
      settings: {
        countryIso2s: countryIso2s.length ? countryIso2s : [...DEFAULT_BUSINESS_PARTNER_COUNTRIES],
        notificationEmail: String(parsed.settings?.notificationEmail || "").trim(),
        adminPaypalEmail: String(
          (parsed.settings as { adminPaypalEmail?: string } | undefined)?.adminPaypalEmail || "",
        ).trim().toLowerCase(),
        payoutTiers: normalizeBusinessPartnerPayoutTiers(
          (parsed.settings as { payoutTiers?: unknown } | undefined)?.payoutTiers as
            | Parameters<typeof normalizeBusinessPartnerPayoutTiers>[0]
            | undefined,
        ),
      },
      transfers: Array.isArray(parsed.transfers)
        ? parsed.transfers.map((t) => normalizeTransfer(t as BusinessPartnerTransfer))
        : [],
      earnings,
    };
    let dirty = ensureEarningsLedger(store);
    dirty = reconcilePartnerCountersFromEarnings(store) || dirty || earningsRepaired;
    if (dirty) {
      await writeStore(store);
    }
    return store;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listBusinessPartners(): Promise<BusinessPartner[]> {
  const store = await readStore();
  return [...store.partners].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getBusinessPartnerById(id: string): Promise<BusinessPartner | null> {
  const store = await readStore();
  return store.partners.find((p) => p.id === id) ?? null;
}

export async function getBusinessPartnerByCode(code: string): Promise<BusinessPartner | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const store = await readStore();
  return (
    store.partners.find((p) => normalizeReferralCode(p.referralCode) === normalized) ?? null
  );
}

/** ACTIVE partner for a referral / promo code (QR or typed). */
export async function getActiveBusinessPartnerByCode(
  code: string,
): Promise<BusinessPartner | null> {
  const partner = await getBusinessPartnerByCode(code);
  if (!partner || partner.status !== "ACTIVE") return null;
  return partner;
}

/** Login lookup: email + password (case-insensitive email). */
export async function findBusinessPartnerForLogin(
  emailRaw: string,
  passwordRaw: string,
): Promise<BusinessPartner | null> {
  const email = String(emailRaw || "").trim().toLowerCase();
  const password = String(passwordRaw || "");
  if (!email || !password) return null;
  const store = await readStore();
  const partner = store.partners.find((p) => p.email.toLowerCase() === email);
  if (!partner?.passwordHash) return null;
  if (!verifySecret(password, partner.passwordHash)) return null;
  return partner;
}

export async function isReferralCodeTaken(code: string, excludeId?: string): Promise<boolean> {
  const normalized = normalizeReferralCode(code);
  if (!normalized || !isValidReferralCode(normalized)) return true;
  const store = await readStore();
  return store.partners.some(
    (p) => p.referralCode === normalized && (!excludeId || p.id !== excludeId),
  );
}

async function allocateUniqueCode(desired?: string): Promise<string> {
  const wanted = normalizeReferralCode(desired || "");
  if (wanted) {
    if (!isValidReferralCode(wanted)) throw new Error("INVALID_CODE");
    if (await isReferralCodeTaken(wanted)) throw new Error("CODE_TAKEN");
    return wanted;
  }
  for (let i = 0; i < 40; i++) {
    const code = generateReferralCode();
    if (!(await isReferralCodeTaken(code))) return code;
  }
  throw new Error("CODE_ALLOC_FAILED");
}

export async function createBusinessPartner(
  input: BusinessPartnerApplyInput,
): Promise<BusinessPartner> {
  const fullName = String(input.fullName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();
  const category = String(input.category || "").trim();
  const website = String(input.website || "").trim();
  const notes = String(input.notes || "").trim();
  const password = String(input.password || "");
  const messengers = Array.isArray(input.messengers)
    ? [...new Set(input.messengers.map((m) => String(m || "").trim().toUpperCase()).filter(Boolean))]
    : [];
  if (!fullName || !email || !phone || !category || !password) {
    throw new Error("MISSING_FIELDS");
  }
  if (messengers.length === 0) {
    throw new Error("MESSENGERS_REQUIRED");
  }
  if (!isValidBusinessPartnerPassword(password)) {
    throw new Error("WEAK_PASSWORD");
  }

  const store = await readStore();
  const existingEmail = store.partners.find((p) => p.email === email);
  if (existingEmail) {
    throw new Error("EMAIL_EXISTS");
  }

  const referralCode = await allocateUniqueCode(input.referralCode);
  const now = new Date().toISOString();
  const partner: BusinessPartner = {
    id: randomUUID(),
    fullName,
    email,
    phone,
    messengers,
    category,
    website,
    notes,
    personalId: "",
    payoutMethod: "BANK",
    payoutAccount: "",
    payoutSwift: "",
    paypalAccount: "",
    referralCode,
    passwordHash: hashSecret(password),
    passwordPlain: password,
    status: "PENDING",
    countryIso2: "",
    referralBookings: 0,
    earnedUsd: 0,
    paidUsd: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.partners.push(partner);
  await writeStore(store);
  return partner;
}

export async function updateBusinessPartnerStatus(
  id: string,
  status: BusinessPartnerStatus,
  countryIso2?: string,
): Promise<BusinessPartner> {
  const store = await readStore();
  const idx = store.partners.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("NOT_FOUND");
  const current = store.partners[idx]!;
  const next: BusinessPartner = {
    ...current,
    status,
    countryIso2:
      countryIso2 !== undefined ? String(countryIso2).toUpperCase() : current.countryIso2,
    updatedAt: new Date().toISOString(),
  };
  store.partners[idx] = next;
  await writeStore(store);
  if (status === "ACTIVE") {
    try {
      await backfillBusinessPartnerAttributionsFromBookings();
    } catch {
      /* best-effort */
    }
  }
  const fresh = await getBusinessPartnerById(id);
  return fresh || next;
}

export async function deleteBusinessPartner(id: string): Promise<void> {
  const store = await readStore();
  const idx = store.partners.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("NOT_FOUND");
  store.partners.splice(idx, 1);
  if (Array.isArray(store.earnings)) {
    store.earnings = store.earnings.filter((e) => e.partnerId !== id);
  }
  if (Array.isArray(store.transfers)) {
    store.transfers = store.transfers.filter((t) => t.partnerId !== id);
  }
  await writeStore(store);
}

/** Partner self-service profile edit from the cabinet (does not change email / code / status). */
export async function updateBusinessPartnerProfile(
  id: string,
  patch: {
    fullName?: string;
    phone?: string;
    category?: string;
    website?: string;
    notes?: string;
    messengers?: string[];
    personalId?: string;
    payoutMethod?: "BANK" | "PAYPAL";
    payoutAccount?: string;
    payoutSwift?: string;
    paypalAccount?: string;
  },
): Promise<BusinessPartner> {
  return withStoreLock(async () => {
    const store = await readStore();
    const idx = store.partners.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("NOT_FOUND");
    const current = store.partners[idx]!;

    const fullName =
      patch.fullName !== undefined ? String(patch.fullName || "").trim() : current.fullName;
    const phone = patch.phone !== undefined ? String(patch.phone || "").trim() : current.phone;
    const category =
      patch.category !== undefined ? String(patch.category || "").trim() : current.category;
    const website =
      patch.website !== undefined ? String(patch.website || "").trim() : current.website;
    const notes = patch.notes !== undefined ? String(patch.notes || "").trim() : current.notes;
    const personalId =
      patch.personalId !== undefined
        ? String(patch.personalId || "").trim()
        : current.personalId;
    const messengers = Array.isArray(patch.messengers)
      ? [
          ...new Set(
            patch.messengers.map((m) => String(m || "").trim().toUpperCase()).filter(Boolean),
          ),
        ]
      : current.messengers;

    if (!fullName || !phone || !category || !personalId) throw new Error("MISSING_FIELDS");
    if (messengers.length === 0) throw new Error("MESSENGERS_REQUIRED");

    const payout = validatePayoutPreferences({
      payoutMethod: patch.payoutMethod ?? current.payoutMethod,
      payoutAccount: patch.payoutAccount ?? current.payoutAccount,
      payoutSwift: patch.payoutSwift ?? current.payoutSwift,
      paypalAccount: patch.paypalAccount ?? current.paypalAccount,
    });
    if (!payout.ok) {
      throw new Error(payout.errorCode || "PAYOUT_REQUIRED");
    }

    const next: BusinessPartner = {
      ...current,
      fullName,
      phone,
      category,
      website,
      notes,
      personalId,
      payoutMethod: payout.method,
      payoutAccount: payout.payoutAccount,
      payoutSwift: payout.payoutSwift,
      paypalAccount: payout.paypalAccount,
      messengers,
      updatedAt: new Date().toISOString(),
    };
    store.partners[idx] = next;
    await writeStore(store);
    return next;
  });
}

/** Admin sets / resets a partner cabinet password (no current-password check). */
export async function adminSetBusinessPartnerPassword(
  id: string,
  newPasswordRaw: string,
): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    const idx = store.partners.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("NOT_FOUND");
    const newPassword = String(newPasswordRaw || "");
    if (!isValidBusinessPartnerPassword(newPassword)) {
      throw new Error("WEAK_PASSWORD");
    }
    const current = store.partners[idx]!;
    store.partners[idx] = {
      ...current,
      passwordHash: hashSecret(newPassword),
      passwordPlain: newPassword,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
  });
}

/** Partner self-service password change (requires current password). */
export async function changeBusinessPartnerPassword(
  id: string,
  currentPasswordRaw: string,
  newPasswordRaw: string,
): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    const idx = store.partners.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("NOT_FOUND");
    const current = store.partners[idx]!;
    const currentPassword = String(currentPasswordRaw || "");
    const newPassword = String(newPasswordRaw || "");
    if (!current.passwordHash || !verifySecret(currentPassword, current.passwordHash)) {
      throw new Error("INVALID_PASSWORD");
    }
    if (!isValidBusinessPartnerPassword(newPassword)) {
      throw new Error("WEAK_PASSWORD");
    }
    store.partners[idx] = {
      ...current,
      passwordHash: hashSecret(newPassword),
      passwordPlain: newPassword,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
  });
}

/**
 * Credit an ACTIVE business partner for a completed guest booking attributed via
 * their referral / promo code. Idempotent per bookingRef.
 */
export async function attributeBookingToBusinessPartner(input: {
  code: string;
  bookingRef: string;
  airport?: string;
  customerName?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  amountUsd?: number;
  siteEarnedUsd?: number;
}): Promise<BusinessPartner | null> {
  const code = normalizeReferralCode(input.code);
  const bookingRef = String(input.bookingRef || "").trim();
  if (!code || !bookingRef) return null;

  return withStoreLock(async () => {
    const store = await readStore();
    if (!Array.isArray(store.earnings)) store.earnings = [];

    const idx = store.partners.findIndex(
      (p) => normalizeReferralCode(p.referralCode) === code,
    );
    if (idx < 0) return null;
    const partner = store.partners[idx]!;
    if (partner.status !== "ACTIVE") return null;

    const already = store.earnings.some(
      (e) => e.partnerId === partner.id && e.bookingRef === bookingRef,
    );
    if (already) return partner;

    const amountUsd =
      input.amountUsd !== undefined && Number.isFinite(input.amountUsd)
        ? Math.max(0, Math.round(Number(input.amountUsd) * 100) / 100)
        : BUSINESS_PARTNER_SHARE_USD;
    const siteEarnedUsd =
      input.siteEarnedUsd !== undefined && Number.isFinite(input.siteEarnedUsd)
        ? Math.max(0, Math.round(Number(input.siteEarnedUsd) * 100) / 100)
        : Math.round(((amountUsd * 100) / 40) * 100) / 100;

    const customerFirstName = String(input.customerFirstName || "").trim();
    const customerLastName = String(input.customerLastName || "").trim();
    const customerName =
      String(input.customerName || "").trim() ||
      [customerFirstName, customerLastName].filter(Boolean).join(" ").trim();

    const earning: BusinessPartnerEarning = {
      id: randomUUID(),
      partnerId: partner.id,
      bookingRef,
      amountUsd,
      siteEarnedUsd,
      paidUsd: 0,
      createdAt: new Date().toISOString(),
      airport: String(input.airport || "").trim().toUpperCase().slice(0, 8),
      customerName,
      customerEmail: String(input.customerEmail || "").trim().toLowerCase().slice(0, 160),
      customerFirstName: customerFirstName.slice(0, 80),
      customerLastName: customerLastName.slice(0, 80),
      note: "",
    };
    store.earnings.push(earning);

    const next: BusinessPartner = {
      ...partner,
      referralBookings: partner.referralBookings + 1,
      earnedUsd: Math.round((partner.earnedUsd + amountUsd) * 100) / 100,
      updatedAt: new Date().toISOString(),
    };
    store.partners[idx] = next;

    // Align all unpaid earnings this calendar month to the volume tier for the
    // updated monthly count (promo / QR / link attributed bookings only).
    const monthKey = monthKeyLocal(new Date(earning.createdAt));
    const tiers = normalizeBusinessPartnerPayoutTiers(store.settings.payoutTiers);
    const monthRows = store.earnings
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.partnerId === partner.id && isIsoInMonthLocal(e.createdAt, monthKey));
    const monthlyCount = monthRows.length;
    const percent = resolvePartnerOfSitePercent(monthlyCount, tiers);
    let earnedDelta = 0;
    for (const { e, i } of monthRows) {
      const paid = Math.max(0, Number(e.paidUsd) || 0);
      const nextAmount = partnerAmountFromSiteEarned(e.siteEarnedUsd, percent);
      if (Math.abs(nextAmount - e.amountUsd) < 0.005) continue;
      if (paid > nextAmount + 0.005) continue;
      const unpaidBefore = Math.max(0, e.amountUsd - paid);
      const unpaidAfter = Math.max(0, nextAmount - paid);
      earnedDelta += unpaidAfter - unpaidBefore;
      store.earnings[i] = { ...e, amountUsd: nextAmount };
    }
    if (Math.abs(earnedDelta) >= 0.005) {
      store.partners[idx] = {
        ...store.partners[idx]!,
        earnedUsd: Math.max(
          0,
          Math.round((store.partners[idx]!.earnedUsd + earnedDelta) * 100) / 100,
        ),
      };
    }

    await writeStore(store);
    return store.partners[idx]!;
  });
}

/**
 * Attribute any file bookings that carry a promo code but are missing from the ledger.
 * Safe to call repeatedly (idempotent per bookingRef).
 */
export async function backfillBusinessPartnerAttributionsFromBookings(): Promise<number> {
  const { listAllFileBookings } = await import("@/lib/server/customer-bookings-store");
  const { formatBookingRef } = await import("@/lib/ids");
  const bookings = await listAllFileBookings();
  let credited = 0;
  for (const b of bookings) {
    const code = normalizeReferralCode(String(b.promoCode || ""));
    if (!code) continue;
    const bookingRef = formatBookingRef(b.sequentialNumber) || b.id;
    const before = await getBusinessPartnerByCode(code);
    const beforeBookings = before?.referralBookings ?? 0;
    const partner = await attributeBookingToBusinessPartner({
      code,
      bookingRef,
      airport: b.pickupAirportIata,
      customerName: `${b.guestFirstName || ""} ${b.guestLastName || ""}`.trim(),
      customerEmail: b.guestEmail,
      customerFirstName: b.guestFirstName,
      customerLastName: b.guestLastName,
    });
    if (partner && partner.referralBookings > beforeBookings) {
      credited += 1;
    }
  }
  return credited;
}

export async function listBusinessPartnerEarnings(
  partnerId: string,
  limit = 50,
): Promise<BusinessPartnerEarning[]> {
  const store = await readStore();
  return (store.earnings || [])
    .filter((e) => e.partnerId === partnerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.max(1, Math.min(200, limit)));
}

/** All earnings (newest first) for admin stats / invoice rollups. */
export async function listAllBusinessPartnerEarnings(): Promise<BusinessPartnerEarning[]> {
  const store = await readStore();
  return [...(store.earnings || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getBusinessPartnerSettings(): Promise<BusinessPartnerSettings> {
  const store = await readStore();
  return {
    ...store.settings,
    payoutTiers: normalizeBusinessPartnerPayoutTiers(store.settings.payoutTiers),
  };
}

export async function saveBusinessPartnerSettings(
  settings: Partial<BusinessPartnerSettings> & { countryIso2s?: string[] },
): Promise<BusinessPartnerSettings> {
  const store = await readStore();
  const nextCountries = Array.isArray(settings.countryIso2s)
    ? [...new Set(settings.countryIso2s.map((c) => c.toUpperCase()).filter(Boolean))]
    : store.settings.countryIso2s;
  const notificationEmail =
    settings.notificationEmail !== undefined
      ? String(settings.notificationEmail || "").trim()
      : store.settings.notificationEmail || "";
  const adminPaypalEmail =
    settings.adminPaypalEmail !== undefined
      ? String(settings.adminPaypalEmail || "").trim().toLowerCase()
      : store.settings.adminPaypalEmail || "";
  const payoutTiers = normalizeBusinessPartnerPayoutTiers(
    settings.payoutTiers !== undefined ? settings.payoutTiers : store.settings.payoutTiers,
  );
  store.settings = {
    countryIso2s: nextCountries.length ? nextCountries : [...DEFAULT_BUSINESS_PARTNER_COUNTRIES],
    notificationEmail,
    adminPaypalEmail,
    payoutTiers,
  };
  await writeStore(store);
  // Tier edits apply to unpaid current-month attributed bookings immediately.
  if (settings.payoutTiers !== undefined) {
    try {
      await recalibrateAllPartnersCurrentMonth();
    } catch (error) {
      console.warn("[business-partners] tier recalibrate after settings", error);
    }
  }
  return getBusinessPartnerSettings();
}

/** Attributed bookings for a partner in the current local calendar month. */
export async function countPartnerMonthlyAttributedBookings(
  partnerId: string,
  at = new Date(),
): Promise<number> {
  const store = await readStore();
  const key = monthKeyLocal(at);
  return (store.earnings || []).filter(
    (e) => e.partnerId === partnerId && isIsoInMonthLocal(e.createdAt, key),
  ).length;
}

/**
 * Re-apply the month’s volume tier % to all unpaid earnings in that calendar month.
 * When booking count crosses 5→6 or 25→26, partner share amounts adjust automatically.
 */
export async function recalibratePartnerMonthEarnings(
  partnerId: string,
  at = new Date(),
): Promise<{ updated: number; percent: number; monthlyCount: number }> {
  return withStoreLock(async () => {
    const store = await readStore();
    if (!Array.isArray(store.earnings)) store.earnings = [];
    const key = monthKeyLocal(at);
    const tiers = normalizeBusinessPartnerPayoutTiers(store.settings.payoutTiers);
    const monthRows = store.earnings
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.partnerId === partnerId && isIsoInMonthLocal(e.createdAt, key));
    const monthlyCount = monthRows.length;
    const percent = resolvePartnerOfSitePercent(monthlyCount, tiers);
    if (!monthlyCount) return { updated: 0, percent, monthlyCount: 0 };

    let earnedDelta = 0;
    let updated = 0;
    for (const { e, i } of monthRows) {
      const paid = Math.max(0, Number(e.paidUsd) || 0);
      // Only adjust lines that are not yet transferred (or leave paid portion fixed).
      const nextAmount = partnerAmountFromSiteEarned(e.siteEarnedUsd, percent);
      if (Math.abs(nextAmount - e.amountUsd) < 0.005) continue;
      if (paid > nextAmount + 0.005) continue; // already paid more than new amount — skip
      const unpaidBefore = Math.max(0, e.amountUsd - paid);
      const unpaidAfter = Math.max(0, nextAmount - paid);
      earnedDelta += unpaidAfter - unpaidBefore;
      store.earnings[i] = { ...e, amountUsd: nextAmount };
      updated += 1;
    }

    if (updated > 0) {
      const pIdx = store.partners.findIndex((p) => p.id === partnerId);
      if (pIdx >= 0) {
        const p = store.partners[pIdx]!;
        store.partners[pIdx] = {
          ...p,
          earnedUsd: Math.max(0, Math.round((p.earnedUsd + earnedDelta) * 100) / 100),
          updatedAt: new Date().toISOString(),
        };
      }
      await writeStore(store);
    }
    return { updated, percent, monthlyCount };
  });
}

/** Recalibrate current-month unpaid earnings for every partner (after tier settings change). */
export async function recalibrateAllPartnersCurrentMonth(): Promise<number> {
  const partners = await listBusinessPartners();
  let total = 0;
  for (const p of partners) {
    const r = await recalibratePartnerMonthEarnings(p.id);
    total += r.updated;
  }
  return total;
}

/** Resolve partner-of-site % for the next attributed booking this month. */
export async function resolvePartnerPayoutPercentForNextBooking(
  partnerId: string,
): Promise<number> {
  const settings = await getBusinessPartnerSettings();
  const monthly = await countPartnerMonthlyAttributedBookings(partnerId);
  return resolvePartnerOfSitePercent(monthly + 1, settings.payoutTiers);
}

/** Lightweight money stats for the admin panel (program rates from the public landing). */
export async function getBusinessPartnerFinancialStats() {
  const partners = await listBusinessPartners();
  const active = partners.filter((p) => p.status === "ACTIVE").length;
  const pending = partners.filter((p) => p.status === "PENDING").length;
  const rejected = partners.filter((p) => p.status === "REJECTED" || p.status === "DISABLED").length;

  const avgBookingUsd = 500;
  const siteCommissionUsd = 75;
  const partnerShareUsd = BUSINESS_PARTNER_SHARE_USD;
  const siteShareUsd = siteCommissionUsd - partnerShareUsd;
  const customerDiscountUsd = 25;

  return {
    totalPartners: partners.length,
    activePartners: active,
    pendingPartners: pending,
    rejectedPartners: rejected,
    rates: {
      avgBookingUsd,
      siteCommissionUsd,
      siteShareUsd,
      partnerShareUsd,
      customerDiscountUsd,
    },
    projectedMonthly: {
      siteCommissionUsd: active * siteCommissionUsd,
      siteShareUsd: active * siteShareUsd,
      partnerPayoutUsd: active * partnerShareUsd,
      customerDiscountUsd: active * customerDiscountUsd,
    },
  };
}

export function unpaidBalanceUsd(partner: BusinessPartner): number {
  return Math.max(0, (Number(partner.earnedUsd) || 0) - (Number(partner.paidUsd) || 0));
}

export async function listBusinessPartnerTransfers(): Promise<BusinessPartnerTransfer[]> {
  const store = await readStore();
  return [...(store.transfers || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type { BusinessPartnerBalanceLine };

export async function listBusinessPartnerBalanceLines(
  partnerId: string,
): Promise<{
  partner: BusinessPartner;
  lines: BusinessPartnerBalanceLine[];
  unpaidTotalUsd: number;
}> {
  const store = await readStore();
  const partner = store.partners.find((p) => p.id === partnerId);
  if (!partner) throw new Error("NOT_FOUND");

  const lines = (store.earnings || [])
    .filter((e) => e.partnerId === partnerId)
    .map((e) => ({ ...e, unpaidUsd: earningUnpaidUsd(e) }))
    .filter((e) => e.unpaidUsd > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const unpaidTotalUsd = lines.reduce((acc, l) => acc + l.unpaidUsd, 0);
  return { partner, lines, unpaidTotalUsd };
}

/** Record a payout transfer; increases paidUsd up to earnedUsd and allocates onto earning lines FIFO. */
export async function recordBusinessPartnerTransfer(
  partnerId: string,
  amountUsd?: number,
  note = "",
): Promise<{ partner: BusinessPartner; transfer: BusinessPartnerTransfer }> {
  const store = await readStore();
  if (!Array.isArray(store.transfers)) store.transfers = [];
  if (!Array.isArray(store.earnings)) store.earnings = [];
  const idx = store.partners.findIndex((p) => p.id === partnerId);
  if (idx < 0) throw new Error("NOT_FOUND");
  const current = store.partners[idx]!;
  const due = unpaidBalanceUsd(current);
  if (due <= 0) throw new Error("NOTHING_DUE");

  const requested =
    amountUsd === undefined || amountUsd === null
      ? due
      : Math.max(0, Number(amountUsd) || 0);
  if (requested <= 0) throw new Error("INVALID_AMOUNT");
  const amount = Math.min(requested, due);

  const now = new Date().toISOString();
  const transfer: BusinessPartnerTransfer = {
    id: randomUUID(),
    partnerId: current.id,
    partnerName: current.fullName,
    amountUsd: amount,
    createdAt: now,
    note: String(note || "").trim(),
  };

  // Allocate onto earning lines oldest-first
  let remaining = amount;
  const partnerEarnings = store.earnings
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.partnerId === partnerId)
    .sort((a, b) => new Date(a.e.createdAt).getTime() - new Date(b.e.createdAt).getTime());

  for (const { e, i } of partnerEarnings) {
    if (remaining <= 0) break;
    const lineDue = earningUnpaidUsd(e);
    if (lineDue <= 0) continue;
    const apply = Math.min(lineDue, remaining);
    store.earnings[i] = { ...e, paidUsd: e.paidUsd + apply };
    remaining -= apply;
  }

  const next: BusinessPartner = {
    ...current,
    paidUsd: Math.min(current.earnedUsd, (Number(current.paidUsd) || 0) + amount),
    updatedAt: now,
  };
  store.partners[idx] = next;
  store.transfers.unshift(transfer);
  await writeStore(store);
  return { partner: next, transfer };
}
