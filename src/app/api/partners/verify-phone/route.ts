import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/crypto";

const schema = z.object({
  userId: z.string().min(1),
  code: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  try {
    const { userId, code } = schema.parse(await req.json());

    const challenge = await prisma.otpChallenge.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code expired. Please register again." }, { status: 400 });
    }

    if (challenge.attempts >= 5) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const ok = verifySecret(code, challenge.codeHash);
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 }, consumedAt: ok ? new Date() : null },
    });

    if (!ok) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { status: "PENDING_APPROVAL" },
      }),
      prisma.partner.update({
        where: { userId },
        data: { phoneVerifiedAt: new Date(), status: "PENDING" },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
