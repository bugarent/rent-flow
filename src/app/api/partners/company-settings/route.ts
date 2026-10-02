import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { parseCompanySettings, type PartnerCompanySettings } from "@/lib/partners/company-settings";
import { writePartnerSeasonalPricingFile } from "@/lib/server/partner-seasonal-pricing-store";
import {
  resolveCompanySettings,
  writeCompanySettingsFile,
  readCompanySettingsFile,
} from "@/lib/server/partner-company-settings-store";
import { airportsForCountries } from "@/lib/catalog/operating-regions";
import { setPartnerAirports } from "@/lib/server/partner-airports";
import { parseIso2List } from "@/lib/partner";
import {
  appendPendingChange,
  applyExemptSettingsToPublished,
  canEditDeliveryCountries,
  countriesListsEqual,
  diffCompanySettings,
  emptyProfileModeration,
  ensurePublishedSnapshot,
  filterRemoderationChanges,
  type PartnerProfileModeration,
} from "@/lib/partners/profile-moderation";
import {
  resolveProfileModeration,
  writeProfileModerationFile,
} from "@/lib/server/partner-profile-moderation-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";

type PartnerLite = {
  id: string;
  status: string;
  approvedAt?: Date | null;
  companyName: string;
  email: string;
  phone: string;
  secondaryPhone?: string | null;
  messenger?: string;
  unreadReapplyCount?: number;
  companySettings?: unknown;
  operatingCountryIso2s?: unknown;
  profileModeration?: unknown;
};

function countriesLockMeta(partner: { status: string; approvedAt?: Date | null }, moderation: PartnerProfileModeration) {
  const unlocked = canEditDeliveryCountries({
    status: partner.status,
    approvedAt: partner.approvedAt,
    moderation,
  });
  return {
    countriesEditable: unlocked,
    countriesEditUnlockUntil: moderation.countriesEditUnlockUntil,
    countriesLocked: !unlocked,
    partnerStatus: partner.status,
    pendingRemoderation:
      partner.status === "PENDING_REMODERATION" || moderation.pendingChanges.length > 0,
    pendingChanges: moderation.pendingChanges.slice(0, 10),
    lastAdminNote: moderation.lastAdminNote,
    lastAdminNoteAt: moderation.lastAdminNoteAt,
  };
}

async function resolvePartnerForSession(userId: string, email?: string | null): Promise<PartnerLite | null> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner) return partner as PartnerLite;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  // Offline / local partner session — use stable file-store id
  const local = loadLocalPartner();
  const id =
    userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)
      ? LOCAL_PARTNER_ID
      : userId;

  const fromFile = await readCompanySettingsFile(id);
  let moderation = emptyProfileModeration();
  try {
    moderation = await resolveProfileModeration({ id, profileModeration: undefined });
  } catch {
    /* empty */
  }
  const pending = moderation.pendingChanges.length > 0;
  return {
    id,
    status: pending ? "PENDING_REMODERATION" : "APPROVED",
    approvedAt: new Date(),
    companyName: fromFile?.title || fromFile?.legalName || local?.companyName || "Partner",
    email: email || local?.email || "",
    phone: fromFile?.primaryPhone || "",
    secondaryPhone: fromFile?.secondaryPhone || null,
    messenger: fromFile?.primaryMessengers?.[0] || "WHATSAPP",
    unreadReapplyCount: moderation.unreadCount || 0,
    companySettings: fromFile ?? undefined,
    operatingCountryIso2s: fromFile?.deliveryCountryIso2s ?? ["GE"],
    profileModeration: moderation,
  };
}

