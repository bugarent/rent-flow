import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  createExtraService,
  listExtraServices,
} from "@/lib/server/extras-store";
import { isDbOfflineError } from "@/lib/server/db-errors";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const checkoutSlotSchema = z.enum(["none", "tpl", "basic", "full", "accident", "theft", "driver"]);

const upsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  minPriceEur: z.number().min(0).nullable().optional(),
  maxPriceEur: z.number().min(0).nullable().optional(),
  maxPeriodEur: z.number().min(0).nullable().optional(),
  defaultPriceEur: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  checkoutSlot: checkoutSlotSchema.optional(),
});

function normalizeBounds(min: number | null | undefined, max: number | null | undefined) {
  const hasMin = min != null && Number.isFinite(min);
  const hasMax = max != null && Number.isFinite(max);
  if (!hasMin && !hasMax) return { minPriceEur: null, maxPriceEur: null };
  const minPriceEur = hasMin ? Number(min) : 0;
  const maxPriceEur = hasMax ? Number(max) : minPriceEur;
  if (maxPriceEur < minPriceEur) {
    throw new Error("Maximum daily price must be >= minimum daily price");
  }
  return { minPriceEur, maxPriceEur };
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const rows = await listExtraServices();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[admin/extras GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load extras" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = upsertSchema.parse(await req.json());
    const bounds = normalizeBounds(body.minPriceEur, body.maxPriceEur);
    const period = body.maxPeriodEur;
    const maxPeriodEur =
      period != null && Number.isFinite(period) && period >= 0 ? period : null;
    const row = await createExtraService({
      name: body.name,
      description: body.description,
      minPriceEur: bounds.minPriceEur,
      maxPriceEur: bounds.maxPriceEur,
      maxPeriodEur,
      defaultPriceEur: bounds.maxPriceEur != null && bounds.maxPriceEur <= 0 ? 0 : (body.defaultPriceEur ?? bounds.minPriceEur ?? 0),
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 100,
      checkoutSlot: body.checkoutSlot,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid extra" }, { status: 400 });
    }
    console.error("[admin/extras POST]", error);
    const message = error instanceof Error ? error.message : "Could not create extra";
    const status = isDbOfflineError(error) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
