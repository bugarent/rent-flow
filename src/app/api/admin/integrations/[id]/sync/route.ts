import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/sessions";
import { pullAvailability, pullFleet } from "@/lib/integrations/sync-engine";

const schema = z.object({
  mode: z.enum(["fleet", "availability", "both"]).default("both"),
});

type Step = { ok: boolean; message: string };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    const mode = parsed.success ? parsed.data.mode : "both";
    const steps: { fleet?: Step; availability?: Step } = {};

    if (mode === "fleet" || mode === "both") steps.fleet = await pullFleet(id);
    if (mode === "availability" || mode === "both") steps.availability = await pullAvailability(id);

    const ok = (steps.fleet?.ok ?? true) && (steps.availability?.ok ?? true);
    const message = [
      steps.fleet ? `Fleet: ${steps.fleet.message}` : "",
      steps.availability ? `Availability: ${steps.availability.message}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return NextResponse.json({ ok, steps, message }, { status: ok ? 200 : 400 });
  } catch (error) {
    console.error("[admin/integrations sync]", error);
    return NextResponse.json({ ok: false, message: "Sync failed on the server" }, { status: 500 });
  }
}
