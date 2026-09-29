import { prisma } from "@/lib/prisma";
import {
  TEST_PARTNER_EMAIL,
  TEST_PARTNER_PASSWORD,
  provisionLocalPartner,
} from "@/lib/auth/local-partner-store";
import { nextPartnerSequentialNumber } from "@/lib/sequential-ids";

export { TEST_PARTNER_EMAIL, TEST_PARTNER_PASSWORD };

export async function ensureTestPartner() {
  const local = provisionLocalPartner();
  const passwordHash = local.passwordHash;

  try {
    let user = await prisma.user.findUnique({
      where: { email: TEST_PARTNER_EMAIL },
      include: { partner: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: "Test",
          lastName: "Partner",
          email: TEST_PARTNER_EMAIL,
          phone: "+995555000001",
          countryOfResidence: "GE",
          preferredMessenger: "WHATSAPP",
          passwordHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
        include: { partner: true },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
        include: { partner: true },
      });
    }

    if (!user.partner) {
      await prisma.partner.create({
        data: {
          userId: user.id,
          companyName: local.companyName,
          contactName: "Test Partner",
          email: TEST_PARTNER_EMAIL,
          phone: "+995555000001",
          messenger: "WHATSAPP",
          fleetSize: 5,
          kind: "COMPANY",
          personalId: "00000000000",
          sequentialNumber: await nextPartnerSequentialNumber(),
          status: "APPROVED",
          approvedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
      });
    } else if (user.partner.status !== "APPROVED" || (user.partner.sequentialNumber ?? 0) < 1000) {
      const sequentialNumber =
        user.partner.sequentialNumber && user.partner.sequentialNumber >= 1000
          ? user.partner.sequentialNumber
          : await nextPartnerSequentialNumber();
      await prisma.partner.update({
        where: { id: user.partner.id },
        data: {
          status: "APPROVED",
          approvedAt: user.partner.approvedAt ?? new Date(),
          sequentialNumber,
        },
      });
    }
  } catch {
    // Local bcrypt-hashed credentials still allow /partner-portal login if Postgres is down.
  }
}
