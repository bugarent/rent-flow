import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { deleteDeliveryLocation, updateDeliveryLocation } from "@/lib/server/delivery-locations";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const patchSchema = z.object({
  maxDeliveryPriceEur: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  individualBookingEnabled: z.boolean().optional(),
  maxFreeAfterDays: z.number().int().min(0).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const row = await updateDeliveryLocation(id, body);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[admin/delivery PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update delivery location" },
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
    await deleteDeliveryLocation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/delivery DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete delivery location" },
      { status: 500 },
    );
  }
}
