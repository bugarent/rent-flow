import { NextResponse } from "next/server";
import { z } from "zod";
import { hashSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { PARTNER_INVITE_TTL_DAYS, parseIso2List } from "@/lib/partner";
import { setPartnerAirports } from "@/lib/server/partner-airports";
import { airportsForCountries } from "@/lib/catalog/operating-regions";
import { PARTNER_LOGIN } from "@/lib/routes";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  getFilePartnerById,
  listFilePartnerApplications,
  updateFilePartnerStatus,
} from "@/lib/server/partner-applications-store";
import { saveLocalPartner } from "@/lib/auth/local-partner-store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().trim().min(1).max(120),
  countryIso2: z.string().length(2),
});

const NOT_MODERATED = {
  code: "NOT_MODERATED" as const,
  error:
    "The email you entered has not passed moderation / approval. To register here you must first submit a partner application (Become a Partner) and have an administrator approve it.",
};

async function findPartnerByEmail(email: string) {
  try {
    const partner = await prisma.partner.findFirst({
      where: { email },
      orderBy: { updatedAt: "desc" },
    });
    if (partner) return { partner, source: "db" as const };
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const filePartners = await listFilePartnerApplications();
  const file = filePartners.find((p) => p.email.toLowerCase() === email) ?? null;
  if (!file) return null;

  return {
    partner: {
      id: file.id,
      email: file.email,
      status: file.status,
      inviteTokenExpiresAt: null as Date | null,
      userId: null as string | null,
      representativeFirstName: file.representativeFirstName,
      representativeLastName: file.representativeLastName,
      contactName: file.contactName,
      phone: file.phone,
      messenger: (file.messengers[0] || "WHATSAPP") as "WHATSAPP" | "VIBER" | "TELEGRAM",
      operatingCountryIso2s: file.operatingCountryIso2s,
      personalId: file.personalId,
      kind: file.kind,
      fleetSize: file.fleetSize,
      fleetAgeRange: file.fleetAgeRange,
      phoneCountryIso2: file.phoneCountryIso2,
      messengers: file.messengers,
    },
    source: "file" as const,
  };
}

/** When Postgres is back, promote a file-store invited partner into the DB. */
async function hydrateFilePartnerToDb(input: {
  fileId: string;
  email: string;
  passwordHash: string;
  companyName: string;
  countryIso2: string;
  firstName: string;
  lastName: string;
  countryIso2s: string[];
}) {
  const file = await getFilePartnerById(input.fileId);
  if (!file) throw new Error("FILE_MISSING");

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { email: input.email } });
    if (existingUser) throw new Error("EMAIL_TAKEN");

    const user = await tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: file.phone,
        countryOfResidence: input.countryIso2,
        preferredMessenger: (file.messengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM") || "WHATSAPP",
        passwordHash: input.passwordHash,
        role: "VENDOR",
        status: "PENDING_APPROVAL",
      },
    });

    const existingPartner = await tx.partner.findUnique({ where: { id: file.id } });
    const partnerData = {
      userId: user.id,
      kind: file.kind,
      companyName: input.companyName,
      contactName: `${input.firstName} ${input.lastName}`.trim(),
      personalId: file.personalId,
      representativeFirstName: file.representativeFirstName,
      representativeLastName: file.representativeLastName,
      email: input.email,
      phone: file.phone,
      phoneCountryIso2: file.phoneCountryIso2,
      messenger: (file.messengers[0] as "WHATSAPP" | "VIBER" | "TELEGRAM") || "WHATSAPP",
      messengers: file.messengers,
      fleetSize: file.fleetSize,
      fleetAgeRange: file.fleetAgeRange as "AGE_0_5" | "AGE_6_9" | "AGE_10_PLUS",
      operatingCountryIso2s: input.countryIso2s,
      status: "PENDING_FINAL" as const,
      registrationSubmittedAt: new Date(),
      rejectionNote: null,
      inviteTokenExpiresAt: new Date(Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      sequentialNumber: file.sequentialNumber ?? undefined,
    };

    const partner = existingPartner
      ? await tx.partner.update({ where: { id: file.id }, data: partnerData })
      : await tx.partner.create({ data: { id: file.id, ...partnerData } });

    return partner;
  });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const companyName = body.companyName.trim();
    const countryIso2 = body.countryIso2.toUpperCase();

    if (body.password.length < 6 || !/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
      return NextResponse.json(
        { error: "The password must contain Latin letters, and numbers", code: "WEAK_PASSWORD" },
        { status: 400 },
      );
    }

    let found: Awaited<ReturnType<typeof findPartnerByEmail>>;
    try {
      found = await findPartnerByEmail(email);
    } catch (error) {
      console.error("[partners/portal-register] lookup", error);
      return NextResponse.json(NOT_MODERATED, { status: 403 });
    }

    const status = found?.partner.status;
    // Re-open a previously rejected application so registration can finish after admin invite intent.
    if (found && status === "REJECTED" && found.source === "file") {
      await updateFilePartnerStatus(found.partner.id, "INVITED", null);
      found = {
        ...found,
        partner: { ...found.partner, status: "INVITED" },
      };
    }
    const openStatus = found?.partner.status;
    if (!found || !["INVITED", "NEEDS_CORRECTION"].includes(String(openStatus))) {
      if (openStatus === "PENDING") {
        return NextResponse.json(
          {
            code: "PENDING_MODERATION",
            error:
              "Your partner application is still awaiting administrator moderation. Registration will be available after approval.",
          },
          { status: 403 },
        );
      }
      if (openStatus === "REJECTED") {
        return NextResponse.json(
          {
            code: "REJECTED",
            error:
              "This email’s partner application was rejected. Registration is not available until a new application is approved.",
          },
          { status: 403 },
        );
      }
      return NextResponse.json(NOT_MODERATED, { status: 403 });
    }

    const partner = found.partner;
    if (partner.inviteTokenExpiresAt && partner.inviteTokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          code: "INVITE_EXPIRED",
          error: "Your invitation has expired. Please re-apply via Become a Partner.",
        },
        { status: 410 },
      );
    }

    if (found.source === "file") {
      const passwordHash = hashSecret(body.password);
      try {
        const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
        await setPartnerCredentials(partner.id, email, body.password);
      } catch {
        /* best-effort */
      }
      const firstName =
        partner.representativeFirstName?.trim() ||
        partner.contactName.split(/\s+/)[0] ||
        companyName.split(/\s+/)[0] ||
        "Partner";
      const lastName =
        partner.representativeLastName?.trim() ||
        partner.contactName.split(/\s+/).slice(1).join(" ") ||
        companyName.split(/\s+/).slice(1).join(" ") ||
        "Account";
      const existingCountries = parseIso2List(partner.operatingCountryIso2s);
      const countryIso2s = existingCountries.includes(countryIso2)
        ? existingCountries
        : [...existingCountries, countryIso2];

      try {
        const result = await hydrateFilePartnerToDb({
          fileId: partner.id,
          email,
          passwordHash,
          companyName,
          countryIso2,
          firstName,
          lastName,
          countryIso2s,
        });
        await updateFilePartnerStatus(partner.id, "PENDING_FINAL", null);
        try {
          const airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
          if (airportIatas.length) await setPartnerAirports(result.id, airportIatas);
        } catch (locError) {
          console.warn("[partners/portal-register] airports:", locError);
        }
        return NextResponse.json({
          partnerId: result.id,
          status: result.status,
          message: "Registration submitted for final admin review.",
          next: `${PARTNER_LOGIN}?mode=login&registered=1`,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_TAKEN") {
          return NextResponse.json(
            { error: "Email is already registered. Please log in.", code: "EMAIL_TAKEN" },
            { status: 409 },
          );
        }
        if (!isDbOfflineError(error) && !(error instanceof Error && error.message === "FILE_MISSING")) {
          // Unexpected DB error — still try offline completion below when offline-like
          if (!isDbOfflineError(error)) {
            console.warn("[partners/portal-register] hydrate failed, using local store", error);
          }
        }
      }

      // Postgres unavailable: finish registration in local file + local partner account.
      saveLocalPartner({ email, passwordHash, companyName });
      try {
        const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
        const { LOCAL_PARTNER_ID } = await import("@/lib/auth/local-partner-store");
        await setPartnerCredentials(LOCAL_PARTNER_ID, email, body.password);
        await setPartnerCredentials(partner.id, email, body.password);
      } catch {
        /* best-effort */
      }
      await updateFilePartnerStatus(partner.id, "PENDING_FINAL", null);
      return NextResponse.json({
        partnerId: partner.id,
        status: "PENDING_FINAL",
        offline: true,
        message: "Registration submitted for final admin review.",
        next: `${PARTNER_LOGIN}?mode=login&registered=1`,
      });
    }

    const passwordHash = hashSecret(body.password);
    try {
      const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
      await setPartnerCredentials(partner.id, email, body.password);
    } catch {
      /* best-effort */
    }
    const firstName =
      partner.representativeFirstName?.trim() ||
      partner.contactName.split(/\s+/)[0] ||
      companyName.split(/\s+/)[0] ||
      "Partner";
    const lastName =
      partner.representativeLastName?.trim() ||
      partner.contactName.split(/\s+/).slice(1).join(" ") ||
      companyName.split(/\s+/).slice(1).join(" ") ||
      "Account";

    const existingCountries = parseIso2List(partner.operatingCountryIso2s);
    const countryIso2s = existingCountries.includes(countryIso2)
      ? existingCountries
      : [...existingCountries, countryIso2];

    const result = await prisma.$transaction(async (tx) => {
      let userId = partner.userId;
      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            email,
            passwordHash,
            role: "VENDOR",
            status: "PENDING_APPROVAL",
            firstName,
            lastName,
            countryOfResidence: countryIso2,
            phone: partner.phone,
          },
        });
      } else {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error("EMAIL_TAKEN");
        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            phone: partner.phone,
            countryOfResidence: countryIso2,
            preferredMessenger: partner.messenger,
            passwordHash,
            role: "VENDOR",
            status: "PENDING_APPROVAL",
          },
        });
        userId = user.id;
      }

      return tx.partner.update({
        where: { id: partner.id },
        data: {
          userId,
          companyName,
          contactName: `${firstName} ${lastName}`.trim(),
          operatingCountryIso2s: countryIso2s,
          status: "PENDING_FINAL",
          registrationSubmittedAt: new Date(),
          rejectionNote: null,
          inviteTokenExpiresAt: new Date(
            Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });
    });

    try {
      const airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
      if (airportIatas.length) await setPartnerAirports(result.id, airportIatas);
    } catch (locError) {
      console.warn("[partners/portal-register] airports:", locError);
    }

    return NextResponse.json({
      partnerId: result.id,
      status: result.status,
      message: "Registration submitted for final admin review.",
      next: `${PARTNER_LOGIN}?mode=login&registered=1`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid registration data", code: "INVALID" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Email is already registered. Please log in.", code: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }
    if (isDbOfflineError(error)) {
      return NextResponse.json(
        {
          code: "DB_OFFLINE",
          error:
            "Registration could not be completed because the database is offline. If your email is not yet moderated/approved, submit Become a Partner first.",
        },
        { status: 503 },
      );
    }
    console.error("[partners/portal-register POST]", error);
    return NextResponse.json(
      {
        code: "SERVER",
        error:
          "Registration could not be completed. The email may not be moderated/approved by an administrator yet.",
      },
      { status: 500 },
    );
  }
}
