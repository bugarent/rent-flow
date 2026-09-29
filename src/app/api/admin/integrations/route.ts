import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { generateIntegrationApiKey } from "@/lib/integrations/auth";
import { createIntegration, listIntegrations } from "@/lib/integrations/repository";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";

const createSchema = z.object({
  partnerId: z.string().min(1),
  name: z.string().min(1).max(120),
  webhookUrl: z.string().url().optional().nullable(),
  syncMode: z.enum(["PULL", "PUSH", "BOTH"]).optional(),
  isSandbox: z.boolean().optional(),
  pollIntervalMinutes: z.number().int().min(5).max(1440).optional(),
});

export async function GET() {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { items, source } = await listIntegrations();
  return NextResponse.json({ integrations: items, source });
}

export async function POST(req: Request) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const body = createSchema.parse(await req.json());
    let partnerName: string | undefined;
    try {
      const partner = await prisma.partner.findUnique({
        where: { id: body.partnerId },
        select: { id: true, companyName: true },
      });
      if (!partner && body.partnerId !== LOCAL_PARTNER_ID) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
      partnerName = partner?.companyName;
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
      const local = loadLocalPartner();
      if (body.partnerId !== LOCAL_PARTNER_ID && body.partnerId !== local?.id) {
        // Allow sandbox / offline partner ids
        partnerName = body.partnerId;
      } else {
        partnerName = local?.companyName || "Local partner";
      }
    }

    const key = generateIntegrationApiKey(body.isSandbox ? "test" : "live");
    const { item, source } = await createIntegration({
      partnerId: body.partnerId,
      partnerName,
      name: body.name,
      apiKeyHash: key.hash,
      apiKeyPrefix: key.prefix,
      webhookUrl: body.webhookUrl ?? null,
      syncMode: body.syncMode,
      isSandbox: body.isSandbox,
      pollIntervalMinutes: body.pollIntervalMinutes,
      status: body.isSandbox ? "TESTING" : "DRAFT",
    });

    return NextResponse.json(
      {
        integration: item,
        apiKey: key.fullKey,
        source,
        message: "API key shown once — store it securely.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("[admin/integrations POST]", error);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}
