import type { Messenger } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FLEET_AGE_RANGES, PARTNER_SOCIAL_PLATFORMS, isStrongPartnerPassword } from "@/lib/partner";
import { setPartnerAirports } from "@/lib/server/partner-airports";
import { airportsForCountries } from "@/lib/catalog/operating-regions";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { assertAllowedOperatingCountries } from "@/lib/server/partner-operating-countries";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { createOrReapplyFilePartner } from "@/lib/server/partner-applications-store";
import {
  buildPartnerApplicationMessage,
  parsePartnerApplicationMessages,
  partnerReapplyWindowStart,
  type PartnerApplicationMessageSnapshot,
} from "@/lib/partner-application-messages";
import { nextPartnerSequentialNumber } from "@/lib/sequential-ids";

function asMessenger(value: string | undefined): Messenger {
  if (value === "VIBER" || value === "TELEGRAM") return value;
  return "WHATSAPP";
}

const fleetAgeValues = FLEET_AGE_RANGES.map((r) => r.value) as [string, ...string[]];
const socialValues = PARTNER_SOCIAL_PLATFORMS.map((p) => p.value) as [string, ...string[]];

const applicationSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    kind: z.enum(["COMPANY", "PRIVATE"]),
    identificationNumber: z.string().trim().min(5).max(40),
    email: z.string().email(),
    phone: z.string().trim().min(8).max(40),
    phoneCountryIso2: z.string().length(2),
    secondaryPhone: z.string().trim().min(8).max(40).optional(),
    secondaryPhoneCountryIso2: z.string().length(2).optional(),
    messengers: z.array(z.enum(socialValues)).min(1),
    fleetSize: z.number().int().min(1).max(10000),
    fleetAgeRange: z.enum(fleetAgeValues),
    countryIso2s: z.array(z.string().length(2)).min(1),
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => isStrongPartnerPassword(value.password), {
    message: "Password must be at least 6 characters and include uppercase, lowercase, and a number",
    path: ["password"],
  });

async function rememberPartnerPassword(partnerId: string, email: string, password: string) {
  try {
    const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
    await setPartnerCredentials(partnerId, email, password);
  } catch (error) {
    console.warn("[partners] could not store cabinet password:", error);
  }
}

