import { verifySecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  provisionLocalAdmin,
} from "@/lib/auth/local-admin-store";

const LEGACY_EMAILS = ["aaaaaaaaaa", "admin@rentairportcars.com", "aaaaa@gmail.com"];

export { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD };

export async function ensureTestAdmin() {
  const local = provisionLocalAdmin();
  const passwordHash = local.passwordHash;

  try {
    const current = await prisma.user.findUnique({ where: { email: TEST_ADMIN_EMAIL } });
    if (current) {
      const passwordOk = verifySecret(TEST_ADMIN_PASSWORD, current.passwordHash);
      const shouldResetPassword = !passwordOk && local.passwordPlain === TEST_ADMIN_PASSWORD;
      if (current.role !== "ADMIN" || current.status !== "ACTIVE" || shouldResetPassword) {
        await prisma.user.update({
          where: { id: current.id },
          data: {
            role: "ADMIN",
            status: "ACTIVE",
            emailVerifiedAt: current.emailVerifiedAt ?? new Date(),
            ...(shouldResetPassword ? { passwordHash } : {}),
          },
        });
      }
      return;
    }

    const legacy = await prisma.user.findFirst({
      where: { email: { in: LEGACY_EMAILS } },
    });

    if (legacy) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: {
          email: TEST_ADMIN_EMAIL,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      return;
    }

    await prisma.user.create({
      data: {
        firstName: "Platform",
        lastName: "Admin",
        email: TEST_ADMIN_EMAIL,
        phone: "+995555000000",
        countryOfResidence: "GE",
        preferredMessenger: "TELEGRAM",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  } catch {
    // Local bcrypt-hashed credentials still allow /adminoperations login if Postgres is down.
  }
}
