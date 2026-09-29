import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";
import { toAdminBusinessPartner } from "@/lib/catalog/business-partners";
import {
  adminSetBusinessPartnerPassword,
  deleteBusinessPartner,
  getBusinessPartnerById,
  updateBusinessPartnerStatus,
} from "@/lib/server/business-partners-store";

const patchSchema = z
  .object({
    status: z.enum(["ACTIVE", "PENDING", "DISABLED", "REJECTED"]).optional(),
    countryIso2: z.string().trim().max(2).optional(),
    password: z.string().min(6).max(128).optional(),
  })
  .refine((d) => d.status !== undefined || d.password !== undefined, {
    message: "Nothing to update",
  })
  .refine((d) => d.password === undefined || isValidBusinessPartnerPassword(d.password), {
    message: "Weak password",
    path: ["password"],
  });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    if (body.password) {
      await adminSetBusinessPartnerPassword(id, body.password);
    }
    const partner = body.status
      ? await updateBusinessPartnerStatus(id, body.status, body.countryIso2)
      : await getBusinessPartnerById(id);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    return NextResponse.json({ partner: toAdminBusinessPartner(partner), ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", code: "WEAK_PASSWORD" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "WEAK_PASSWORD") {
      return NextResponse.json({ error: "Weak password", code: "WEAK_PASSWORD" }, { status: 400 });
    }
    console.error("[admin business-partners PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await deleteBusinessPartner(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    console.error("[admin business-partners DELETE]", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