export async function GET() {
  const session = await requirePartnerApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const partner = await resolvePartnerForSession(session.user.id, session.user.email);
    if (!partner) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    const settings = await resolveCompanySettings(partner);
    const moderation = await resolveProfileModeration(partner as { id: string; profileModeration?: unknown });
    return NextResponse.json({
      settings,
      moderation: countriesLockMeta(partner, moderation),
    });
  } catch (error) {
    console.error("[partners/company-settings GET]", error);
    return NextResponse.json({ error: "Could not load settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requirePartnerApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const partner = await resolvePartnerForSession(session.user.id, session.user.email);
    if (!partner) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

    const previous = await resolveCompanySettings(partner);
    let moderation = await resolveProfileModeration(partner as { id: string; profileModeration?: unknown });

    const settings = parseCompanySettings(body?.settings ?? body, {
      companyName: partner.companyName,
      email: partner.email,
      phone: partner.phone,
      secondaryPhone: partner.secondaryPhone,
      deliveryCountryIso2s: parseIso2List(partner.operatingCountryIso2s),
      primaryMessengers: previous.primaryMessengers,
      secondaryMessengers: previous.secondaryMessengers,
    });

    const countryIso2s = settings.deliveryCountryIso2s.length
      ? settings.deliveryCountryIso2s
      : parseIso2List(partner.operatingCountryIso2s);

    const { resolvePartnerDeliveryLocationIds } = await import("@/lib/server/delivery-locations");
    const resolvedLocationIds = await resolvePartnerDeliveryLocationIds(
      settings.deliveryLocationIds || [],
    );

    const nextSettings: PartnerCompanySettings = {
      ...settings,
      deliveryCountryIso2s: countryIso2s,
      deliveryLocationIds: resolvedLocationIds,
    };
    const countriesChanged = !countriesListsEqual(previous.deliveryCountryIso2s, countryIso2s);
    if (!(nextSettings.primaryMessengers?.length > 0) || !(nextSettings.secondaryMessengers?.length > 0)) {
      return NextResponse.json(
        { error: "Select at least one messenger for each phone number" },
        { status: 400 },
      );
    }
    const allMessengers = [
      ...new Set([...(nextSettings.primaryMessengers || []), ...(nextSettings.secondaryMessengers || [])]),
    ];
    const locationsChanged =
      [...(previous.deliveryLocationIds || [])].sort().join(",") !==
      [...(nextSettings.deliveryLocationIds || [])].sort().join(",");

    // Lock check retained for API compat; canEditDeliveryCountries always allows edits now.
    const editableCountries = canEditDeliveryCountries({
      status: partner.status,
      approvedAt: partner.approvedAt,
      moderation,
    });
    if ((countriesChanged || locationsChanged) && !editableCountries) {
      return NextResponse.json(
        {
          error:
            "Delivery countries are locked. Contact admin to unlock this field for a limited time.",
          moderation: countriesLockMeta(partner, moderation),
        },
        { status: 403 },
      );
    }

    // Partners may request any country/location; admin remodeation gates the approved set.
    // (assertAllowedOperating* intentionally not applied on self-service profile save.)

    const allFieldChanges = diffCompanySettings(previous, nextSettings);
    const fieldChanges = filterRemoderationChanges(allFieldChanges);

    const trackForAdmin = fieldChanges.length > 0;
    const needsRemoderation =
      trackForAdmin &&
      (partner.status === "APPROVED" || partner.status === "PENDING_REMODERATION");

    if (trackForAdmin) {
      moderation = appendPendingChange(moderation, fieldChanges);
    }
    if (needsRemoderation) {
      moderation = ensurePublishedSnapshot(moderation, previous);
    }
    // Work days / payment / currency apply live even while other profile fields await remodeation.
    if (moderation.publishedSettings) {
      moderation = {
        ...moderation,
        publishedSettings: applyExemptSettingsToPublished(
          moderation.publishedSettings,
          nextSettings,
        ),
      };
    }

    const oldPassword = String(body?.oldPassword || "").trim();
    const newPassword = String(body?.newPassword || "").trim();
    const confirmPassword = String(body?.confirmPassword || "").trim();
    let passwordChanged = false;
    if (newPassword || confirmPassword) {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
      }
      const { verifySecret, hashSecret, normalizeLogin } = await import("@/lib/crypto");
      const { rememberPartnerPortalPassword } = await import("@/lib/server/partner-credentials-store");
      const local = loadLocalPartner();
      let currentHash = "";
      if (partner.id === LOCAL_PARTNER_ID || session.user.id === LOCAL_PARTNER_ID || local?.id === partner.id) {
        currentHash = local?.passwordHash || "";
      }
      if (!currentHash) {
        try {
          const user = await prisma.user.findUnique({ where: { id: session.user.id } });
          currentHash = user?.passwordHash || "";
        } catch {
          /* offline */
        }
      }
      if (!currentHash || !verifySecret(oldPassword, currentHash)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      const nextHash = hashSecret(newPassword);
      if (partner.id === LOCAL_PARTNER_ID || session.user.id === LOCAL_PARTNER_ID || local?.id === partner.id) {
        const { saveLocalPartner } = await import("@/lib/auth/local-partner-store");
        saveLocalPartner({ passwordHash: nextHash });
      }
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { passwordHash: nextHash },
        });
      } catch {
        /* offline / no user row */
      }
      const loginEmail = normalizeLogin(nextSettings.email || partner.email || session.user.email || "");
      await rememberPartnerPortalPassword(partner.id, loginEmail, newPassword);
      if (partner.id !== LOCAL_PARTNER_ID) {
        await rememberPartnerPortalPassword(LOCAL_PARTNER_ID, loginEmail, newPassword);
      }
      passwordChanged = true;
    }

    const nextStatus = needsRemoderation ? "PENDING_REMODERATION" : partner.status;
    const hasPendingRemoderation =
      needsRemoderation ||
      moderation.pendingChanges.length > 0 ||
      partner.status === "PENDING_REMODERATION";
    const publicSettings =
      hasPendingRemoderation && moderation.publishedSettings
        ? moderation.publishedSettings
        : nextSettings;

    let dbSaved = false;
    try {
      const updateData: Record<string, unknown> = {
        companySettings: nextSettings,
        seasonalPricing: nextSettings.seasonalPricing,
        companyName: publicSettings.title || publicSettings.legalName || partner.companyName,
        phone: publicSettings.primaryPhone || partner.phone,
        secondaryPhone: publicSettings.secondaryPhone || null,
        email: publicSettings.email || partner.email,
        logoUrl: publicSettings.logoUrl || null,
        messengers: allMessengers,
        messenger: (allMessengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM" | undefined) || "WHATSAPP",
        operatingCountryIso2s: countryIso2s,
        status: nextStatus,
        profileModeration: moderation,
      };
      if (trackForAdmin) {
        updateData.unreadReapplyCount = Math.max(
          partner.unreadReapplyCount || 0,
          moderation.unreadCount,
        );
      }
      await prisma.partner.update({
        where: { id: partner.id },
        data: updateData as never,
      });
      dbSaved = true;

      let airportIatas: string[] = [];
      try {
        const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
        const all = await listDeliveryLocations({ activeOnly: false });
        const selected = new Set(nextSettings.deliveryLocationIds || []);
        const selectedCodes = new Set(
          [...selected].map((id) => String(id).toUpperCase()),
        );
        airportIatas = all
          .filter(
            (loc) =>
              loc.kind !== "city" &&
              (selected.has(loc.id) ||
                selectedCodes.has(loc.iata.toUpperCase()) ||
                selectedCodes.has(String(loc.airportId || "").toUpperCase())),
          )
          .map((loc) => loc.iata.toUpperCase())
          .filter(Boolean);
      } catch {
        /* fall back below */
      }
      if (!airportIatas.length && (nextSettings.deliveryLocationIds || []).length) {
        // Resolve codes that may not yet be in the delivery catalog list
        for (const raw of nextSettings.deliveryLocationIds || []) {
          const code = String(raw).toUpperCase();
          if (code && !code.startsWith("CITY:") && code.length <= 4) {
            airportIatas.push(code);
          }
        }
        airportIatas = [...new Set(airportIatas)];
      }
      if (!airportIatas.length && !(nextSettings.deliveryLocationIds || []).length) {
        airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
      }
      if (airportIatas.length) {
        try {
          await setPartnerAirports(partner.id, airportIatas);
        } catch {
          /* optional while offline */
        }
      }
    } catch (dbError) {
      console.warn("[partners/company-settings] DB update failed, file store only", dbError);
    }

    try {
      await writeCompanySettingsFile(partner.id, nextSettings);
      await writePartnerSeasonalPricingFile(partner.id, nextSettings.seasonalPricing);
      await writeProfileModerationFile(partner.id, moderation);
      if (partner.id === LOCAL_PARTNER_ID || session.user.id === LOCAL_PARTNER_ID) {
        const { saveLocalPartner } = await import("@/lib/auth/local-partner-store");
        const { normalizeLogin } = await import("@/lib/crypto");
        saveLocalPartner({
          email: nextSettings.email ? normalizeLogin(nextSettings.email) : undefined,
          companyName: nextSettings.title || nextSettings.legalName || undefined,
        });
      }
    } catch (fileError) {
      console.error("[partners/company-settings] file store failed", fileError);
      if (!dbSaved) {
        return NextResponse.json(
          { error: "Failed to save settings", detail: fileError instanceof Error ? fileError.message : String(fileError) },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      settings: nextSettings,
      moderation: countriesLockMeta({ ...partner, status: nextStatus }, moderation),
      remoderation: needsRemoderation || trackForAdmin,
      offline: !dbSaved,
      passwordChanged,
      message: passwordChanged
        ? "Password updated"
        : needsRemoderation
          ? "Saved. Changes await remodeation — the public site keeps your previous version until admin approves."
          : trackForAdmin
            ? "Saved. Changes were sent to admin for review."
            : "Saved",
    });
  } catch (error) {
    console.error("[partners/company-settings PATCH]", error);
    return NextResponse.json(
      {
        error: "Failed to save settings",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
