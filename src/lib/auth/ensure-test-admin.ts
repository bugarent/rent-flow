import { verifySecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  TEST_ADMIN_EMAIL,
  bootstrapAdminPassword,
  provisionLocalAdmin,
} from "@/lib/auth/local-admin-store";

const LEGACY_EMAILS = ["aaaaaaaaaa", "admin@rentairportcars.com", "aaaaa@gmail.com"];

export { TEST_ADMIN_EMAIL };

export async function ensureTestAdmin() {
  const local = provisionLocalAdmin();
  const passwordHash = local?.passwordHash ?? "";
  const bootstrap = bootstrapAdminPassword();

  try {
    const current = await prisma.user.findUnique({ where: { email: TEST_ADMIN_EMAIL } });
    if (current) {
      const passwordOk = bootstrap ? verifySecret(bootstrap, current.passwordHash) : true;
      const shouldResetPassword =
        !passwordOk && Boolean(passwordHash) && local?.passwordPlain === bootstrap;
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

    if (!passwordHash) return;

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
    // Local bcrypt-hashed credentials still allow /admin505 login if Postgres is down.
  }
}
