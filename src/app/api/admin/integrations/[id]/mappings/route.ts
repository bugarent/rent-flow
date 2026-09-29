import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { getIntegration, listMappings, saveMappings } from "@/lib/integrations/repository";

const mappingSchema = z.object({
  mappings: z.array(
    z.object({
      kind: z.enum(["VEHICLE", "LOCATION", "CATEGORY"]),
      externalId: z.string().min(1),
      externalLabel: z.string().optional(),
      internalId: z.string().min(1),
      meta: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  if (!(await getIntegration(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ mappings: await listMappings(id) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  if (!(await getIntegration(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = mappingSchema.parse(await req.json());
    const mappings = await saveMappings(id, body.mappings);
    return NextResponse.json({ mappings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save mappings" }, { status: 500 });
  }
}
