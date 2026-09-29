import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getFileCar, updateFileCar } from "@/lib/server/partner-cars-store";
import { clearPublishedCarSnapshot } from "@/lib/server/car-published-store";
import {
  clearCarRejectionNotice,
  writeCarRejectionNotice,
} from "@/lib/server/car-rejection-store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status;
    const rejectionNote = String(body.rejectionNote ?? body.note ?? body.hiddenReason ?? "").trim();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (status === "REJECTED" && !rejectionNote) {
      return NextResponse.json({ error: "Rejection comment is required" }, { status: 400 });
    }

    const hiddenReason =
      status === "APPROVED"
        ? null
        : rejectionNote || "Rejected by admin — listing is not visible on public search until re-approved";

    try {
      if (status === "APPROVED") {
        const car = await prisma.car.findUnique({
          where: { id },
          select: { registrationNumber: true },
        });
        if (car?.registrationNumber) {
          const { assertRegistrationAvailable, plateTakenResponse } = await import(
            "@/lib/server/assert-registration-available"
          );
          const check = await assertRegistrationAvailable(car.registrationNumber, {
            excludeId: id,
          });
          if (!check.ok) {
            return NextResponse.json(plateTakenResponse(), { status: 409 });
          }
        }
      }

      const updatedCar = await prisma.car.update({
        where: { id },
        data: {
          status,
          hiddenReason,
        },
      });

      if (status === "APPROVED") {
        await clearPublishedCarSnapshot(id);
        await clearCarRejectionNotice(id);
      } else {
        await writeCarRejectionNotice(id, hiddenReason || "");
      }

      return NextResponse.json({ id: updatedCar.id, status: updatedCar.status });
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
      const fileCar = await getFileCar(id);
      if (!fileCar) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (status === "APPROVED" && fileCar.registrationNumber) {
        const { assertRegistrationAvailable, plateTakenResponse } = await import(
          "@/lib/server/assert-registration-available"
        );
        const check = await assertRegistrationAvailable(fileCar.registrationNumber, {
          excludeId: id,
        });
        if (!check.ok) {
          return NextResponse.json(plateTakenResponse(), { status: 409 });
        }
      }
      const updated = await updateFileCar(id, {
        status,
        hiddenReason,
      });
      if (status === "APPROVED") {
        await clearPublishedCarSnapshot(id);
        await clearCarRejectionNotice(id);
      } else {
        await writeCarRejectionNotice(id, hiddenReason || "");
      }
      return NextResponse.json({ id: updated?.id ?? id, status: updated?.status ?? status });
    }
  } catch {
    return NextResponse.json({ error: "Failed to update car status" }, { status: 500 });
  }
}
