import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findBusinessPartnerForLogin,
  updateBusinessPartnerProfile,
} from "@/lib/server/business-partners-store";
import {
  clearBusinessPartnerSession,
  getBusinessPartnerSession,
  partnerCabinetPayload,
  setBusinessPartnerSession,
} from "@/lib/server/business-partner-session";

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(128),
});

const profileSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  category: z.string().min(1).max(80),
  website: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  personalId: z.string().min(1).max(40),
  payoutMethod: z.enum(["BANK", "PAYPAL"]),
  payoutAccount: z.string().max(80).optional(),
  payoutSwift: z.string().max(20).optional(),
  paypalAccount: z.string().max(160).optional(),
  messengers: z.array(z.string().min(1).max(40)).min(1).max(8),
});

function originFromRequest(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

/** Business-partner cabinet session. */
export async function GET(req: Request) {
  const partner = await getBusinessPartnerSession();
  if (!partner) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json(await partnerCabinetPayload(partner, originFromRequest(req)));
}

/** Log in with email + password (only ACTIVE after admin moderation). */
export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const partner = await findBusinessPartnerForLogin(body.email, body.password);
    if (!partner) {
      return NextResponse.json(
        { error: "Email or password is incorrect.", code: "INVALID" },
        { status: 401 },
      );
    }
    if (partner.status === "PENDING") {
      return NextResponse.json(
        { error: "Your application is still awaiting approval.", code: "PENDING" },
        { status: 403 },
      );
    }
    if (partner.status === "REJECTED") {
      return NextResponse.json(
        { error: "This application was rejected.", code: "REJECTED" },
        { status: 403 },
      );
    }
    if (partner.status !== "ACTIVE" && partner.status !== "DISABLED") {
      return NextResponse.json({ error: "Access denied.", code: "DENIED" }, { status: 403 });
    }

    await setBusinessPartnerSession(partner.id);
    return NextResponse.json({
      ok: true,
      ...(await partnerCabinetPayload(partner, originFromRequest(req))),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login data" }, { status: 400 });
    }
    console.error("[business-partners session POST]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

/** Update own profile from the cabinet. */
export async function PATCH(req: Request) {
  const sessionPartner = await getBusinessPartnerSession();
  if (!sessionPartner) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const body = profileSchema.parse(await req.json());
    const partner = await updateBusinessPartnerProfile(sessionPartner.id, {
      fullName: body.fullName,
      phone: body.phone,
      category: body.category,
      website: body.website ?? "",
      notes: body.notes ?? "",
      personalId: body.personalId,
      payoutMethod: body.payoutMethod,
      payoutAccount: body.payoutAccount ?? "",
      payoutSwift: body.payoutSwift ?? "",
      paypalAccount: body.paypalAccount ?? "",
      messengers: body.messengers,
    });
    return NextResponse.json({
      ok: true,
      ...(await partnerCabinetPayload(partner, originFromRequest(req))),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }
    if (error instanceof Error) {
      const map: Record<string, string> = {
        MISSING_FIELDS: "Missing required fields",
        MESSENGERS_REQUIRED: "Select at least one messenger",
        INVALID_IBAN: "Enter a valid IBAN",
        INVALID_SWIFT: "Enter a valid SWIFT / BIC code",
        INVALID_PAYPAL: "Enter a valid PayPal email",
        PAYOUT_REQUIRED: "Provide a valid bank account or PayPal email",
      };
      if (map[error.message]) {
        return NextResponse.json({ error: map[error.message], code: error.message }, { status: 400 });
      }
    }
    console.error("[business-partners session PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** Log out. */
export async function DELETE() {
  await clearBusinessPartnerSession();
  return NextResponse.json({ ok: true });
}
