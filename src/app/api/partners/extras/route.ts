import { NextResponse } from "next/server";
import { z } from "zod";
import { optionalPeriodMoney } from "@/lib/extras/pricing";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  createPartnerCustomExtra,
  listPartnerCustomExtrasAsPricing,
  partnerCustomToPricing,
} from "@/lib/server/partner-custom-extras-store";
import {
  readPartnerExtraPrefs,
  writePartnerExtraPrefs,
} from "@/lib/server/partner-extras-prefs-store";

async function resolvePartnerId(userId: string, email?: string | null): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner?.id) return partner.id;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const local = loadLocalPartner();
  if (userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)) {
    return LOCAL_PARTNER_ID;
  }
  return userId || LOCAL_PARTNER_ID;
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  priceEur: z.number().min(0).optional().default(0),
  maxPriceEur: z.number().min(0).nullable().optional(),
  minPeriodEur: z.number().min(0).nullable().optional(),
  maxPeriodEur: z.number().min(0).nullable().optional(),
  /** After create: offer to customers ("on") or mark forbidden. */
  mode: z.enum(["on", "forbidden"]).optional().default("on"),
  carIds: z.array(z.string().trim().min(1)).optional(),
});

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const items = await listPartnerCustomExtrasAsPricing(partnerId, { activeOnly: true });
    return NextResponse.json({ partnerId, items });
  } catch (error) {
    console.error("[partners/extras GET]", error);
    return NextResponse.json({ error: "Could not load custom extras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = createSchema.parse(await req.json());
    const row = await createPartnerCustomExtra(partnerId, {
      name: body.name,
      description: body.description,
      priceEur: body.priceEur,
      maxPriceEur: body.maxPriceEur,
    });

    const prefs = await readPartnerExtraPrefs(partnerId);
    const without = prefs.filter((p) => p.extraServiceId !== row.id);
    const forbidden = body.mode === "forbidden";
    without.push({
      extraServiceId: row.id,
      enabled: true,
      forbidden,
      priceEur: forbidden ? 0 : row.defaultPriceEur,
      minPeriodEur: forbidden ? null : optionalPeriodMoney(body.minPeriodEur),
      maxPeriodEur: forbidden ? null : optionalPeriodMoney(body.maxPeriodEur),
      ...(Array.isArray(body.carIds) ? { carIds: body.carIds.map(String).filter(Boolean) } : {}),
    });
    await writePartnerExtraPrefs(partnerId, without);

    return NextResponse.json(
      {
        service: partnerCustomToPricing(row),
        mode: body.mode,
        carIds: body.carIds || [],
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid extra" }, { status: 400 });
    }
    console.error("[partners/extras POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create extra" },
      { status: 500 },
    );
  }
}
