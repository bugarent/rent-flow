export const FLEET_AGE_RANGES = [
  { value: "AGE_0_5", label: "0–5 years" },
  { value: "AGE_6_9", label: "6–9 years" },
  { value: "AGE_10_PLUS", label: "10+ years" },
] as const;

export type FleetAgeRangeValue = (typeof FLEET_AGE_RANGES)[number]["value"];

const LEGACY_FLEET_AGE_LABELS: Record<string, string> = {
  AGE_0_2: "0–2 years",
  AGE_3_5: "3–5 years",
  AGE_6_8: "6–8 years",
  AGE_9_12: "9–12 years",
  AGE_13_PLUS: "13+ years",
};

export const PARTNER_INVITE_TTL_DAYS = 14;

export function fleetAgeLabel(value: string) {
  return (
    FLEET_AGE_RANGES.find((item) => item.value === value)?.label ??
    LEGACY_FLEET_AGE_LABELS[value] ??
    value
  );
}

export { formatPartnerCode, PORTAL_ID_START, PARTNER_CODE_PREFIX } from "@/lib/ids";

export const PARTNER_SOCIAL_PLATFORMS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "VIBER", label: "Viber" },
  { value: "TELEGRAM", label: "Telegram" },
] as const;

export type PartnerSocialPlatform = (typeof PARTNER_SOCIAL_PLATFORMS)[number]["value"];

export function parsePartnerMessengers(
  value: unknown,
  fallback?: string | null,
): PartnerSocialPlatform[] {
  const allowed = new Set(PARTNER_SOCIAL_PLATFORMS.map((p) => p.value));
  const fromArray = (items: unknown[]) =>
    [...new Set(items.map((item) => String(item).toUpperCase()))].filter(
      (item): item is PartnerSocialPlatform => allowed.has(item as PartnerSocialPlatform),
    );

  if (Array.isArray(value)) return fromArray(value);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return fromArray(parsed);
    } catch {
      if (allowed.has(value.toUpperCase() as PartnerSocialPlatform)) {
        return [value.toUpperCase() as PartnerSocialPlatform];
      }
    }
  }
  if (fallback && allowed.has(fallback.toUpperCase() as PartnerSocialPlatform)) {
    return [fallback.toUpperCase() as PartnerSocialPlatform];
  }
  return [];
}

export function parseIso2List(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim().toUpperCase()).filter((item) => item.length === 2))];
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return parseIso2List(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function partnerDisplayName(partner: {
  kind: string;
  companyName: string;
  contactName: string;
  user?: { firstName?: string; lastName?: string } | null;
}) {
  if (partner.kind === "PRIVATE") {
    const fromUser = [partner.user?.firstName, partner.user?.lastName].filter(Boolean).join(" ").trim();
    return fromUser || partner.contactName || partner.companyName;
  }
  return partner.companyName || partner.contactName;
}

/** Min 6 characters with uppercase, lowercase, and a number. */
export function isStrongPartnerPassword(password: string) {
  if (password.length < 6) return false;
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function partnerStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Application pending";
    case "INVITED":
      return "Invite sent";
    case "PENDING_FINAL":
      return "Final review";
    case "NEEDS_CORRECTION":
      return "Needs correction";
    case "PENDING_REMODERATION":
      return "Remoderation required";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status;
  }
}

const PARTNER_STATUS_KA: Record<string, string> = {
  PENDING: "განაცხადი მოლოდინშია",
  INVITED: "მოწვევა გაგზავნილია",
  PENDING_FINAL: "საბოლოო განხილვა",
  NEEDS_CORRECTION: "საჭიროებს კორექტირებას",
  PENDING_REMODERATION: "საჭიროებს რემოდერაციას",
  APPROVED: "დამტკიცებული",
  REJECTED: "უარყოფილი",
  SUSPENDED: "შეჩერებული",
};

const PARTNER_STATUS_RU: Record<string, string> = {
  PENDING: "Заявка на рассмотрении",
  INVITED: "Приглашение отправлено",
  PENDING_FINAL: "Финальная проверка",
  NEEDS_CORRECTION: "Нужна правка",
  PENDING_REMODERATION: "Нужна повторная модерация",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  SUSPENDED: "Приостановлен",
};

/** Status chip text in the admin language. Unknown codes stay as stored. */
export function localizedPartnerStatus(locale: string, status: string) {
  const code = String(status || "").trim();
  if (locale === "ka") return PARTNER_STATUS_KA[code] || partnerStatusLabel(code);
  if (locale === "ru") return PARTNER_STATUS_RU[code] || partnerStatusLabel(code);
  return partnerStatusLabel(code);
}
