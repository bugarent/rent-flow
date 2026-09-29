import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { toPublicBusinessPartner } from "@/lib/catalog/business-partners";
import { recordBusinessPartnerTransfer } from "@/lib/server/business-partners-store";

const bodySchema = z.object({
  amountUsd: z.number().positive().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const raw = await req.json().catch(() => ({}));
    const body = bodySchema.parse(raw);
    const result = await recordBusinessPartnerTransfer(id, body.amountUsd, body.note);
    return NextResponse.json({
      ...result,
      partner: toPublicBusinessPartner(result.partner),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
      if (error.message === "NOTHING_DUE") {
        return NextResponse.json({ error: "No unpaid balance" }, { status: 400 });
      }
      if (error.message === "INVALID_AMOUNT") {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
    }
    console.error("[admin business-partners transfer]", error);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
