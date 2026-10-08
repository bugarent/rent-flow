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
import { acknowledgeReviewedInsuranceExpiry } from "@/lib/server/car-insurance-store";
import { clearPublicCarCache } from "@/lib/server/public-car-payload";

function isMissingRecord(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "P2025");
}

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
      let prismaCar: { id: string; registrationNumber: string | null } | null = null;
      try {
        prismaCar = await prisma.car.findUnique({
          where: { id },
          select: { id: true, registrationNumber: true },
        });
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
      }

      if (status === "APPROVED") {
        const registrationNumber =
          prismaCar?.registrationNumber || (await getFileCar(id))?.registrationNumber;
        if (registrationNumber) {
          const { assertRegistrationAvailable, plateTakenResponse } = await import(
            "@/lib/server/assert-registration-available"
          );
          const check = await assertRegistrationAvailable(registrationNumber, {
            excludeId: id,
          });
          if (!check.ok) {
            return NextResponse.json(plateTakenResponse(), { status: 409 });
          }
        }
      }

      let prismaUpdated = false;
      if (prismaCar) {
        await prisma.car.update({
          where: { id: prismaCar.id },
          data: {
            status,
            hiddenReason,
          },
        });
        prismaUpdated = true;
      } else {
        try {
          await prisma.car.update({
            where: { id },
            data: {
              status,
              hiddenReason,
            },
          });
          prismaUpdated = true;
        } catch (error) {
          if (!isDbOfflineError(error) && !isMissingRecord(error)) throw error;
        }
      }

      let fileUpdated: Awaited<ReturnType<typeof updateFileCar>> = null;
      try {
        fileUpdated = await updateFileCar(id, {
          status,
          hiddenReason,
        });
      } catch (error) {
        if (!prismaUpdated) throw error;
        console.warn("[cars moderate] file status", id, error);
      }
      if (!prismaUpdated && !fileUpdated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (status === "APPROVED") {
        await acknowledgeReviewedInsuranceExpiry(id);
        await clearPublishedCarSnapshot(id);
        await clearCarRejectionNotice(id);
        clearPublicCarCache(id);
      } else {
        await writeCarRejectionNotice(id, hiddenReason || "");
      }

      return NextResponse.json({ id, status });
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
        await acknowledgeReviewedInsuranceExpiry(id);
        await clearPublishedCarSnapshot(id);
        await clearCarRejectionNotice(id);
        clearPublicCarCache(id);
      } else {
        await writeCarRejectionNotice(id, hiddenReason || "");
      }
      return NextResponse.json({ id: updated?.id ?? id, status: updated?.status ?? status });
    }
  } catch {
    return NextResponse.json({ error: "Failed to update car status" }, { status: 500 });
  }
}
