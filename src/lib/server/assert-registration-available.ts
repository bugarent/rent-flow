import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  findFileCarByRegistration,
  type FileCarListing,
} from "@/lib/server/partner-cars-store";
import {
  normalizeRegistrationNumber,
  PLATE_BLOCKING_STATUSES,
} from "@/lib/cars/registration-number";

export const PLATE_TAKEN_CODE = "PLATE_TAKEN";

export const PLATE_TAKEN_MESSAGE =
  "A car with this registration number is already registered. You cannot submit or save a listing with the same plate.";

const BLOCKING = [...PLATE_BLOCKING_STATUSES];
/** A clone may not reuse a plate that is still on any listing except a rejected one. */
const CLONE_BLOCKING = ["APPROVED", "PENDING", "PENDING_REMODERATION", "DRAFT", "HIDDEN"] as const;

export async function findRegistrationConflict(
  plate: string,
  opts?: { excludeId?: string; clone?: boolean },
): Promise<{ id: string; source: "db" | "file" } | null> {
  const normalized = normalizeRegistrationNumber(plate);
  if (!normalized) return null;
  const statuses = opts?.clone ? CLONE_BLOCKING : BLOCKING;

  try {
    const existing = await prisma.car.findFirst({
      where: {
        registrationNumber: normalized,
        status: { in: [...statuses] },
        ...(opts?.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) return { id: existing.id, source: "db" };
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const fileClash = await findFileCarByRegistration(normalized, {
    blockingOnly: !opts?.clone,
    excludeRejected: Boolean(opts?.clone),
    excludeId: opts?.excludeId,
  });
  if (fileClash) return { id: fileClash.id, source: "file" };
  return null;
}

export async function assertRegistrationAvailable(
  plate: string,
  opts?: { excludeId?: string; clone?: boolean },
): Promise<{ ok: true } | { ok: false; conflict: NonNullable<Awaited<ReturnType<typeof findRegistrationConflict>>> }> {
  const conflict = await findRegistrationConflict(plate, opts);
  if (conflict) return { ok: false, conflict };
  return { ok: true };
}

export function plateTakenResponse() {
  return {
    error: PLATE_TAKEN_MESSAGE,
    code: PLATE_TAKEN_CODE,
  };
}

/** @deprecated helper for typing only */
export type FileCarPlateHit = FileCarListing;
