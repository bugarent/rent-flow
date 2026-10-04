import { prisma, reopenDbCircuit } from "@/lib/prisma";
import { partnerDisplayName, partnerStatusLabel, formatPartnerCode, parseIso2List } from "@/lib/partner";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { dbOfflineMessage, isDbOfflineError, shortPrismaError } from "@/lib/server/db-errors";
import { listFilePartnerApplications } from "@/lib/server/partner-applications-store";

export type AdminPartnerRow = {
  id: string;
  displayName: string;
  kind: "COMPANY" | "PRIVATE";
  status: string;
  statusLabel: string;
  sequentialNumber: number | null;
  partnerCode: string | null;
  personalId: string;
  fleetSize: number;
  carCount: number;
  email: string;
  phone: string;
  country: string;
  hasUser: boolean;
  unreadReapplyCount: number;
  unreadForAdmin: number;
  updatedAt: string;
  source?: "db" | "file";
};

export const PRIMARY_PARTNER_STATUSES = new Set([
  "PENDING",
  "INVITED",
  "PENDING_FINAL",
  "NEEDS_CORRECTION",
]);

export const PENDING_PARTNER_STATUSES = new Set([
  ...PRIMARY_PARTNER_STATUSES,
  "PENDING_REMODERATION",
]);

export const ACTIVE_PARTNER_STATUSES = new Set(["APPROVED", "SUSPENDED"]);

function countryNames(iso2s: unknown): string {
  const names = parseIso2List(iso2s)
    .map((iso2) => worldCountryName(iso2))
    .filter(Boolean);
  return [...new Set(names)].join(", ") || "—";
}

function needsAdminAction(status: string) {
  return (
    status === "PENDING" ||
    status === "PENDING_FINAL" ||
    status === "NEEDS_CORRECTION" ||
    status === "PENDING_REMODERATION"
  );
}

