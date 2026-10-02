import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { nextPartnerSequentialNumber, formatPartnerCode, PORTAL_ID_START } from "@/lib/sequential-ids";
import { fleetAgeLabel, partnerDisplayName, PARTNER_INVITE_TTL_DAYS, parsePartnerMessengers, parseIso2List } from "@/lib/partner";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { displayInternationalPhone } from "@/lib/catalog/dial-codes";
import {
  buildPartnerInviteUrl,
  sendPartnerFeedbackEmail,
  sendPartnerInviteEmail,
} from "@/lib/mail";
import {
  parsePartnerApplicationMessages,
  type PartnerApplicationMessage,
} from "@/lib/partner-application-messages";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  getFilePartnerById,
  markFilePartnerRead,
  updateFilePartnerStatus,
} from "@/lib/server/partner-applications-store";
import {
  clearPendingChanges,
  unlockCountriesFor,
} from "@/lib/partners/profile-moderation";
import {
  resolveProfileModeration,
  writeProfileModerationFile,
  readProfileModerationFile,
} from "@/lib/server/partner-profile-moderation-store";
import {
  readCompanySettingsFile,
  resolveCompanySettings,
  writeCompanySettingsFile,
} from "@/lib/server/partner-company-settings-store";
import { parseCompanySettings } from "@/lib/partners/company-settings";
import { loadLocalPartner, LOCAL_PARTNER_ID, saveLocalPartner } from "@/lib/auth/local-partner-store";
import { activatePartnerFromStoredPassword } from "@/lib/server/activate-partner-login";
import {
  getPartnerCredentials,
  setPartnerCredentials,
} from "@/lib/server/partner-credentials-store";
import { hashSecret } from "@/lib/crypto";
import { mergeFileCarsIntoPartnerRows } from "@/lib/server/partner-cars-store";
import { bodyTypeFromCarDescription, countriesFromCarDescription } from "@/lib/cars/listing-meta";

async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

async function localSettingsPartnerDetail(id: string, markRead: boolean) {
  const settings = await readCompanySettingsFile(id);
  let moderation = await readProfileModerationFile(id);
  if (!settings && !moderation.pendingChanges.length) return null;

  if (markRead && moderation.unreadCount > 0) {
    moderation = { ...moderation, unreadCount: 0 };
    await writeProfileModerationFile(id, moderation);
  }

  const local = loadLocalPartner();
  const companyName =
    settings?.title ||
    settings?.legalName ||
    (id === LOCAL_PARTNER_ID || id === local?.id ? local?.companyName : null) ||
    id;
  const email = settings?.email || local?.email || "";
  const { ensureFilePartnerSequentialNumber } = await import("@/lib/server/ensure-file-partner-code");
  const sequentialNumber = await ensureFilePartnerSequentialNumber({ partnerId: id, email });

  let cars: Array<{
    id: string;
    title: string;
    make: string;
    model: string;
    year: number;
    status: string;
    photoUrl: string | null;
    country: string;
    bodyType: string;
  }> = [];
  try {
    const where =
      email
        ? { OR: [{ partnerId: id }, { partner: { email } }] }
        : { partnerId: id };
    const rows = await prisma.car.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { photos: { take: 1, orderBy: { sortOrder: "asc" } } },
    });
    cars = rows.map((car) => ({
      id: car.id,
      title: car.title,
      make: car.make,
      model: car.model,
      year: car.year,
      status: car.status,
      photoUrl: car.photos[0]?.url ?? null,
      country: countriesFromCarDescription(car.description),
      bodyType: bodyTypeFromCarDescription(car.description),
    }));
  } catch {
    cars = [];
  }
  cars = await mergeFileCarsIntoPartnerRows(cars, {
    partnerId: id,
    userId: id,
    email: settings?.email || local?.email || email,
  });

  let credentials = await getPartnerCredentials(id);
  if (!credentials?.password && local) {
    const alt = await getPartnerCredentials(LOCAL_PARTNER_ID);
    if (alt?.password) {
      credentials = {
        email: credentials?.email || alt.email,
        password: alt.password,
        updatedAt: alt.updatedAt,
      };
    }
  }
  // Prefer portal auth email (local account), not a stale credentials default.
  const loginEmail =
    (id === LOCAL_PARTNER_ID || id === local?.id ? local?.email : "") ||
    credentials?.email ||
    settings?.email ||
    "";
  const portalPassword = credentials?.password || "";

  return {
    id,
    displayName: companyName,
    kind: "COMPANY" as const,
    status: moderation.pendingChanges.length ? "PENDING_REMODERATION" : "APPROVED",
    sequentialNumber,
    partnerCode: formatPartnerCode(sequentialNumber),
    companyName,
    contactName: companyName,
    personalId: "",
    representativeFirstName: null,
    representativeLastName: null,
    representativePersonalId: null,
    email: settings?.email || local?.email || "",
    phone: settings?.primaryPhone ? displayInternationalPhone(settings.primaryPhone) : "",
    secondaryPhone: settings?.secondaryPhone
      ? displayInternationalPhone(settings.secondaryPhone)
      : null,
    phoneCountryIso2: null,
    secondaryPhoneCountryIso2: null,
    messenger: settings?.primaryMessengers?.[0] || "WHATSAPP",
    messengers: [
      ...new Set([
        ...(settings?.primaryMessengers || []),
        ...(settings?.secondaryMessengers || []),
      ]),
    ],
    logoUrl: settings?.logoUrl || null,
    fleetSize: 0,
    fleetAgeLabel: "—",
    fleetAgeRange: null,
    phoneVerifiedAt: null,
    approvedAt: null,
    invitedAt: null,
    registrationSubmittedAt: null,
    rejectionNote: null,
    inviteToken: null,
    telegramChatId: null,
    telegramUsername: null,
    telegramVerifiedAt: null,
    unreadReapplyCount: moderation.unreadCount,
    unreadForAdmin: moderation.unreadCount,
    applicationMessages: [],
    countriesEditUnlockUntil: moderation.countriesEditUnlockUntil,
    pendingProfileChanges: moderation.pendingChanges,
    profileUnreadCount: moderation.unreadCount,
    user: null,
    cars,
    carCount: cars.length,
    activeCarCount: cars.filter((car) => car.status === "APPROVED").length,
    updatedAt: moderation.pendingChanges[0]?.at || new Date().toISOString(),
    createdAt: moderation.pendingChanges[0]?.at || new Date().toISOString(),
    countries: (settings?.deliveryCountryIso2s || []).map((iso2) => ({
      iso2,
      name: worldCountryName(iso2),
    })),
    source: "file" as const,
    companySettings: settings,
    loginEmail,
    portalPassword,
    hasUser: Boolean(local?.id),
  };
}

