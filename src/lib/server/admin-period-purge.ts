import "server-only";

import { roundMoney } from "@/lib/cars/reserve-pricing";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { archiveBookingForReports, loadAdminBookingFacts } from "@/lib/server/admin-booking-facts";
import { deleteFileBookings, listAllFileBookings } from "@/lib/server/customer-bookings-store";
import {
  deleteRetainedBookingFacts,
  listRetainedBookingFacts,
} from "@/lib/server/retained-booking-facts";
import {
  addFinanceExcludedIds,
  removeFinanceExcludedIds,
} from "@/lib/server/finance-excluded-bookings";

/** bookings = delete bookings, keep finances; finances = the reverse; both = delete everything. */
export type PeriodPurgeMode = "bookings" | "finances" | "both";

export type PeriodPurgeSummary = {
  from: string;
  to: string;
  liveBookings: number;
  financeRows: number;
  financeVolumeEur: number;
};

function inRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= startMs && t <= endMs;
}

function bounds(from: string, to: string) {
  const [a, b] = from <= to ? [from, to] : [to, from];
  return {
    from: a,
    to: b,
    startMs: new Date(`${a}T00:00:00.000Z`).getTime(),
    endMs: new Date(`${b}T23:59:59.999Z`).getTime(),
  };
}

/** Live bookings (database + file) created in the period. */
async function liveBookingIds(startMs: number, endMs: number): Promise<{ db: string[]; file: string[] }> {
  const file = (await listAllFileBookings())
    .filter((row) => inRange(row.createdAt, startMs, endMs))
    .map((row) => row.id);
  let db: string[] = [];
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.booking.findMany({
      where: { createdAt: { gte: new Date(startMs), lte: new Date(endMs) } },
      select: { id: true },
    });
    db = rows.map((row) => row.id);
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  return { db, file };
}

/** Same period rule as the financials panel: booking creation date. */
export async function previewPeriodPurge(fromIso: string, toIso: string): Promise<PeriodPurgeSummary> {
  const { from, to, startMs, endMs } = bounds(fromIso, toIso);
  const live = await liveBookingIds(startMs, endMs);
  const facts = (await loadAdminBookingFacts()).filter((f) => inRange(f.createdAt, startMs, endMs));
  return {
    from,
    to,
    liveBookings: new Set([...live.db, ...live.file]).size,
    financeRows: facts.length,
    financeVolumeEur: roundMoney(facts.reduce((s, f) => s + (Number(f.totalPriceEur) || 0), 0)),
  };
}

async function deleteLiveBookings(ids: { db: string[]; file: string[] }): Promise<number> {
  const removed = new Set<string>();
  if (ids.db.length) {
    try {
      const { prisma } = await import("@/lib/prisma");
      for (const id of ids.db) {
        try {
          await prisma.booking.delete({ where: { id } });
          removed.add(id);
        } catch (error) {
          if (isDbOfflineError(error)) throw error;
          console.warn("[period-purge] delete db booking", id, error);
        }
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }
  }
  const fileIds = [...new Set([...ids.file, ...ids.db])];
  if (fileIds.length) {
    const before = (await listAllFileBookings()).filter((b) => fileIds.includes(b.id)).map((b) => b.id);
    await deleteFileBookings(fileIds);
    for (const id of before) removed.add(id);
  }
  return removed.size;
}

export async function runPeriodPurge(
  fromIso: string,
  toIso: string,
  mode: PeriodPurgeMode,
): Promise<{ deletedBookings: number; deletedFinanceRows: number }> {
  const { startMs, endMs } = bounds(fromIso, toIso);
  const live = await liveBookingIds(startMs, endMs);
  const liveIds = [...new Set([...live.db, ...live.file])];
  let deletedBookings = 0;
  let deletedFinanceRows = 0;

  if (mode === "bookings") {
    for (const id of liveIds) {
      try {
        await archiveBookingForReports(id);
      } catch (error) {
        console.warn("[period-purge] archive", id, error);
      }
    }
    deletedBookings = await deleteLiveBookings(live);
    return { deletedBookings, deletedFinanceRows };
  }

  const financeIds = (await loadAdminBookingFacts())
    .filter((f) => inRange(f.createdAt, startMs, endMs))
    .map((f) => f.id);
  const retainedInRange = (await listRetainedBookingFacts())
    .filter((f) => inRange(f.createdAt, startMs, endMs))
    .map((f) => f.id);
  deletedFinanceRows = financeIds.length;

  if (mode === "finances") {
    await deleteRetainedBookingFacts(retainedInRange);
    await addFinanceExcludedIds(liveIds);
    return { deletedBookings, deletedFinanceRows };
  }

  deletedBookings = await deleteLiveBookings(live);
  await deleteRetainedBookingFacts(retainedInRange);
  await removeFinanceExcludedIds(liveIds);
  return { deletedBookings, deletedFinanceRows };
}
