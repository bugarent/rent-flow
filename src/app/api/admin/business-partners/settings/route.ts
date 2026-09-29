import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getBusinessPartnerSettings,
  saveBusinessPartnerSettings,
} from "@/lib/server/business-partners-store";
import { normalizeBusinessPartnerPayoutTiers } from "@/lib/business-partner/payout-tiers";

const payoutTiersSchema = z.object({
  lowMaxBookings: z.number().int().min(1).max(10_000),
  lowPercent: z.number().int().min(1).max(100),
  midMaxBookings: z.number().int().min(1).max(10_000),
  midPercent: z.number().int().min(1).max(100),
  highPercent: z.number().int().min(1).max(100),
});

const putSchema = z.object({
  countryIso2s: z.array(z.string().trim().min(2).max(2)).min(1).max(40).optional(),
  notificationEmail: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
  adminPaypalEmail: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
  payoutTiers: payoutTiersSchema.optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const settings = await getBusinessPartnerSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = putSchema.parse(await req.json());
    if (
      body.countryIso2s === undefined &&
      body.notificationEmail === undefined &&
      body.adminPaypalEmail === undefined &&
      body.payoutTiers === undefined
    ) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }
    const settings = await saveBusinessPartnerSettings({
      ...(body.countryIso2s
        ? { countryIso2s: body.countryIso2s.map((c) => c.toUpperCase()) }
        : {}),
      ...(body.notificationEmail !== undefined
        ? { notificationEmail: body.notificationEmail }
        : {}),
      ...(body.adminPaypalEmail !== undefined
        ? { adminPaypalEmail: body.adminPaypalEmail }
        : {}),
      ...(body.payoutTiers
        ? { payoutTiers: normalizeBusinessPartnerPayoutTiers(body.payoutTiers) }
        : {}),
    });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }
    console.error("[admin business-partners settings PUT]", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