function filePartnerDetail(partner: NonNullable<Awaited<ReturnType<typeof getFilePartnerById>>>) {
  return {
    id: partner.id,
    displayName: partner.companyName || partner.contactName,
    kind: partner.kind,
    status: partner.status,
    sequentialNumber: partner.sequentialNumber,
    partnerCode: partner.sequentialNumber ? formatPartnerCode(partner.sequentialNumber) : null,
    companyName: partner.companyName,
    contactName: partner.contactName,
    personalId: partner.personalId,
    representativeFirstName: partner.representativeFirstName,
    representativeLastName: partner.representativeLastName,
    representativePersonalId: null,
    email: partner.email,
    phone: displayInternationalPhone(partner.phone),
    secondaryPhone: partner.secondaryPhone ? displayInternationalPhone(partner.secondaryPhone) : null,
    phoneCountryIso2: partner.phoneCountryIso2,
    secondaryPhoneCountryIso2: partner.secondaryPhoneCountryIso2,
    messenger: partner.messengers[0] || "WHATSAPP",
    messengers: partner.messengers,
    logoUrl: null,
      fleetSize: partner.fleetSize,
      fleetAgeLabel: fleetAgeLabel(partner.fleetAgeRange),
      fleetAgeRange: partner.fleetAgeRange,
      phoneVerifiedAt: null,
      approvedAt: null,
      invitedAt: null,
      registrationSubmittedAt: null,
      rejectionNote: partner.rejectionNote,
      inviteToken: null,
      telegramChatId: null,
      telegramUsername: null,
      telegramVerifiedAt: null,
      unreadReapplyCount: partner.unreadReapplyCount,
    unreadForAdmin: partner.unreadForAdmin,
    applicationMessages: partner.applicationMessages,
    user: null,
    cars: [],
    carCount: 0,
    activeCarCount: 0,
    updatedAt: partner.updatedAt,
    createdAt: partner.createdAt,
    countries: partner.operatingCountryIso2s.map((iso2) => ({
      iso2,
      name: worldCountryName(iso2),
    })),
    source: "file" as const,
  };
}

