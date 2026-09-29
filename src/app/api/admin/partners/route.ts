import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { partnerDisplayName, partnerStatusLabel, formatPartnerCode } from "@/lib/partner";
import { displayInternationalPhone } from "@/lib/catalog/dial-codes";

async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const partners = await prisma.partner.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: { select: { firstName: true, lastName: true, status: true } },
        _count: { select: { cars: true } },
      },
    });

    return NextResponse.json(
      partners.map((p) => ({
        id: p.id,
        displayName: partnerDisplayName(p),
        kind: p.kind,
        status: p.status,
        statusLabel: partnerStatusLabel(p.status),
        sequentialNumber: p.sequentialNumber,
        partnerCode: formatPartnerCode(p.sequentialNumber),
        fleetSize: p.fleetSize,
        carCount: p._count.cars,
        email: p.email,
        phone: displayInternationalPhone(p.phone),
        hasUser: Boolean(p.userId),
        unreadReapplyCount: p.unreadReapplyCount ?? 0,
        updatedAt: p.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("[admin/partners GET]", error);
    return NextResponse.json({ error: "Could not load partners" }, { status: 500 });
  }
}