/** Full partner list for admin (DB + local applications + pending profile files). */
export async function loadAdminPartnerRows(): Promise<{
  partners: AdminPartnerRow[];
  dbOffline: boolean;
  queryError: string;
}> {
  let initialPartners: AdminPartnerRow[] = [];
  let dbOffline = false;
  let queryError = "";

  reopenDbCircuit();
  try {
    const partners = await prisma.partner.findMany({
      include: {
        user: true,
        _count: {
          select: {
            cars: true,
            locations: true,
            reviews: true,
          },
        },
      },
      orderBy: [{ sequentialNumber: "asc" }, { createdAt: "desc" }],
    });

    initialPartners = partners.map((p) => {
      const unreadReapply = (p as { unreadReapplyCount?: number }).unreadReapplyCount ?? 0;
      const unreadForAdmin = needsAdminAction(p.status)
        ? Math.max(1, unreadReapply)
        : unreadReapply;
      return {
        id: p.id,
        displayName: partnerDisplayName(p),
        kind: p.kind as "COMPANY" | "PRIVATE",
        status: p.status,
        statusLabel: partnerStatusLabel(p.status),
        sequentialNumber: p.sequentialNumber,
        partnerCode: formatPartnerCode(p.sequentialNumber),
        personalId: p.personalId || "",
        fleetSize: p.fleetSize,
        carCount: p._count.cars,
        email: p.email,
        phone: p.phone,
        country: countryNames(p.operatingCountryIso2s),
        hasUser: Boolean(p.userId),
        unreadReapplyCount: unreadReapply,
        unreadForAdmin,
        updatedAt: p.updatedAt.toISOString(),
        source: "db" as const,
      };
    });
  } catch (error) {
    console.error("[admin/partners]", error);
    dbOffline = isDbOfflineError(error);
    queryError = dbOffline ? dbOfflineMessage("Partner") : shortPrismaError(error);
  }

  try {
    const filePartners = await listFilePartnerApplications();
    const mapped: AdminPartnerRow[] = filePartners.map((p) => {
      const unreadReapply = p.unreadReapplyCount || 0;
      const unreadForAdmin = needsAdminAction(p.status)
        ? Math.max(1, p.unreadForAdmin || unreadReapply)
        : p.unreadForAdmin || unreadReapply;
      return {
        id: p.id,
        displayName: p.companyName || p.contactName,
        kind: p.kind,
        status: p.status,
        statusLabel: partnerStatusLabel(p.status),
        sequentialNumber: p.sequentialNumber,
        partnerCode: p.sequentialNumber ? formatPartnerCode(p.sequentialNumber) : null,
        personalId: p.personalId || "",
        fleetSize: p.fleetSize,
        carCount: 0,
        email: p.email,
        phone: p.phone,
        country: countryNames(p.operatingCountryIso2s),
        hasUser: false,
        unreadReapplyCount: unreadReapply,
        unreadForAdmin,
        updatedAt: p.updatedAt,
        source: "file" as const,
      };
    });
    if (dbOffline || initialPartners.length === 0) {
      initialPartners = mapped;
      if (mapped.length && dbOffline) {
        queryError =
          "Database offline — showing partner applications saved locally (.data/partner-applications.json).";
      }
    } else {
      const ids = new Set(initialPartners.map((p) => p.id));
      initialPartners = [...initialPartners, ...mapped.filter((p) => !ids.has(p.id))];
    }
  } catch (fileError) {
    console.warn("[admin/partners] file store", fileError);
  }

  try {
    const { listAllProfileModerationFiles } = await import(
      "@/lib/server/partner-profile-moderation-store"
    );
    const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
    const { loadLocalPartner } = await import("@/lib/auth/local-partner-store");
    const local = loadLocalPartner();
    const pendingProfiles = await listAllProfileModerationFiles();
    const ids = new Set(initialPartners.map((p) => p.id));
    for (const row of pendingProfiles) {
      if (!row.moderation.pendingChanges.length) continue;
      if (ids.has(row.partnerId)) {
        initialPartners = initialPartners.map((p) =>
          p.id === row.partnerId
            ? {
                ...p,
                status: p.status === "APPROVED" ? "PENDING_REMODERATION" : p.status,
                unreadReapplyCount: Math.max(p.unreadReapplyCount, row.moderation.unreadCount),
                unreadForAdmin: Math.max(p.unreadForAdmin, row.moderation.unreadCount || 1),
                updatedAt: row.moderation.pendingChanges[0]?.at || p.updatedAt,
              }
            : p,
        );
        continue;
      }
      const settings = await readCompanySettingsFile(row.partnerId);
      const email = settings?.email || local?.email || "";
      const { ensureFilePartnerSequentialNumber } = await import(
        "@/lib/server/ensure-file-partner-code"
      );
      const sequentialNumber = await ensureFilePartnerSequentialNumber({
        partnerId: row.partnerId,
        email,
      });
      initialPartners.push({
        id: row.partnerId,
        displayName:
          settings?.title ||
          settings?.legalName ||
          (row.partnerId === local?.id ? local.companyName : row.partnerId),
        kind: "COMPANY",
        status: "PENDING_REMODERATION",
        statusLabel: partnerStatusLabel("PENDING_REMODERATION"),
        sequentialNumber,
        partnerCode: formatPartnerCode(sequentialNumber),
        personalId: "",
        fleetSize: 0,
        carCount: 0,
        email,
        phone: settings?.primaryPhone || "",
        country: countryNames(settings?.deliveryCountryIso2s),
        hasUser: false,
        unreadReapplyCount: row.moderation.unreadCount || 1,
        unreadForAdmin: Math.max(1, row.moderation.unreadCount || 1),
        updatedAt: row.moderation.pendingChanges[0]?.at || new Date().toISOString(),
        source: "file",
      });
      ids.add(row.partnerId);
    }
  } catch (profileError) {
    console.warn("[admin/partners] profile moderation files", profileError);
  }

  return { partners: initialPartners, dbOffline, queryError };
}

export function filterDirectoryPartners(partners: AdminPartnerRow[]) {
  return partners.filter(
    (p) =>
      ACTIVE_PARTNER_STATUSES.has(p.status) ||
      p.status === "REJECTED" ||
      PRIMARY_PARTNER_STATUSES.has(p.status) ||
      p.status === "PENDING_REMODERATION",
  );
}

export function filterQueuePartners(partners: AdminPartnerRow[]) {
  return partners.filter((p) => PENDING_PARTNER_STATUSES.has(p.status));
}
