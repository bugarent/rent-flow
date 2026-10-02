import { findSearchPlace } from "@/lib/catalog/search-places";
import { worldCountryName } from "@/lib/catalog/world-countries";
import {
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { parseIso2List } from "@/lib/partner";

export type ProfileFieldChange = {
  field: string;
  from: string;
  to: string;
};

export type PendingProfileChange = {
  id: string;
  at: string;
  summary: string;
  changes: ProfileFieldChange[];
};

export type PartnerProfileModeration = {
  countriesEditUnlockUntil: string | null;
  pendingChanges: PendingProfileChange[];
  unreadCount: number;
  /** Last publicly visible settings while a remodeation draft is pending. */
  publishedSettings: PartnerCompanySettings | null;
  /** Admin note after remodeation reject (shown to partner). */
  lastAdminNote: string | null;
  lastAdminNoteAt: string | null;
};

function newId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `chg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyProfileModeration(): PartnerProfileModeration {
  return {
    countriesEditUnlockUntil: null,
    pendingChanges: [],
    unreadCount: 0,
    publishedSettings: null,
    lastAdminNote: null,
    lastAdminNoteAt: null,
  };
}

export function parseProfileModeration(raw: unknown): PartnerProfileModeration {
  const base = emptyProfileModeration();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const pendingRaw = Array.isArray(o.pendingChanges) ? o.pendingChanges : [];
  const pendingChanges: PendingProfileChange[] = pendingRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const changes = Array.isArray(row.changes)
        ? row.changes
            .map((c) => {
              if (!c || typeof c !== "object") return null;
              const ch = c as Record<string, unknown>;
              return {
                field: String(ch.field || ""),
                from: String(ch.from ?? ""),
                to: String(ch.to ?? ""),
              };
            })
            .filter((c): c is ProfileFieldChange => Boolean(c?.field))
        : [];
      return {
        id: String(row.id || newId()),
        at: String(row.at || new Date().toISOString()),
        summary: String(row.summary || "Profile updated"),
        changes,
      };
    })
    .filter((c): c is PendingProfileChange => Boolean(c));

  let publishedSettings: PartnerCompanySettings | null = null;
  if (o.publishedSettings && typeof o.publishedSettings === "object") {
    try {
      publishedSettings = parseCompanySettings(o.publishedSettings);
    } catch {
      publishedSettings = null;
    }
  }

  return {
    countriesEditUnlockUntil: o.countriesEditUnlockUntil
      ? String(o.countriesEditUnlockUntil)
      : null,
    pendingChanges,
    unreadCount: Math.max(0, Number(o.unreadCount) || pendingChanges.length),
    publishedSettings,
    lastAdminNote: o.lastAdminNote ? String(o.lastAdminNote) : null,
    lastAdminNoteAt: o.lastAdminNoteAt ? String(o.lastAdminNoteAt) : null,
  };
}

export function countriesEditUnlocked(moderation: PartnerProfileModeration, now = new Date()): boolean {
  if (!moderation.countriesEditUnlockUntil) return false;
  const until = new Date(moderation.countriesEditUnlockUntil);
  return Number.isFinite(until.getTime()) && until.getTime() > now.getTime();
}

/** Countries are always editable by the partner (no timed lock). */
export function canEditDeliveryCountries(_opts: {
  status: string;
  approvedAt?: Date | string | null;
  moderation: PartnerProfileModeration;
  now?: Date;
}): boolean {
  return true;
}

function fmtList(iso2s: string[]) {
  return iso2s
    .map((c) => c.toUpperCase())
    .sort()
    .map((iso) => `${worldCountryName(iso)} (${iso})`)
    .join(", ");
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Fields partners may edit anytime without admin remodeation
 * (work days / pricing currency / prep / holidays / off-hours + payment & deposit).
 */
export const PROFILE_REMODERATION_EXEMPT_FIELDS = new Set<string>([
  "workingDays",
  "pricingCurrency",
  "prepMinutes",
  "publicHolidays",
  "offHoursService",
  "offHoursPrice",
  "rentPaymentMethods",
  "depositMethods",
  "requireCreditCard",
  "cashDepositRefundDays",
]);

export function filterRemoderationChanges(changes: ProfileFieldChange[]): ProfileFieldChange[] {
  return changes.filter((c) => !PROFILE_REMODERATION_EXEMPT_FIELDS.has(c.field));
}

/** Keep live public snapshot in sync for remodeation-exempt fields. */
export function applyExemptSettingsToPublished(
  published: PartnerCompanySettings,
  next: PartnerCompanySettings,
): PartnerCompanySettings {
  return {
    ...published,
    workingDays: next.workingDays,
    pricingCurrency: next.pricingCurrency,
    prepMinutes: next.prepMinutes,
    publicHolidays: next.publicHolidays,
    offHoursService: next.offHoursService,
    offHoursPrice: next.offHoursPrice,
    rentPaymentMethods: next.rentPaymentMethods,
    depositMethods: next.depositMethods,
    requireCreditCard: next.requireCreditCard,
    cashDepositRefundDays: next.cashDepositRefundDays,
  };
}

/** Compare company settings for admin remodeation notice. */
export function diffCompanySettings(
  before: PartnerCompanySettings,
  after: PartnerCompanySettings,
): ProfileFieldChange[] {
  const changes: ProfileFieldChange[] = [];
  const scalarKeys: Array<keyof PartnerCompanySettings> = [
    "title",
    "firstName",
    "lastName",
    "legalName",
    "country",
    "centralOffice",
    "address",
    "logoUrl",
    "primaryPhone",
    "secondaryPhone",
    "email",
    "website",
    "prepMinutes",
    "offHoursService",
    "offHoursPrice",
    "pricingCurrency",
    "requireCreditCard",
    "cashDepositRefundDays",
    "yearFullySeasonal",
  ];

  for (const key of scalarKeys) {
    const from = String(before[key] ?? "");
    const to = String(after[key] ?? "");
    if (from !== to) changes.push({ field: String(key), from: from || "—", to: to || "—" });
  }

  const beforeLangs = [...(before.clientLanguages || [])].map((c) => c.toLowerCase()).sort().join(",");
  const afterLangs = [...(after.clientLanguages || [])].map((c) => c.toLowerCase()).sort().join(",");
  if (beforeLangs !== afterLangs) {
    changes.push({
      field: "clientLanguages",
      from: (before.clientLanguages || []).join(", ") || "—",
      to: (after.clientLanguages || []).join(", ") || "—",
    });
  }

  const beforeCountries = [...(before.deliveryCountryIso2s || [])].map((c) => c.toUpperCase()).sort();
  const afterCountries = [...(after.deliveryCountryIso2s || [])].map((c) => c.toUpperCase()).sort();
  if (beforeCountries.join(",") !== afterCountries.join(",")) {
    changes.push({
      field: "deliveryCountryIso2s",
      from: fmtList(beforeCountries) || "—",
      to: fmtList(afterCountries) || "—",
    });
  }

  const beforeLocs = [...(before.deliveryLocationIds || [])].sort();
  const afterLocs = [...(after.deliveryLocationIds || [])].sort();
  if (beforeLocs.join(",") !== afterLocs.join(",")) {
    const fmtLocs = (ids: string[]) =>
      ids
        .map((id) => {
          const place = findSearchPlace(id);
          if (place?.label) return place.label;
          // UUID delivery-location ids stay opaque here; admin UI resolves labels from catalog.
          return id;
        })
        .filter(Boolean)
        .join(", ");
    changes.push({
      field: "deliveryLocationIds",
      from: fmtLocs(beforeLocs) || "—",
      to: fmtLocs(afterLocs) || "—",
    });
  }

  if (!sameJson(before.workingDays, after.workingDays)) {
    changes.push({ field: "workingDays", from: "(previous)", to: "(updated)" });
  }
  if (!sameJson(before.publicHolidays, after.publicHolidays)) {
    changes.push({
      field: "publicHolidays",
      from: (before.publicHolidays || []).join(", ") || "—",
      to: (after.publicHolidays || []).join(", ") || "—",
    });
  }
  if (!sameJson(before.rentPaymentMethods, after.rentPaymentMethods)) {
    changes.push({
      field: "rentPaymentMethods",
      from: (before.rentPaymentMethods || []).join(", ") || "—",
      to: (after.rentPaymentMethods || []).join(", ") || "—",
    });
  }
  if (!sameJson(before.depositMethods, after.depositMethods)) {
    changes.push({
      field: "depositMethods",
      from: (before.depositMethods || []).join(", ") || "—",
      to: (after.depositMethods || []).join(", ") || "—",
    });
  }
  if (!sameJson(before.tariffs, after.tariffs)) {
    changes.push({ field: "tariffs", from: "(previous)", to: "(updated)" });
  }
  if (!sameJson(before.seasonalPricing, after.seasonalPricing)) {
    changes.push({ field: "seasonalPricing", from: "(previous)", to: "(updated)" });
  }
  if (!sameJson(before.primaryMessengers, after.primaryMessengers)) {
    changes.push({
      field: "primaryMessengers",
      from: (before.primaryMessengers || []).join(", ") || "—",
      to: (after.primaryMessengers || []).join(", ") || "—",
    });
  }
  if (!sameJson(before.secondaryMessengers, after.secondaryMessengers)) {
    changes.push({
      field: "secondaryMessengers",
      from: (before.secondaryMessengers || []).join(", ") || "—",
      to: (after.secondaryMessengers || []).join(", ") || "—",
    });
  }

  return changes;
}

export function appendPendingChange(
  moderation: PartnerProfileModeration,
  changes: ProfileFieldChange[],
): PartnerProfileModeration {
  if (!changes.length) return moderation;
  const summary =
    changes.length === 1
      ? `Changed ${changes[0].field}`
      : `Changed ${changes.length} fields (${changes
          .slice(0, 4)
          .map((c) => c.field)
          .join(", ")}${changes.length > 4 ? "…" : ""})`;
  const entry: PendingProfileChange = {
    id: newId(),
    at: new Date().toISOString(),
    summary,
    changes,
  };
  const pendingChanges = [entry, ...moderation.pendingChanges].slice(0, 40);
  return {
    ...moderation,
    pendingChanges,
    unreadCount: (moderation.unreadCount || 0) + 1,
  };
}

export function clearPendingChanges(
  moderation: PartnerProfileModeration,
  opts?: { adminNote?: string | null },
): PartnerProfileModeration {
  const note =
    opts && "adminNote" in opts
      ? String(opts.adminNote || "").trim() || null
      : null;
  return {
    ...moderation,
    pendingChanges: [],
    unreadCount: 0,
    publishedSettings: null,
    lastAdminNote: note,
    lastAdminNoteAt: note ? new Date().toISOString() : null,
  };
}

/** Keep the live public snapshot when entering remodeation (once per cycle). */
export function ensurePublishedSnapshot(
  moderation: PartnerProfileModeration,
  liveSettings: PartnerCompanySettings,
): PartnerProfileModeration {
  if (moderation.publishedSettings) return moderation;
  return {
    ...moderation,
    publishedSettings: parseCompanySettings(liveSettings),
  };
}

export function publicCompanySettings(
  draft: PartnerCompanySettings,
  moderation: PartnerProfileModeration,
  partnerStatus: string,
): PartnerCompanySettings {
  if (
    (partnerStatus === "PENDING_REMODERATION" || moderation.pendingChanges.length > 0) &&
    moderation.publishedSettings
  ) {
    return moderation.publishedSettings;
  }
  return draft;
}

export function unlockCountriesFor(
  moderation: PartnerProfileModeration,
  durationMinutes: number,
  now = new Date(),
): PartnerProfileModeration {
  const ms = Math.max(1, durationMinutes) * 60 * 1000;
  return {
    ...moderation,
    countriesEditUnlockUntil: new Date(now.getTime() + ms).toISOString(),
  };
}

export function countriesListsEqual(a: unknown, b: unknown) {
  const left = parseIso2List(a).map((c) => c.toUpperCase()).sort().join(",");
  const right = parseIso2List(b).map((c) => c.toUpperCase()).sort().join(",");
  return left === right;
}
