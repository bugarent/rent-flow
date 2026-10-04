import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { hashSecret, normalizeLogin, verifySecret } from "@/lib/crypto";
import { loadLocalAdminAsync, revealAdminPassword, saveLocalAdminAsync } from "@/lib/auth/local-admin-store";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    email: z.string().trim().email().max(120).optional(),
    newPassword: z.string().min(5).max(128).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => data.email || data.newPassword, {
    message: "Enter a new login or a new password",
  })
  .refine((data) => !data.newPassword || data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
  });

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const local = await loadLocalAdminAsync();
    let passwordHash: string | null = null;
    let currentEmail = local?.email ?? session.user.email ?? "";

    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user) {
        passwordHash = user.passwordHash;
        currentEmail = user.email;
      }
    } catch {
      passwordHash = local?.passwordHash ?? null;
    }

    if (!passwordHash && local && (local.id === session.user.id || local.email === session.user.email)) {
      passwordHash = local.passwordHash;
      currentEmail = local.email;
    }

    if (!passwordHash || !verifySecret(body.currentPassword, passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const nextEmail = body.email ? normalizeLogin(body.email) : currentEmail;
    const nextHash = body.newPassword ? hashSecret(body.newPassword) : passwordHash;
    const passwordPlain = body.newPassword
      ? body.newPassword
      : revealAdminPassword(passwordHash, local?.passwordPlain);

    await saveLocalAdminAsync({
      email: nextEmail,
      passwordHash: nextHash,
      ...(passwordPlain ? { passwordPlain } : {}),
    });

    try {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: session.user.id }, { email: currentEmail }] },
      });
      if (user) {
        const taken = await prisma.user.findFirst({
          where: { email: nextEmail, NOT: { id: user.id } },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json({ error: "That login is already in use" }, { status: 400 });
        }
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: nextEmail,
            ...(body.newPassword ? { passwordHash: nextHash } : {}),
          },
          select: { email: true },
        });
        return NextResponse.json({ ok: true, email: updated.email });
      }
    } catch {
      // Local store already updated.
    }

    return NextResponse.json({ ok: true, email: nextEmail });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid account details" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not update credentials" }, { status: 500 });
  }
}