async function filePartnerDetailWithCars(
  file: NonNullable<Awaited<ReturnType<typeof getFilePartnerById>>>,
) {
  const credentials = await getPartnerCredentials(file.id);
  const detail = filePartnerDetail(file);
  const cars = await mergeFileCarsIntoPartnerRows([], {
    partnerId: file.id,
    email: file.email,
  });
  return {
    ...detail,
    cars,
    carCount: cars.length,
    activeCarCount: cars.filter((car) => car.status === "APPROVED").length,
    loginEmail: credentials?.email || file.email || "",
    portalPassword: credentials?.password || "",
    hasUser: false,
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const markRead = new URL(req.url).searchParams.get("markRead") !== "0";

  try {
    let partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      user: true,
      cars: { include: { photos: { take: 1 } } },
        locations: { include: { airport: { include: { city: { include: { country: true } } } } } },
      _count: { select: { cars: true } },
    },
  });

  if (!partner) {
      const file = markRead ? await markFilePartnerRead(id) : await getFilePartnerById(id);
      if (file) {
        return NextResponse.json(await filePartnerDetailWithCars(file));
      }
      const localDetail = await localSettingsPartnerDetail(id, markRead);
      if (localDetail) return NextResponse.json(localDetail);
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

    let messages: PartnerApplicationMessage[] = parsePartnerApplicationMessages(
      (partner as { applicationMessages?: unknown }).applicationMessages,
    );
    let unreadReapplyCount =
      (partner as { unreadReapplyCount?: number }).unreadReapplyCount ??
      messages.filter((m) => m.kind === "REAPPLY" && !m.readByAdmin).length;

    if (markRead && (unreadReapplyCount > 0 || partner.status === "PENDING" || partner.status === "PENDING_REMODERATION")) {
      messages = messages.map((m) => (m.kind === "REAPPLY" ? { ...m, readByAdmin: true } : m));
      unreadReapplyCount = 0;
      let moderation = await resolveProfileModeration(
        partner as { id: string; profileModeration?: unknown },
      );
      moderation = { ...moderation, unreadCount: 0 };
      try {
        partner = await prisma.partner.update({
          where: { id },
          data: {
            applicationMessages: messages,
            unreadReapplyCount: 0,
            profileModeration: moderation,
          },
          include: {
            user: true,
            cars: { include: { photos: { take: 1 } } },
            locations: { include: { airport: { include: { city: { include: { country: true } } } } } },
            _count: { select: { cars: true } },
          },
        });
        await writeProfileModerationFile(id, moderation);
      } catch (error) {
        console.warn("[admin/partners GET] mark read failed", error);
      }
    }

    const moderation = await resolveProfileModeration(
      partner as { id: string; profileModeration?: unknown },
    );
    const companySettings = await resolveCompanySettings(partner);
    const credentials = await getPartnerCredentials(partner.id);
    const cars = await mergeFileCarsIntoPartnerRows(
      partner.cars.map((car) => ({
        id: car.id,
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        status: car.status,
        photoUrl: car.photos?.[0]?.url ?? null,
        country: countriesFromCarDescription(car.description),
        bodyType: bodyTypeFromCarDescription(car.description),
      })),
      { partnerId: partner.id, userId: partner.userId || partner.user?.id, email: partner.email },
    );

    let banWarning: string | null = null;
    let banRecord: unknown = null;
    try {
      const { findPartnerBanMatches, formatPartnerBanWarning } = await import(
        "@/lib/server/partner-bans-store"
      );
      const bans = await findPartnerBanMatches({
        email: partner.email,
        phone: partner.phone,
      });
      if (bans[0]) {
        banRecord = bans[0];
        banWarning = formatPartnerBanWarning(bans[0]);
      }
    } catch {
      /* optional */
    }

  return NextResponse.json({
    id: partner.id,
    displayName: partnerDisplayName(partner),
    kind: partner.kind,
    status: partner.status,
    sequentialNumber: partner.sequentialNumber,
      partnerCode: formatPartnerCode(partner.sequentialNumber),
    companyName: partner.companyName,
    contactName: partner.contactName,
    personalId: partner.personalId,
    representativeFirstName: partner.representativeFirstName,
    representativeLastName: partner.representativeLastName,
    representativePersonalId: partner.representativePersonalId,
    email: partner.email,
      phone: displayInternationalPhone(partner.phone),
      secondaryPhone: partner.secondaryPhone ? displayInternationalPhone(partner.secondaryPhone) : null,
      phoneCountryIso2: partner.phoneCountryIso2,
      secondaryPhoneCountryIso2: partner.secondaryPhoneCountryIso2,
    messenger: partner.messenger,
      messengers: parsePartnerMessengers(partner.messengers, partner.messenger),
      logoUrl: partner.logoUrl || companySettings.logoUrl || null,
    fleetSize: partner.fleetSize,
    fleetAgeLabel: fleetAgeLabel(partner.fleetAgeRange),
      fleetAgeRange: partner.fleetAgeRange,
      phoneVerifiedAt: partner.phoneVerifiedAt?.toISOString() ?? null,
      approvedAt: partner.approvedAt?.toISOString() ?? null,
      invitedAt: partner.invitedAt?.toISOString() ?? null,
      registrationSubmittedAt: partner.registrationSubmittedAt?.toISOString() ?? null,
      banWarning,
      ban: banRecord,
    rejectionNote: partner.rejectionNote,
    inviteToken: partner.inviteToken,
      telegramChatId: (partner as { telegramChatId?: string | null }).telegramChatId ?? null,
      telegramUsername: (partner as { telegramUsername?: string | null }).telegramUsername ?? null,
      telegramVerifiedAt: (partner as { telegramVerifiedAt?: Date | null }).telegramVerifiedAt
        ? (partner as { telegramVerifiedAt: Date }).telegramVerifiedAt.toISOString()
        : null,
      unreadReapplyCount,
      applicationMessages: messages,
      countriesEditUnlockUntil: moderation.countriesEditUnlockUntil,
      pendingProfileChanges: moderation.pendingChanges,
      profileUnreadCount: moderation.unreadCount,
    user: partner.user
      ? {
          firstName: partner.user.firstName,
          lastName: partner.user.lastName,
          status: partner.user.status,
            email: partner.user.email,
        }
      : null,
      cars,
      carCount: cars.length,
      activeCarCount: cars.filter((car) => car.status === "APPROVED").length,
      updatedAt: partner.updatedAt.toISOString(),
      createdAt: partner.createdAt.toISOString(),
      countries: [
        ...new Map(
          [
            ...parseIso2List(partner.operatingCountryIso2s).map(
              (iso2) => [iso2, { iso2, name: worldCountryName(iso2) }] as const,
            ),
            ...partner.locations.map((loc) => {
              const iso2 = loc.airport.city.country.iso2;
              return [iso2, { iso2, name: worldCountryName(iso2) }] as const;
            }),
          ],
        ).values(),
      ],
      companySettings,
      loginEmail:
        partner.user?.email ||
        credentials?.email ||
        partner.email ||
        "",
      portalPassword: credentials?.password || "",
      hasUser: Boolean(partner.userId || partner.user),
      source: "db" as const,
    });
  } catch (error) {
    if (isDbOfflineError(error)) {
      const file = markRead ? await markFilePartnerRead(id) : await getFilePartnerById(id);
      if (file) {
        return NextResponse.json(await filePartnerDetailWithCars(file));
      }
      const localDetail = await localSettingsPartnerDetail(id, markRead);
      if (localDetail) return NextResponse.json(localDetail);
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    console.error("[admin/partners GET]", error);
    return NextResponse.json({ error: "Could not load partner" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const actionRaw = String(body.action || body.status || "").toUpperCase();
  const action = actionRaw === "REJECT" ? "REJECTED" : actionRaw;

  if (action === "UPDATE_SETTINGS" || action === "SET_PASSWORD") {
    const applySettingsOffline = async () => {
      const previous = (await readCompanySettingsFile(id)) || parseCompanySettings(body.settings || {});
      const nextSettings = parseCompanySettings(body.settings ?? previous, {
        companyName: previous.title || previous.legalName,
        email: previous.email,
        phone: previous.primaryPhone,
        secondaryPhone: previous.secondaryPhone,
        deliveryCountryIso2s: previous.deliveryCountryIso2s,
        primaryMessengers: previous.primaryMessengers,
        secondaryMessengers: previous.secondaryMessengers,
      });
      try {
        const { activatePartnerApprovedDeliveryLocations } = await import(
          "@/lib/server/delivery-locations"
        );
        nextSettings.deliveryLocationIds = await activatePartnerApprovedDeliveryLocations(
          nextSettings.deliveryLocationIds || [],
        );
      } catch {
        /* keep codes */
      }
      await writeCompanySettingsFile(id, nextSettings);
      let moderation = await readProfileModerationFile(id);
      moderation = clearPendingChanges(moderation);
      await writeProfileModerationFile(id, moderation);
      {
        const nextLogin = String(body.loginEmail || nextSettings.email || "").trim();
        const nextPassword = String(body.portalPassword || "").trim();
        if (nextLogin || nextPassword) {
          const prev = await getPartnerCredentials(id);
          await setPartnerCredentials(
            id,
            nextLogin || prev?.email || nextSettings.email || "",
            nextPassword || prev?.password || "",
          );
        }
      }
      const local = loadLocalPartner();
      if (id === LOCAL_PARTNER_ID || id === local?.id) {
        const passwordPlain = String(body.portalPassword || "").trim();
        saveLocalPartner({
          email: String(body.loginEmail || nextSettings.email || local?.email || ""),
          companyName: nextSettings.title || nextSettings.legalName || local?.companyName,
          ...(passwordPlain ? { passwordHash: hashSecret(passwordPlain) } : {}),
        });
      }
      return nextSettings;
    };

    if (action === "SET_PASSWORD") {
      const password = String(body.portalPassword || body.password || "").trim();
      const loginEmail = String(body.loginEmail || body.email || "").trim().toLowerCase();
      if (password.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
      }
      let partnerRow = null as Awaited<ReturnType<typeof prisma.partner.findUnique>> & {
        user?: { email: string } | null;
      } | null;
      try {
        partnerRow = await prisma.partner.findUnique({ where: { id }, include: { user: true } });
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
      }
      const email =
        loginEmail ||
        partnerRow?.email ||
        partnerRow?.user?.email ||
        (await getPartnerCredentials(id))?.email ||
        "";
      await setPartnerCredentials(id, email, password);
      if (partnerRow?.userId) {
        await prisma.user.update({
          where: { id: partnerRow.userId },
          data: {
            passwordHash: hashSecret(password),
            ...(email ? { email } : {}),
          },
        });
      } else if (email) {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hashSecret(password) },
            });
          }
        } catch {
          /* offline */
        }
      }
      const local = loadLocalPartner();
      if (id === LOCAL_PARTNER_ID || id === local?.id) {
        saveLocalPartner({ email: email || local?.email, passwordHash: hashSecret(password) });
      }
      return NextResponse.json({
        ok: true,
        loginEmail: email,
        portalPassword: password,
        message: "Password updated",
      });
    }

    let partnerExisting = null as Awaited<ReturnType<typeof prisma.partner.findUnique>> | null;
    try {
      partnerExisting = await prisma.partner.findUnique({ where: { id } });
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    if (!partnerExisting) {
      const nextSettings = await applySettingsOffline();
      return NextResponse.json({
        ok: true,
        companySettings: nextSettings,
        loginEmail: (await getPartnerCredentials(id))?.email || nextSettings.email,
        portalPassword: (await getPartnerCredentials(id))?.password || "",
        message: "Partner settings saved (local)",
      });
    }

    const previous = await resolveCompanySettings(partnerExisting);
    const settings = parseCompanySettings(body.settings ?? body, {
      companyName: partnerExisting.companyName,
      email: partnerExisting.email,
      phone: partnerExisting.phone,
      secondaryPhone: partnerExisting.secondaryPhone,
      deliveryCountryIso2s: parseIso2List(partnerExisting.operatingCountryIso2s),
      primaryMessengers: previous.primaryMessengers,
      secondaryMessengers: previous.secondaryMessengers,
    });
    const { activatePartnerApprovedDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const resolvedLocationIds = await activatePartnerApprovedDeliveryLocations(
      settings.deliveryLocationIds || [],
    );
    const nextSettings = {
      ...settings,
      deliveryCountryIso2s: settings.deliveryCountryIso2s.length
        ? settings.deliveryCountryIso2s
        : parseIso2List(partnerExisting.operatingCountryIso2s),
      deliveryLocationIds: resolvedLocationIds,
    };
    const messengers = [
      ...new Set([
        ...(nextSettings.primaryMessengers || []),
        ...(nextSettings.secondaryMessengers || []),
      ]),
    ];
    let moderation = await resolveProfileModeration(
      partnerExisting as { id: string; profileModeration?: unknown },
    );
    moderation = clearPendingChanges(moderation);

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        profileModeration: moderation,
        unreadReapplyCount: 0,
        companySettings: nextSettings,
        companyName: nextSettings.title || nextSettings.legalName || partnerExisting.companyName,
        phone: nextSettings.primaryPhone || partnerExisting.phone,
        secondaryPhone: nextSettings.secondaryPhone || null,
        email: nextSettings.email || partnerExisting.email,
        logoUrl: nextSettings.logoUrl || null,
        messengers,
        messenger: (messengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM" | undefined) || "WHATSAPP",
        operatingCountryIso2s: nextSettings.deliveryCountryIso2s,
        ...(partnerExisting.status === "PENDING_REMODERATION" ? { status: "APPROVED" } : {}),
      },
    });
    await writeProfileModerationFile(id, moderation);
    await writeCompanySettingsFile(id, nextSettings);

    const loginEmail = String(body.loginEmail || nextSettings.email || partner.email).trim();
    const portalPassword = String(body.portalPassword || "").trim();
    if (loginEmail && portalPassword) {
      await setPartnerCredentials(id, loginEmail, portalPassword);
      if (partnerExisting.userId) {
        await prisma.user.update({
          where: { id: partnerExisting.userId },
          data: { email: loginEmail, passwordHash: hashSecret(portalPassword) },
        });
      }
      const local = loadLocalPartner();
      if (id === LOCAL_PARTNER_ID || id === local?.id) {
        saveLocalPartner({
          email: loginEmail,
          passwordHash: hashSecret(portalPassword),
          companyName: nextSettings.title || nextSettings.legalName || local?.companyName,
        });
      }
    } else if (loginEmail) {
      const prevCred = await getPartnerCredentials(id);
      await setPartnerCredentials(id, loginEmail, prevCred?.password || "");
      if (partnerExisting.userId) {
        await prisma.user.update({
          where: { id: partnerExisting.userId },
          data: { email: loginEmail },
        });
      }
    }

    const credentials = await getPartnerCredentials(id);
    return NextResponse.json({
      ok: true,
      id: partner.id,
      status: partner.status,
      companySettings: nextSettings,
      loginEmail: credentials?.email || loginEmail,
      portalPassword: credentials?.password || "",
      message: "Partner settings saved",
    });
  }

  let existing = null as Awaited<ReturnType<typeof prisma.partner.findUnique>> | null;
  try {
    existing = await prisma.partner.findUnique({ where: { id } });
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  if (!existing) {
    const file = await getFilePartnerById(id);
    if (file) {
      if (action === "REJECTED") {
        const note = String(body.rejectionNote || body.note || "Rejected").trim();
        const updated = await updateFilePartnerStatus(id, "REJECTED", note);
        return NextResponse.json({
          id,
          status: "REJECTED",
          message: "Application rejected (local store).",
          partner: updated ? filePartnerDetail(updated) : null,
        });
      }
      if (action === "FINAL_APPROVE" || (action === "APPROVED" && file.status === "PENDING_FINAL")) {
        try {
          await activatePartnerFromStoredPassword(id);
        } catch {
          /* cabinet login is opened when the database is reachable */
        }
        const updated = await updateFilePartnerStatus(id, "APPROVED", null);
        await markFilePartnerRead(id);
        const seq =
          updated?.sequentialNumber ??
          (await (await import("@/lib/server/ensure-file-partner-code")).ensureFilePartnerSequentialNumber({
            partnerId: id,
            email: file.email,
          }));
        return NextResponse.json({
          id,
          status: "APPROVED",
          sequentialNumber: seq,
          partnerCode: formatPartnerCode(seq),
          message: "Partner activated in local store.",
          partner: updated ? filePartnerDetail(updated) : null,
        });
      }
      if (action === "INVITE" || action === "APPROVED") {
        try {
          const activated = await activatePartnerFromStoredPassword(id);
          if (activated.ok) {
            const updated = await updateFilePartnerStatus(id, "APPROVED", null);
            await markFilePartnerRead(id);
            return NextResponse.json({
              id,
              status: "APPROVED",
              message: "Approved. The email and password from the application are now the partner cabinet login.",
              partner: updated ? filePartnerDetail(updated) : null,
            });
          }
          if (activated.reason === "email-taken") {
            return NextResponse.json(
              { error: "This email already belongs to another account, so the cabinet could not be opened." },
              { status: 409 },
            );
          }
        } catch {
          /* database is offline — fall through to the invite mark */
        }
        const updated = await updateFilePartnerStatus(id, "INVITED", null);
        await markFilePartnerRead(id);
        return NextResponse.json({
          id,
          status: "INVITED",
          message:
            "Marked as invited in local store. The partner can complete registration on the partner portal.",
          partner: updated ? filePartnerDetail((await markFilePartnerRead(id)) ?? updated) : null,
        });
      }
      if (action === "BLOCK" || action === "UNBLOCK") {
        const { upsertPartnerBan, removePartnerBan, formatPartnerBanWarning } = await import(
          "@/lib/server/partner-bans-store"
        );
        if (action === "BLOCK") {
          const ban = await upsertPartnerBan({
            email: file.email,
            phone: file.phone || "",
            extraEmails: String(body.extraEmail || body.blockEmail || "").trim()
              ? [String(body.extraEmail || body.blockEmail || "").trim()]
              : [],
            plates: String(body.plate || body.registrationNumber || "").trim()
              ? [String(body.plate || body.registrationNumber || "").trim()]
              : [],
            notes: String(body.notes || body.blockNotes || "").trim(),
            reason: "Blocked by admin",
            partnerId: id,
          });
          await updateFilePartnerStatus(id, "REJECTED", ban.reason);
          return NextResponse.json({
            ok: true,
            status: "SUSPENDED",
            ban,
            warning: formatPartnerBanWarning(ban),
          });
        }
        await removePartnerBan({ partnerId: id, email: file.email, phone: file.phone });
        await updateFilePartnerStatus(id, "APPROVED", null);
        return NextResponse.json({ ok: true, status: "APPROVED" });
      }
      return NextResponse.json(
        { error: "This action requires the database. Start Postgres and try again." },
        { status: 503 },
      );
    }

    // Offline / local profile remodeation (e.g. local-partner with .data profile queue)
    if (action === "FINAL_APPROVE" || action === "APPROVED") {
      const settings = await readCompanySettingsFile(id);
      let moderation = await readProfileModerationFile(id);
      if (!settings && !moderation.pendingChanges.length && id !== LOCAL_PARTNER_ID) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
      moderation = clearPendingChanges(moderation);
      await writeProfileModerationFile(id, moderation);

      const local = loadLocalPartner();
      const email = settings?.email || local?.email || "";
      const { ensureFilePartnerSequentialNumber } = await import(
        "@/lib/server/ensure-file-partner-code"
      );
      const sequentialNumber = await ensureFilePartnerSequentialNumber({ partnerId: id, email });
      if (id === LOCAL_PARTNER_ID || id === local?.id) {
        saveLocalPartner({
          sequentialNumber,
          email: email || undefined,
          companyName: settings?.title || settings?.legalName || undefined,
        });
      }

      try {
        const { findFilePartnerByEmail, updateFilePartnerStatus: updateFile } = await import(
          "@/lib/server/partner-applications-store"
        );
        const matched = email ? await findFilePartnerByEmail(email) : null;
        if (matched && matched.status !== "APPROVED") {
          await updateFile(matched.id, "APPROVED", null);
        }
      } catch {
        /* optional */
      }

      let listingsRestored = 0;
      try {
        const partnerIds = new Set<string>([id]);
        if (email) {
          const dbPartners = await prisma.partner.findMany({
            where: { email },
            select: { id: true },
          });
          for (const p of dbPartners) partnerIds.add(p.id);
        }
        const result = await prisma.car.updateMany({
          where: {
            partnerId: { in: [...partnerIds] },
            status: { in: ["PENDING_REMODERATION", "PENDING"] },
          },
          data: { status: "APPROVED", hiddenReason: null },
        });
        listingsRestored = result.count;
      } catch {
        /* DB offline — partner profile still approved in file store */
      }

      return NextResponse.json({
        id,
        status: "APPROVED",
        sequentialNumber,
        partnerCode: formatPartnerCode(sequentialNumber),
        listingsRestored,
        message:
          listingsRestored > 0
            ? `Remoderation approved — ${listingsRestored} listing(s) activated.`
            : "Remoderation approved — changes applied; listings active when partner status is APPROVED.",
      });
    }

    if (action === "REJECTED") {
      let moderation = await readProfileModerationFile(id);
      const published = moderation.publishedSettings;
      if (published) {
        await writeCompanySettingsFile(id, published);
      }
      const rejectNote = String(body.rejectionNote || body.note || "").trim() || null;
      moderation = clearPendingChanges(moderation, { adminNote: rejectNote });
      await writeProfileModerationFile(id, moderation);
      return NextResponse.json({
        id,
        status: published ? "APPROVED" : "REJECTED",
        message: published
          ? "Remoderation rejected — previous public version kept."
          : rejectNote || "Rejected",
      });
    }

    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  // Step 1 approve → open the cabinet when the application already has a password, otherwise send an invite.
  if (action === "INVITE" || (action === "APPROVED" && existing.status === "PENDING")) {
    const activated = await activatePartnerFromStoredPassword(existing.id);
    if (activated.ok) {
      return NextResponse.json({
        id: activated.partnerId,
        status: "APPROVED",
        message: "Approved. The email and password from the application are now the partner cabinet login.",
      });
    }
    if (activated.reason === "email-taken") {
      return NextResponse.json(
        { error: "This email already belongs to another account, so the cabinet could not be opened." },
        { status: 409 },
      );
    }
    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        status: "INVITED",
        inviteToken: token,
        inviteTokenExpiresAt: expires,
        invitedAt: new Date(),
        rejectionNote: null,
      },
    });
    const inviteUrl = buildPartnerInviteUrl(origin, token);
    const mail = await sendPartnerInviteEmail({
      email: partner.email,
      contactName: partner.contactName,
      inviteUrl,
      userId: partner.userId,
    });
    return NextResponse.json({
      id: partner.id,
      status: partner.status,
      inviteUrl,
      emailSent: mail.sent,
      message: mail.sent
        ? "Invite email sent."
        : "Invite created. Email logged (SMTP not configured) — copy the registration link below.",
    });
  }

  // Request corrections after registration
  if (action === "NEEDS_CORRECTION" || action === "REQUEST_CORRECTION") {
    const note = String(body.rejectionNote || body.note || "").trim();
    if (!note) {
      return NextResponse.json({ error: "Feedback note is required" }, { status: 400 });
    }
    let token = existing.inviteToken;
    if (!token) {
      token = randomBytes(24).toString("hex");
    }
    const expires = new Date(Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        status: "NEEDS_CORRECTION",
        rejectionNote: note,
        inviteToken: token,
        inviteTokenExpiresAt: expires,
      },
    });
    const correctionUrl = buildPartnerInviteUrl(origin, token);
    await sendPartnerFeedbackEmail({
      email: partner.email,
      contactName: partner.contactName,
      note,
      correctionUrl,
      userId: partner.userId,
    });
    return NextResponse.json({
      id: partner.id,
      status: partner.status,
      correctionUrl,
      message: "Correction request sent to partner.",
    });
  }

  // Timed unlock for delivery countries field on partner personal info
  if (action === "UNLOCK_COUNTRIES") {
    const durationMinutes = Math.max(1, Number(body.durationMinutes) || 30);
    let moderation = await resolveProfileModeration(
      existing as { id: string; profileModeration?: unknown },
    );
    moderation = unlockCountriesFor(moderation, durationMinutes);
    try {
      await prisma.partner.update({
        where: { id },
        data: { profileModeration: moderation },
      });
    } catch (error) {
      console.warn("[admin/partners] unlock countries DB write failed", error);
    }
    await writeProfileModerationFile(id, moderation);
    return NextResponse.json({
      id,
      status: existing.status,
      countriesEditUnlockUntil: moderation.countriesEditUnlockUntil,
      message: `Delivery countries unlocked for ${durationMinutes} minute(s).`,
    });
  }

  // Final approve after registration. Application email and password become the cabinet login.
  if (action === "APPROVED" || action === "FINAL_APPROVE") {
    if (!["PENDING_FINAL", "NEEDS_CORRECTION", "INVITED", "PENDING", "PENDING_REMODERATION", "APPROVED"].includes(existing.status)) {
      // still allow re-approve
    }
    const activatedNow = await activatePartnerFromStoredPassword(existing.id);
    if (activatedNow.ok) {
      existing = await prisma.partner.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    } else if (activatedNow.reason === "email-taken") {
      return NextResponse.json(
        { error: "This email already belongs to another account, so the cabinet could not be opened." },
        { status: 409 },
      );
    }
    if (!existing.userId && existing.status !== "PENDING") {
      // registration not completed — only invite path should be used for PENDING
      if (existing.status === "PENDING_FINAL" || existing.status === "NEEDS_CORRECTION") {
        return NextResponse.json(
          { error: "Partner has not completed registration yet" },
          { status: 400 },
        );
      }
    }

    let sequentialNumber = existing.sequentialNumber;
    if (!sequentialNumber || sequentialNumber < PORTAL_ID_START) {
      sequentialNumber = await nextPartnerSequentialNumber();
    }

    // If still PENDING without registration, open the cabinet or send an invite.
    if (existing.status === "PENDING" && !existing.userId) {
      const activated = await activatePartnerFromStoredPassword(existing.id);
      if (activated.ok) {
        return NextResponse.json({
          id: activated.partnerId,
          status: "APPROVED",
          message: "Approved. The email and password from the application are now the partner cabinet login.",
        });
      }
      if (activated.reason === "email-taken") {
        return NextResponse.json(
          { error: "This email already belongs to another account, so the cabinet could not be opened." },
          { status: 409 },
        );
      }
      const token = randomBytes(24).toString("hex");
      const expires = new Date(Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
      const partner = await prisma.partner.update({
        where: { id },
        data: {
          status: "INVITED",
          inviteToken: token,
          inviteTokenExpiresAt: expires,
          invitedAt: new Date(),
        },
      });
      const inviteUrl = buildPartnerInviteUrl(origin, token);
      await sendPartnerInviteEmail({
        email: partner.email,
        contactName: partner.contactName,
        inviteUrl,
      });
      return NextResponse.json({
        id: partner.id,
        status: partner.status,
        inviteUrl,
        message: "Step 1 approved — registration invite sent.",
      });
    }

    let moderation = await resolveProfileModeration(
      existing as { id: string; profileModeration?: unknown },
    );
    const draftSettings = await resolveCompanySettings(
      existing as {
        id: string;
        companySettings?: unknown;
        companyName?: string;
        email?: string;
        phone?: string;
        secondaryPhone?: string | null;
        messengers?: unknown;
        messenger?: string | null;
        operatingCountryIso2s?: unknown;
      },
    );
    moderation = clearPendingChanges(moderation);

    const messengers = [
      ...new Set([
        ...(draftSettings.primaryMessengers || []),
        ...(draftSettings.secondaryMessengers || []),
      ]),
    ];

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        status: "APPROVED",
        sequentialNumber,
        approvedAt: new Date(),
        rejectionNote: null,
        profileModeration: moderation,
        unreadReapplyCount: 0,
        companySettings: draftSettings,
        companyName: draftSettings.title || draftSettings.legalName || existing.companyName,
        phone: draftSettings.primaryPhone || existing.phone,
        secondaryPhone: draftSettings.secondaryPhone || null,
        email: draftSettings.email || existing.email,
        logoUrl: draftSettings.logoUrl || null,
        messengers,
        messenger: (messengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM" | undefined) || "WHATSAPP",
        operatingCountryIso2s: draftSettings.deliveryCountryIso2s?.length
          ? draftSettings.deliveryCountryIso2s
          : parseIso2List(existing.operatingCountryIso2s),
      },
    });
    await writeProfileModerationFile(id, moderation);
    try {
      await writeCompanySettingsFile(id, draftSettings);
    } catch {
      /* optional file mirror */
    }

    let listingsRestored = 0;
    if (existing.status === "PENDING_REMODERATION" || existing.status === "APPROVED") {
      try {
        const result = await prisma.car.updateMany({
          where: {
            partnerId: id,
            status: { in: ["PENDING_REMODERATION", "PENDING"] },
          },
          data: { status: "APPROVED", hiddenReason: null },
        });
        listingsRestored = result.count;
      } catch (carError) {
        console.warn("[admin/partners] listing restore failed", carError);
      }
    }

    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { status: "ACTIVE", role: "VENDOR" },
      });
    }

    return NextResponse.json({
      id: partner.id,
      status: partner.status,
      sequentialNumber: partner.sequentialNumber,
      partnerCode: formatPartnerCode(partner.sequentialNumber),
      listingsRestored,
      message:
        existing.status === "PENDING_REMODERATION"
          ? listingsRestored > 0
            ? `Remoderation approved — ${listingsRestored} listing(s) activated.`
            : "Remoderation approved — partner listings visible again."
          : "Partner account activated.",
    });
  }

  if (action === "REJECTED") {
    // Remoderation reject: keep partner approved and restore the last public version
    if (existing.status === "PENDING_REMODERATION") {
      let moderation = await resolveProfileModeration(
        existing as { id: string; profileModeration?: unknown },
      );
      const published = moderation.publishedSettings;
      const rejectNote =
        String(body.rejectionNote || body.note || existing.rejectionNote || "").trim() || null;
      moderation = clearPendingChanges(moderation, { adminNote: rejectNote });
      if (published) {
        const messengers = [
          ...new Set([
            ...(published.primaryMessengers || []),
            ...(published.secondaryMessengers || []),
          ]),
        ];
        await prisma.partner.update({
          where: { id },
          data: {
            status: "APPROVED",
            companySettings: published,
            companyName: published.title || published.legalName || existing.companyName,
            phone: published.primaryPhone || existing.phone,
            secondaryPhone: published.secondaryPhone || null,
            email: published.email || existing.email,
            logoUrl: published.logoUrl || null,
            messengers,
            messenger: (messengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM" | undefined) || "WHATSAPP",
            operatingCountryIso2s: published.deliveryCountryIso2s?.length
              ? published.deliveryCountryIso2s
              : parseIso2List(existing.operatingCountryIso2s),
            profileModeration: moderation,
            unreadReapplyCount: 0,
            rejectionNote: body.rejectionNote ?? existing.rejectionNote,
          },
        });
        try {
          await writeCompanySettingsFile(id, published);
        } catch {
          /* optional */
        }
      } else {
        await prisma.partner.update({
          where: { id },
          data: {
            status: "APPROVED",
            profileModeration: moderation,
            unreadReapplyCount: 0,
          },
        });
      }
      await writeProfileModerationFile(id, moderation);
      return NextResponse.json({
        id,
        status: "APPROVED",
        message: "Remoderation rejected — previous public version kept.",
      });
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionNote: body.rejectionNote ?? existing.rejectionNote,
      },
    });
    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { status: "SUSPENDED", role: "VENDOR" },
      });
    }
    return NextResponse.json({ id: partner.id, status: partner.status });
  }

  if (action === "SUSPENDED") {
    const partner = await prisma.partner.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { status: "SUSPENDED" },
      });
    }
    return NextResponse.json({ id: partner.id, status: partner.status });
  }

  if (action === "BLOCK" || action === "UNBLOCK") {
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    const { upsertPartnerBan, removePartnerBan, formatPartnerBanWarning } = await import(
      "@/lib/server/partner-bans-store"
    );
    const { updateFilePartnerStatus, getFilePartnerById } = await import(
      "@/lib/server/partner-applications-store"
    );

    let email = String(body.email || existing.email || "").trim();
    let phone = String(body.phone || existing.phone || "").trim();
    const extraEmail = String(body.extraEmail || body.blockEmail || "").trim();
    const plate = String(body.plate || body.registrationNumber || body.carNumber || "").trim();
    const notes = String(body.notes || body.blockNotes || "").trim();

    if (action === "BLOCK") {
      const ban = await upsertPartnerBan({
        email: email || existing.email,
        phone: phone || existing.phone || "",
        extraEmails: extraEmail ? [extraEmail] : [],
        plates: plate ? [plate] : [],
        notes,
        reason: "Blocked by admin",
        partnerId: id,
      });
      try {
        await prisma.partner.update({ where: { id }, data: { status: "SUSPENDED" } });
        if (existing.userId) {
          await prisma.user.update({
            where: { id: existing.userId },
            data: { status: "SUSPENDED" },
          });
        }
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
        const file = await getFilePartnerById(id);
        if (file) await updateFilePartnerStatus(id, "REJECTED");
      }
      return NextResponse.json({
        ok: true,
        status: "SUSPENDED",
        ban,
        warning: formatPartnerBanWarning(ban),
      });
    }

    await removePartnerBan({ partnerId: id, email: email || existing.email, phone });
    try {
      await prisma.partner.update({ where: { id }, data: { status: "APPROVED" } });
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { status: "ACTIVE" },
        });
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
      const file = await getFilePartnerById(id);
      if (file) await updateFilePartnerStatus(id, "APPROVED");
    }
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  return NextResponse.json(
    {
      error:
        "Invalid action. Use INVITE, APPROVED/FINAL_APPROVE, NEEDS_CORRECTION, REJECTED, SUSPENDED, BLOCK, or UNBLOCK.",
    },
    { status: 400 },
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;

  try {
    const existing = await prisma.partner.findUnique({
      where: { id },
      select: { id: true, userId: true, email: true, phone: true },
    });
    if (existing) {
      try {
        await prisma.partner.delete({ where: { id: existing.id } });
        if (existing.userId) {
          try {
            await prisma.user.delete({ where: { id: existing.userId } });
          } catch {
            await prisma.user.update({
              where: { id: existing.userId },
              data: { status: "SUSPENDED", role: "CUSTOMER" },
            });
          }
        }
      } catch {
        await prisma.partner.update({
          where: { id: existing.id },
          data: { status: "SUSPENDED", email: `deleted+${existing.id.slice(0, 8)}@invalid.local` },
        });
        if (existing.userId) {
          await prisma.user.update({
            where: { id: existing.userId },
            data: { status: "SUSPENDED" },
          });
        }
      }
      return NextResponse.json({ ok: true, source: "db" });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.error("[admin/partners DELETE]", error);
      return NextResponse.json({ error: "Could not delete partner" }, { status: 500 });
    }
  }

  try {
    const { getFilePartnerById, updateFilePartnerStatus } = await import(
      "@/lib/server/partner-applications-store"
    );
    const file = await getFilePartnerById(id);
    if (file) {
      await updateFilePartnerStatus(id, "REJECTED");
      return NextResponse.json({ ok: true, source: "file" });
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ error: "Partner not found" }, { status: 404 });
}
