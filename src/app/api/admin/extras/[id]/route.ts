import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { deleteExtraService, updateExtraService } from "@/lib/server/extras-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  minPriceEur: z.number().min(0).nullable().optional(),
  maxPriceEur: z.number().min(0).nullable().optional(),
  maxPeriodEur: z.number().min(0).nullable().optional(),
  defaultPriceEur: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isTpl: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  checkoutSlot: z.enum(["none", "tpl", "basic", "full", "driver"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    if (
      body.minPriceEur != null &&
      body.maxPriceEur != null &&
      body.maxPriceEur < body.minPriceEur
    ) {
      return NextResponse.json(
        { error: "Maximum daily price must be >= minimum daily price" },
        { status: 400 },
      );
    }

    const row = await updateExtraService(id, {
      name: body.name,
      description: body.description,
      minPriceEur: body.minPriceEur,
      maxPriceEur: body.maxPriceEur,
      maxPeriodEur:
        body.maxPeriodEur === undefined
          ? undefined
          : body.maxPeriodEur != null && Number.isFinite(body.maxPeriodEur) && body.maxPeriodEur >= 0
            ? body.maxPeriodEur
            : null,
      defaultPriceEur: body.defaultPriceEur,
      isActive: body.isActive,
      isTpl: body.isTpl,
      sortOrder: body.sortOrder,
      checkoutSlot: body.checkoutSlot,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid extra" }, { status: 400 });
    }
    console.error("[admin/extras PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update extra" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    const result = await deleteExtraService(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/extras DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete extra" },
      { status: 500 },
    );
  }
}
