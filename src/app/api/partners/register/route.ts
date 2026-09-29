import type { Messenger } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  FLEET_AGE_RANGES,
  isStrongPartnerPassword,
  PARTNER_INVITE_TTL_DAYS,
  PARTNER_SOCIAL_PLATFORMS,
  parseIso2List,
  parsePartnerMessengers,
} from "@/lib/partner";
import { PARTNER_REGISTER } from "@/lib/routes";
import { setPartnerAirports } from "@/lib/server/partner-airports";
import { airportsForCountries } from "@/lib/catalog/operating-regions";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { assertAllowedOperatingCountries } from "@/lib/server/partner-operating-countries";

function asMessenger(value: string | undefined): Messenger {
  if (value === "VIBER" || value === "TELEGRAM") return value;
  return "WHATSAPP";
}

const fleetAgeValues = FLEET_AGE_RANGES.map((r) => r.value) as [string, ...string[]];
const socialValues = PARTNER_SOCIAL_PLATFORMS.map((p) => p.value) as [string, ...string[]];

const registerSchema = z
  .object({
    token: z.string().min(10),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    kind: z.enum(["COMPANY", "PRIVATE"]),
    identificationNumber: z.string().trim().min(5).max(40),
    fleetSize: z.number().int().min(1).max(10000),
    fleetAgeRange: z.enum(fleetAgeValues).optional(),
    phone: z.string().trim().min(8).max(40),
    phoneCountryIso2: z.string().length(2),
    messengers: z.array(z.enum(socialValues)).min(1),
    secondaryPhone: z.string().trim().min(8).max(40),
    secondaryPhoneCountryIso2: z.string().length(2),
    logoUrl: z.string().trim().min(1).max(2000),
    countryIso2s: z.array(z.string().length(2)).min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => isStrongPartnerPassword(v.password), {
    message: "Password must be at least 6 characters and include uppercase, lowercase, and a number",
    path: ["password"],
  });

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invite token required" }, { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: {
        inviteToken: token,
        status: { in: ["INVITED", "NEEDS_CORRECTION"] },
      },
    });
    if (!partner) {
      return NextResponse.json({ error: "Invalid or expired registration link" }, { status: 404 });
    }
    if (partner.inviteTokenExpiresAt && partner.inviteTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This registration link has expired" }, { status: 410 });
    }

    const storedCountries = parseIso2List(partner.operatingCountryIso2s);
    let airports: Awaited<ReturnType<typeof import("@/lib/server/partner-airports").getPartnerOperatingAirports>> = [];
    try {
      const { getPartnerOperatingAirports } = await import("@/lib/server/partner-airports");
      airports = await getPartnerOperatingAirports(partner.id);
    } catch {
      airports = [];
    }
    const countryIso2s = storedCountries.length
      ? storedCountries
      : [...new Set(airports.map((a) => a.countryIso2))];
    const messengers = parsePartnerMessengers(partner.messengers, partner.messenger);

    return NextResponse.json({
      partnerId: partner.id,
      email: partner.email,
      firstName: partner.representativeFirstName ?? partner.contactName.split(/\s+/)[0] ?? "",
      lastName:
        partner.representativeLastName ??
        partner.contactName.split(/\s+/).slice(1).join(" ") ??
        "",
      contactName: partner.contactName,
      kind: partner.kind,
      identificationNumber: partner.personalId,
      fleetSize: partner.fleetSize,
      fleetAgeRange: partner.fleetAgeRange,
      phone: partner.phone,
      phoneCountryIso2: partner.phoneCountryIso2,
      messenger: messengers[0] ?? partner.messenger,
      messengers,
      secondaryPhone: partner.secondaryPhone ?? "",
      secondaryPhoneCountryIso2: partner.secondaryPhoneCountryIso2 ?? "",
      logoUrl: partner.logoUrl ?? "",
      status: partner.status,
      feedbackNote: partner.status === "NEEDS_CORRECTION" ? partner.rejectionNote : null,
      countryIso2s,
    });
  } catch (error) {
    console.error("[partners/register GET]", error);
    return NextResponse.json({ error: "Could not load invite" }, { status: 500 });
  }
}

