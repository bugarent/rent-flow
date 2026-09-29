import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createBusinessPartner,
  isReferralCodeTaken,
} from "@/lib/server/business-partners-store";
import {
  buildReferralAbsoluteUrl,
  isValidReferralCode,
  normalizeReferralCode,
} from "@/lib/business-partner/codes";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";

const applySchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().email().max(160),
    phone: z.string().trim().min(5).max(40),
    messengers: z
      .array(z.enum(["WHATSAPP", "VIBER", "TELEGRAM"]))
      .min(1)
      .max(3),
    category: z.string().trim().min(1).max(80),
    website: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    referralCode: z.string().trim().max(32).optional().or(z.literal("")),
    password: z.string().min(6).max(128),
    passwordConfirm: z.string().min(6).max(128),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  })
  .refine((d) => isValidBusinessPartnerPassword(d.password), {
    message: "Weak password",
    path: ["password"],
  });

function originFromRequest(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

/** Public business-partner (affiliate) application — always starts PENDING. */
export async function POST(req: Request) {
  try {
    const body = applySchema.parse(await req.json());
    const desired = normalizeReferralCode(body.referralCode || "");
    if (desired && !isValidReferralCode(desired)) {
      return NextResponse.json(
        {
          error:
            "Referral code must be 2–32 characters: letters, numbers, hyphen or underscore.",
          code: "INVALID_CODE",
        },
        { status: 400 },
      );
    }

    const partner = await createBusinessPartner({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      messengers: body.messengers,
      category: body.category,
      website: body.website || "",
      notes: body.notes || "",
      referralCode: desired || undefined,
      password: body.password,
    });

    const referralUrl = buildReferralAbsoluteUrl(originFromRequest(req), partner.referralCode);

    return NextResponse.json(
      {
        partnerId: partner.id,
        referralCode: partner.referralCode,
        referralUrl,
        status: partner.status,
        message:
          "Application received and awaiting admin approval. Your referral QR code is ready.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mismatch = error.issues.some((i) => i.path.includes("passwordConfirm"));
      const weak = error.issues.some((i) => i.path.includes("password"));
      if (mismatch) {
        return NextResponse.json(
          { error: "Passwords do not match.", code: "PASSWORD_MISMATCH" },
          { status: 400 },
        );
      }
      if (weak) {
        return NextResponse.json(
          {
            error:
              "Password may only use Latin letters and digits; min 6 characters with at least one letter and one digit.",
            code: "WEAK_PASSWORD",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Invalid application data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "CODE_TAKEN") {
        return NextResponse.json(
          { error: "This referral code is already taken. Choose another.", code: "CODE_TAKEN" },
          { status: 409 },
        );
      }
      if (error.message === "INVALID_CODE") {
        return NextResponse.json({ error: "Invalid referral code.", code: "INVALID_CODE" }, { status: 400 });
      }
      if (error.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          { error: "An application with this email already exists.", code: "EMAIL_EXISTS" },
          { status: 409 },
        );
      }
      if (error.message === "WEAK_PASSWORD") {
        return NextResponse.json(
          {
            error:
              "Password may only use Latin letters and digits; min 6 characters with at least one letter and one digit.",
            code: "WEAK_PASSWORD",
          },
          { status: 400 },
        );
      }
      if (error.message === "MESSENGERS_REQUIRED") {
        return NextResponse.json(
          { error: "Select at least one messenger.", code: "MESSENGERS_REQUIRED" },
          { status: 400 },
        );
      }
      if (error.message === "MISSING_FIELDS") {
        return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
      }
    }
    console.error("[business-partners POST]", error);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }
}

/** Check if a referral code is available. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("code") || "";
  const code = normalizeReferralCode(raw);
  if (!code) {
    return NextResponse.json({ available: true, empty: true });
  }
  if (!isValidReferralCode(code)) {
    return NextResponse.json({ available: false, reason: "INVALID_CODE", code });
  }
  const taken = await isReferralCodeTaken(code);
  return NextResponse.json({ available: !taken, code });
}
