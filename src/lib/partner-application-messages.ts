function newMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const PARTNER_REAPPLY_WINDOW_DAYS = 30;

export type PartnerApplicationMessageKind = "INITIAL" | "REAPPLY";

export type PartnerApplicationMessageSnapshot = {
  firstName: string;
  lastName: string;
  kind: "COMPANY" | "PRIVATE";
  identificationNumber: string;
  email: string;
  phone: string;
  phoneCountryIso2: string;
  messengers: string[];
  fleetSize: number;
  fleetAgeRange: string;
  countryIso2s: string[];
  /** Airport IATA codes and city pickup codes the applicant asked for. */
  locationCodes: string[];
};

export type PartnerApplicationMessage = {
  id: string;
  kind: PartnerApplicationMessageKind;
  createdAt: string;
  readByAdmin: boolean;
  snapshot: PartnerApplicationMessageSnapshot;
};

export function parsePartnerApplicationMessages(raw: unknown): PartnerApplicationMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const snapshot = (row.snapshot && typeof row.snapshot === "object"
        ? row.snapshot
        : {}) as Record<string, unknown>;
      return {
        id: String(row.id || newMessageId()),
        kind: row.kind === "REAPPLY" ? ("REAPPLY" as const) : ("INITIAL" as const),
        createdAt: String(row.createdAt || new Date().toISOString()),
        readByAdmin: Boolean(row.readByAdmin),
        snapshot: {
          firstName: String(snapshot.firstName || ""),
          lastName: String(snapshot.lastName || ""),
          kind: snapshot.kind === "PRIVATE" ? ("PRIVATE" as const) : ("COMPANY" as const),
          identificationNumber: String(snapshot.identificationNumber || ""),
          email: String(snapshot.email || ""),
          phone: String(snapshot.phone || ""),
          phoneCountryIso2: String(snapshot.phoneCountryIso2 || "GE"),
          messengers: Array.isArray(snapshot.messengers)
            ? snapshot.messengers.map(String)
            : [],
          fleetSize: Number(snapshot.fleetSize) || 1,
          fleetAgeRange: String(snapshot.fleetAgeRange || "AGE_0_5"),
          countryIso2s: Array.isArray(snapshot.countryIso2s)
            ? snapshot.countryIso2s.map(String)
            : [],
          locationCodes: Array.isArray(snapshot.locationCodes)
            ? snapshot.locationCodes.map(String)
            : [],
        },
      };
    })
    .filter((m): m is PartnerApplicationMessage => Boolean(m));
}

export function buildPartnerApplicationMessage(
  kind: PartnerApplicationMessageKind,
  snapshot: PartnerApplicationMessageSnapshot,
  readByAdmin = false,
): PartnerApplicationMessage {
  return {
    id: newMessageId(),
    kind,
    createdAt: new Date().toISOString(),
    readByAdmin,
    snapshot,
  };
}

export function partnerReapplyWindowStart(now = new Date()) {
  return new Date(now.getTime() - PARTNER_REAPPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