async function saveViaFile(input: {
  snapshot: PartnerApplicationMessageSnapshot;
  contactName: string;
  secondaryPhone: string | null;
  secondaryPhoneCountryIso2: string | null;
  password: string;
}) {
  try {
    const { partner, reapplied } = await createOrReapplyFilePartner(input);
    try {
      const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
      await setPartnerCredentials(partner.id, input.snapshot.email, input.password);
    } catch {
      /* cabinet password is applied again when an admin approves */
    }
    return NextResponse.json(
      {
        partnerId: partner.id,
        status: partner.status,
        reapplied,
        unreadReapplyCount: partner.unreadReapplyCount,
        countries: input.snapshot.countryIso2s,
        storedLocally: true,
        message: reapplied
          ? "Your previous application was updated. An administrator will review the new request shortly."
          : "Application received. An administrator will review it shortly.",
      },
      { status: reapplied ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "An application with this email is already in progress.", code: "EMAIL_EXISTS" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "An application with this email is already registered.", code: "EMAIL_EXISTS" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "PHONE_EXISTS") {
      return NextResponse.json(
        { error: "A partner with this phone number is already registered.", code: "PHONE_EXISTS" },
        { status: 409 },
      );
    }
    throw error;
  }
}

/** Public partner application. The email and password become the cabinet login after approval. */
export async function POST(req: Request) {
  try {
    const body = applicationSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const countryIso2s = [...new Set(body.countryIso2s.map((c) => c.toUpperCase()))];
    const messengers = [...new Set(body.messengers)];
    const phone = formatInternationalPhone(body.phoneCountryIso2, body.phone);
    const secondaryPhone = body.secondaryPhone
      ? formatInternationalPhone(body.secondaryPhoneCountryIso2 || body.phoneCountryIso2, body.secondaryPhone)
      : "";
    if (!phone) {
      return NextResponse.json({ error: "A phone number with country code is required" }, { status: 400 });
    }

    try {
      const { isPartnerContactBanned, formatPartnerBanWarning } = await import(
        "@/lib/server/partner-bans-store"
      );
      const ban = await isPartnerContactBanned({ email, phone });
      if (ban) {
        return NextResponse.json(
          {
            error: formatPartnerBanWarning(ban, "en"),
            banned: true,
            ban,
          },
          { status: 403 },
        );
      }
    } catch {
      /* optional */
    }

    const countryError = await assertAllowedOperatingCountries(countryIso2s);
    if (countryError) {
      return NextResponse.json({ error: countryError }, { status: 400 });
    }
    const contactName = `${body.firstName.trim()} ${body.lastName.trim()}`.trim();
    const snapshot: PartnerApplicationMessageSnapshot = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      kind: body.kind,
      identificationNumber: body.identificationNumber.trim(),
      email,
      phone,
      phoneCountryIso2: body.phoneCountryIso2.toUpperCase(),
      messengers,
      fleetSize: body.fleetSize,
      fleetAgeRange: body.fleetAgeRange,
      countryIso2s,
    };
    const filePayload = {
      snapshot,
      contactName,
      secondaryPhone: secondaryPhone || null,
      secondaryPhoneCountryIso2: body.secondaryPhoneCountryIso2?.toUpperCase() || null,
      password: body.password,
    };

    try {
      const windowStart = partnerReapplyWindowStart();
      const reopenCandidate = await prisma.partner.findFirst({
        where: {
          status: { in: ["PENDING", "REJECTED"] },
          updatedAt: { gte: windowStart },
          OR: [{ email }, { phone }, ...(secondaryPhone ? [{ phone: secondaryPhone }] : [])],
        },
        orderBy: { updatedAt: "desc" },
      });

      const { findPartnerContactConflict } = await import(
        "@/lib/server/assert-partner-contact-unique"
      );
      const conflict = await findPartnerContactConflict({
        email,
        phone,
        secondaryPhone,
        excludePartnerId: reopenCandidate?.id,
      });
      if (conflict) {
        return NextResponse.json(
          { error: conflict.error, code: conflict.code },
          { status: 409 },
        );
      }

      if (reopenCandidate) {
        const messages = parsePartnerApplicationMessages(
          (reopenCandidate as { applicationMessages?: unknown }).applicationMessages,
        );
        if (!messages.some((m) => m.kind === "INITIAL")) {
          messages.unshift(
            buildPartnerApplicationMessage(
              "INITIAL",
              {
                firstName:
                  reopenCandidate.representativeFirstName ||
                  reopenCandidate.contactName.split(/\s+/)[0] ||
                  "",
                lastName:
                  reopenCandidate.representativeLastName ||
                  reopenCandidate.contactName.split(/\s+/).slice(1).join(" ") ||
                  "",
                kind: reopenCandidate.kind === "PRIVATE" ? "PRIVATE" : "COMPANY",
                identificationNumber: reopenCandidate.personalId || "",
                email: reopenCandidate.email,
                phone: reopenCandidate.phone,
                phoneCountryIso2: reopenCandidate.phoneCountryIso2 || "GE",
                messengers: Array.isArray(reopenCandidate.messengers)
                  ? (reopenCandidate.messengers as string[])
                  : [],
                fleetSize: reopenCandidate.fleetSize,
                fleetAgeRange: reopenCandidate.fleetAgeRange,
                countryIso2s: Array.isArray(reopenCandidate.operatingCountryIso2s)
                  ? (reopenCandidate.operatingCountryIso2s as string[])
                  : [],
              },
              true,
            ),
          );
        }
        messages.push(buildPartnerApplicationMessage("REAPPLY", snapshot, false));
        const unreadReapplyCount = messages.filter((m) => m.kind === "REAPPLY" && !m.readByAdmin).length;

        const updated = await prisma.partner.update({
          where: { id: reopenCandidate.id },
          data: {
            kind: body.kind,
            contactName,
            companyName: body.kind === "COMPANY" ? contactName : `${contactName} (Private)`,
            personalId: body.identificationNumber.trim(),
            email,
            phone,
            phoneCountryIso2: body.phoneCountryIso2.toUpperCase(),
            secondaryPhone: secondaryPhone || null,
            secondaryPhoneCountryIso2: body.secondaryPhoneCountryIso2?.toUpperCase() || null,
            messenger: asMessenger(messengers[0]),
            messengers,
            fleetSize: body.fleetSize,
            fleetAgeRange: body.fleetAgeRange as "AGE_0_5" | "AGE_6_9" | "AGE_10_PLUS",
            representativeFirstName: body.firstName.trim(),
            representativeLastName: body.lastName.trim(),
            operatingCountryIso2s: countryIso2s,
            applicationMessages: messages,
            unreadReapplyCount,
          },
        });

        try {
          const airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
          if (airportIatas.length) await setPartnerAirports(updated.id, airportIatas);
        } catch (locError) {
          console.warn("[partners] could not attach airports yet:", locError);
        }

        await rememberPartnerPassword(updated.id, email, body.password);

        return NextResponse.json(
          {
            partnerId: updated.id,
            status: updated.status,
            reapplied: true,
            unreadReapplyCount,
            countries: countryIso2s,
            message:
              "Your previous application was updated. An administrator will review the new request shortly.",
          },
          { status: 200 },
        );
      }

      const initialMessage = buildPartnerApplicationMessage("INITIAL", snapshot, true);
      const sequentialNumber = await nextPartnerSequentialNumber();
      const partner = await prisma.partner.create({
        data: {
          kind: body.kind,
          contactName,
          companyName: body.kind === "COMPANY" ? contactName : `${contactName} (Private)`,
          personalId: body.identificationNumber,
          email,
          phone,
          phoneCountryIso2: body.phoneCountryIso2.toUpperCase(),
          secondaryPhone: secondaryPhone || null,
          secondaryPhoneCountryIso2: body.secondaryPhoneCountryIso2?.toUpperCase() || null,
          messenger: asMessenger(messengers[0]),
          messengers,
          fleetSize: body.fleetSize,
          fleetAgeRange: body.fleetAgeRange as "AGE_0_5" | "AGE_6_9" | "AGE_10_PLUS",
          status: "PENDING",
          representativeFirstName: body.firstName.trim(),
          representativeLastName: body.lastName.trim(),
          operatingCountryIso2s: countryIso2s,
          applicationMessages: [initialMessage],
          unreadReapplyCount: 0,
          sequentialNumber,
        },
      });

      try {
        const airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
        if (airportIatas.length) await setPartnerAirports(partner.id, airportIatas);
      } catch (locError) {
        console.warn("[partners] could not attach airports yet:", locError);
      }

      await rememberPartnerPassword(partner.id, email, body.password);

      return NextResponse.json(
        {
          partnerId: partner.id,
          status: partner.status,
          countries: countryIso2s,
          message: "Application received. An administrator will review it shortly.",
        },
        { status: 201 },
      );
    } catch (dbError) {
      if (isDbOfflineError(dbError)) {
        console.warn("[partners application POST] DB offline — using file store");
        return saveViaFile(filePayload);
      }
      // Columns may be missing before prisma db push — retry without new fields, else file.
      const msg = dbError instanceof Error ? dbError.message : "";
      if (/applicationMessages|unreadReapplyCount|Unknown arg|column/i.test(msg)) {
        try {
          const sequentialNumber = await nextPartnerSequentialNumber();
          const partner = await prisma.partner.create({
            data: {
              kind: body.kind,
              contactName,
              companyName: body.kind === "COMPANY" ? contactName : `${contactName} (Private)`,
              personalId: body.identificationNumber,
              email,
              phone,
              phoneCountryIso2: body.phoneCountryIso2.toUpperCase(),
              secondaryPhone: secondaryPhone || null,
              secondaryPhoneCountryIso2: body.secondaryPhoneCountryIso2?.toUpperCase() || null,
              messenger: asMessenger(messengers[0]),
              messengers,
              fleetSize: body.fleetSize,
              fleetAgeRange: body.fleetAgeRange as "AGE_0_5" | "AGE_6_9" | "AGE_10_PLUS",
              status: "PENDING",
              representativeFirstName: body.firstName.trim(),
              representativeLastName: body.lastName.trim(),
              operatingCountryIso2s: countryIso2s,
              sequentialNumber,
            },
          });
          await rememberPartnerPassword(partner.id, email, body.password);
          return NextResponse.json(
            {
              partnerId: partner.id,
              status: partner.status,
              countries: countryIso2s,
              message: "Application received. An administrator will review it shortly.",
            },
            { status: 201 },
          );
        } catch (retryError) {
          if (isDbOfflineError(retryError)) return saveViaFile(filePayload);
          console.error("[partners application POST retry]", retryError);
          return saveViaFile(filePayload);
        }
      }
      console.error("[partners application POST]", dbError);
      return saveViaFile(filePayload);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid application" },
        { status: 400 },
      );
    }
    console.error("[partners application POST]", error);
    return NextResponse.json(
      {
        error: isDbOfflineError(error)
          ? "Database is offline. Start Postgres (npm run db:up) and try again."
          : "Failed to submit application. Please try again.",
      },
      { status: 500 },
    );
  }
}
