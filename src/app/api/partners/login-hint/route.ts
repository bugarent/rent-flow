import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeLogin } from "@/lib/crypto";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: normalizeLogin(email) },
      include: { partner: true },
    });
    if (!user?.partner) {
      const partner = await prisma.partner.findFirst({
        where: { email: normalizeLogin(email) },
        orderBy: { updatedAt: "desc" },
      });
      if (!partner) return NextResponse.json({ reason: "unknown" });
      if (["PENDING", "INVITED", "PENDING_FINAL", "NEEDS_CORRECTION"].includes(partner.status)) {
        return NextResponse.json({ reason: "pending_approval" });
      }
      if (partner.status === "REJECTED" || partner.status === "SUSPENDED") {
        return NextResponse.json({ reason: "rejected" });
      }
      return NextResponse.json({ reason: "unknown" });
    }
    if (user.status === "PENDING_OTP") {
      return NextResponse.json({ reason: "phone_verify", userId: user.id });
    }
    if (user.partner.status === "PENDING_REMODERATION") {
      // Allowed to sign in — do not treat as blocked pending approval.
      return NextResponse.json({ reason: "unknown" });
    }
    if (
      user.status === "PENDING_APPROVAL" ||
      ["PENDING", "INVITED", "PENDING_FINAL", "NEEDS_CORRECTION"].includes(user.partner.status)
    ) {
      return NextResponse.json({ reason: "pending_approval" });
    }
    if (user.partner.status === "REJECTED" || user.partner.status === "SUSPENDED") {
      return NextResponse.json({ reason: "rejected" });
    }
    return NextResponse.json({ reason: "unknown" });
  } catch {
    return NextResponse.json({ reason: "unknown" });
  }
}
