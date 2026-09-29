import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashSecret } from "@/lib/crypto";
import { OTP_TTL_MINUTES } from "@/lib/brand";
import { nextCustomerNumber } from "@/lib/sequential-ids";
import { DIAL_CODES, formatInternationalPhone, nationalDigits } from "@/lib/catalog/dial-codes";
import { createLocalCustomer, findLocalCustomerByEmail } from "@/lib/auth/local-customer-store";
import { isDbOfflineError } from "@/lib/server/db-errors";

const socialValues = ["WHATSAPP", "VIBER", "TELEGRAM"] as const;

const registerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  phoneCountryIso2: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .refine((iso2) => Boolean(DIAL_CODES[iso2]), "Invalid country code"),
  email: z.string().email(),
  messengers: z.array(z.enum(socialValues)).min(1),
  password: z.string().min(8),
  locale: z.enum(["en", "ka", "ru", "fr", "de", "pl", "ar"]).optional(),
});

async function createDbCustomer(input: {
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
  messengers: Array<(typeof socialValues)[number]>;
  password: string;
  locale?: string;
  code: string;
}) {
  const customerNumber = await nextCustomerNumber();
  const base = {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    countryOfResidence: input.phoneCountryIso2,
    email: input.email,
    preferredMessenger: input.messengers[0],
    passwordHash: hashSecret(input.password),
    locale: (input.locale ?? "en") as "en" | "ka" | "ru" | "fr" | "de" | "pl" | "ar",
    status: "PENDING_OTP" as const,
    role: "CUSTOMER" as const,
    customerNumber,
  };

  let user;
  try {
    user = await prisma.user.create({
      data: { ...base, messengers: input.messengers },
    });
  } catch (error) {
    // Column may not exist until migration — still register the customer.
    if (!(error instanceof Error) || !/messengers|Unknown arg|column/i.test(error.message)) {
      throw error;
    }
    user = await prisma.user.create({ data: base });
  }

  await prisma.otpChallenge.create({
    data: {
      userId: user.id,
      codeHash: hashSecret(input.code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  return user;
}

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const messengers = [...new Set(body.messengers)];
    const phoneCountryIso2 = body.phoneCountryIso2;
    const phone =
      formatInternationalPhone(phoneCountryIso2, nationalDigits(body.phone)) || body.phone.trim();
    const code = generateOtp();

    try {
      const { isCustomerContactBanned } = await import("@/lib/server/customer-bans-store");
      const ban = await isCustomerContactBanned({ email, phone });
      if (ban) {
        return NextResponse.json(
          { error: "This email or phone number is blocked from registration." },
          { status: 403 },
        );
      }
    } catch {
      /* ban store optional */
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      const user = await createDbCustomer({
        firstName: body.firstName,
        lastName: body.lastName,
        phone,
        phoneCountryIso2,
        email,
        messengers,
        password: body.password,
        locale: body.locale,
        code,
      });

      return NextResponse.json({
        userId: user.id,
        customerNumber: user.customerNumber,
        otpPreview: process.env.NODE_ENV !== "production" ? code : undefined,
      });
    } catch (dbError) {
      console.error("[auth/register] db", dbError);
      if (dbError && typeof dbError === "object" && "code" in dbError && (dbError as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      const canUseLocal =
        isDbOfflineError(dbError) ||
        (dbError instanceof Error && /messengers|Unknown arg|column|IdSequence|sequential/i.test(dbError.message));

      if (!canUseLocal) {
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
      }

      if (findLocalCustomerByEmail(email)) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      const local = createLocalCustomer({
        firstName: body.firstName,
        lastName: body.lastName,
        email,
        phone,
        countryOfResidence: phoneCountryIso2,
        messengers,
        password: body.password,
        locale: body.locale,
        otpCode: code,
      });

      return NextResponse.json({
        userId: local.id,
        customerNumber: local.customerNumber,
        otpPreview: process.env.NODE_ENV !== "production" ? code : undefined,
        local: true,
      });
    }
  } catch (error) {
    console.error("[auth/register]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid registration data" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
