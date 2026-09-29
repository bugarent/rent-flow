import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getFileCar, isFileCarOwner } from "@/lib/server/partner-cars-store";
import { acknowledgeCarRejectionNotice } from "@/lib/server/car-rejection-store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPartnerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const car = await prisma.car.findUnique({
      where: { id },
      include: { partner: { select: { userId: true } } },
    });
    if (!car || car.partner.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
    const fileCar = await getFileCar(id);
    if (!fileCar || !isFileCarOwner(fileCar, session.user)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const notice = await acknowledgeCarRejectionNotice(id);
  return NextResponse.json({ ok: true, notice });
}
