import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { toPublicBusinessPartner } from "@/lib/catalog/business-partners";
import { listBusinessPartnerBalanceLines } from "@/lib/server/business-partners-store";

/** Unpaid booking earnings still on the partner balance. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const result = await listBusinessPartnerBalanceLines(id);
    return NextResponse.json({
      ...result,
      partner: toPublicBusinessPartner(result.partner),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    console.error("[admin business-partners earnings]", error);
    return NextResponse.json({ error: "Failed to load earnings" }, { status: 500 });
  }
}