/** Step 2 — complete registration from invite token. */
export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const messengers = [...new Set(body.messengers)];
    const countryIso2s = [...new Set(body.countryIso2s.map((c) => c.toUpperCase()))];
    const contactName = `${body.firstName.trim()} ${body.lastName.trim()}`.trim();
    const phone = formatInternationalPhone(body.phoneCountryIso2, body.phone);
    const secondaryPhone = formatInternationalPhone(body.secondaryPhoneCountryIso2, body.secondaryPhone);
    if (!phone || !secondaryPhone) {
      return NextResponse.json(
        { error: "Primary and secondary phone numbers with country codes are required" },
        { status: 400 },
      );
    }
    const countryError = await assertAllowedOperatingCountries(countryIso2s);
    if (countryError) {
      return NextResponse.json({ error: countryError }, { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: {
        inviteToken: body.token,
        status: { in: ["INVITED", "NEEDS_CORRECTION"] },
      },
    });
    if (!partner) {
      return NextResponse.json({ error: "Invalid or expired registration link" }, { status: 404 });
    }
    if (partner.inviteTokenExpiresAt && partner.inviteTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This registration link has expired" }, { status: 410 });
    }
    if (partner.email.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Email must match the address used in your application" },
        { status: 400 },
      );
    }

    const firstName = body.firstName.trim();
    const lastName = body.lastName.trim();
    const passwordHash = hashSecret(body.password);
    try {
      const { setPartnerCredentials } = await import("@/lib/server/partner-credentials-store");
      await setPartnerCredentials(partner.id, email, body.password);
    } catch {
      /* admin-visible credentials are best-effort */
    }

    const result = await prisma.$transaction(async (tx) => {
      let userId = partner.userId;
      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            email,
            phone,
            preferredMessenger: asMessenger(messengers[0]),
            passwordHash,
            role: "VENDOR",
            status: "PENDING_APPROVAL",
            firstName,
            lastName,
          },
        });
      } else {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          throw new Error("EMAIL_TAKEN");
        }
        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            phone,
            countryOfResidence: body.phoneCountryIso2.toUpperCase(),
            preferredMessenger: asMessenger(messengers[0]),
            passwordHash,
            role: "VENDOR",
            status: "PENDING_APPROVAL",
          },
        });
        userId = user.id;
      }

      const updated = await tx.partner.update({
        where: { id: partner.id },
        data: {
          userId,
          kind: body.kind,
          personalId: body.identificationNumber,
          contactName,
          companyName:
            body.kind === "COMPANY" ? contactName : `${contactName} (Private)`,
          phone,
          phoneCountryIso2: body.phoneCountryIso2.toUpperCase(),
          secondaryPhone,
          secondaryPhoneCountryIso2: body.secondaryPhoneCountryIso2.toUpperCase(),
          messenger: asMessenger(messengers[0]),
          messengers,
          fleetSize: body.fleetSize,
          fleetAgeRange: (body.fleetAgeRange ?? partner.fleetAgeRange) as
            | "AGE_0_5"
            | "AGE_6_9"
            | "AGE_10_PLUS",
          logoUrl: body.logoUrl.trim(),
          status: "PENDING_FINAL",
          registrationSubmittedAt: new Date(),
          rejectionNote: null,
          representativeFirstName: firstName,
          representativeLastName: lastName,
          operatingCountryIso2s: countryIso2s,
          // keep invite token so they can reopen for corrections if needed later
          inviteTokenExpiresAt: new Date(
            Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });

      return updated;
    });

    try {
      const airportIatas = airportsForCountries(countryIso2s).map((a) => a.iata);
      if (airportIatas.length) await setPartnerAirports(result.id, airportIatas);
    } catch (locError) {
      console.warn("[partners/register] airports:", locError);
    }

    return NextResponse.json({
      partnerId: result.id,
      status: result.status,
      message: "Registration submitted for final admin review.",
      next: PARTNER_REGISTER,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid registration" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }
    console.error("[partners/register POST]", error);
    return NextResponse.json({ error: "Failed to complete registration" }, { status: 500 });
  }
}
