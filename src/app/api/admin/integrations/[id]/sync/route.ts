import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { pullAvailability, pullFleet } from "@/lib/integrations/sync-engine";

const schema = z.object({
  mode: z.enum(["fleet", "availability", "both"]).default("both"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const steps: Record<string, unknown> = {};

  if (body.mode === "fleet" || body.mode === "both") {
    steps.fleet = await pullFleet(id);
  }
  if (body.mode === "availability" || body.mode === "both") {
    steps.availability = await pullAvailability(id);
  }

  const ok =
    (steps.fleet ? (steps.fleet as { ok: boolean }).ok : true) &&
    (steps.availability ? (steps.availability as { ok: boolean }).ok : true);

  return NextResponse.json({ ok, steps }, { status: ok ? 200 : 400 });
}
