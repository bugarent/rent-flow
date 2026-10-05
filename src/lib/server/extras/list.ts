import "server-only";

import { prisma, isDbCircuitOpen, noteDbOfflineOnce } from "@/lib/prisma";
import { descriptionWithCheckoutSlot } from "@/lib/extras/checkout-slot";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { fromPrismaRow, readFileStore, toPricing, writeFileStore } from "./file-store";
import type { StoredExtraService } from "./types";

/** Best-effort: push file-backed extras into Postgres so car FKs resolve. */
export async function syncExtrasFileToDb(): Promise<void> {
  const fileRows = await readFileStore();
  if (!fileRows.length) return;
  for (const row of fileRows) {
    try {
      await prisma.extraService.upsert({
        where: { slug: row.slug },
        create: {
          id: row.id,
          slug: row.slug,
          name: { en: row.name },
          description: descriptionWithCheckoutSlot(row.description, row.checkoutSlot),
          isTpl: row.isTpl,
          isActive: row.isActive,
          sortOrder: row.sortOrder,
          defaultPriceEur: row.defaultPriceEur,
          minPriceEur: row.minPriceEur,
          maxPriceEur: row.maxPriceEur,
        },
        update: {
          name: { en: row.name },
          description: descriptionWithCheckoutSlot(row.description, row.checkoutSlot),
          isTpl: row.isTpl,
          isActive: row.isActive,
          sortOrder: row.sortOrder,
          defaultPriceEur: row.defaultPriceEur,
          minPriceEur: row.minPriceEur,
          maxPriceEur: row.maxPriceEur,
        },
      });
    } catch (error) {
      console.warn("[extras-store] sync upsert failed for", row.slug, error);
    }
  }
}

function mapActiveOnly(rows: ExtraServicePricing[], activeOnly?: boolean) {
  return activeOnly ? rows.filter((x) => x.isActive) : rows;
}

async function listFromFile(activeOnly?: boolean): Promise<ExtraServicePricing[]> {
  const fileRows = await readFileStore().catch(() => [] as StoredExtraService[]);
  const priced = fileRows
    .map(toPricing)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return mapActiveOnly(priced, activeOnly);
}

/**
 * Global extras catalog for admin + every partner.
 * Prefers Postgres; falls back to file when DB is offline.
 * Read-only — no disk write / DB sync on this hot path.
 */
export async function listExtraServices(opts?: {
  activeOnly?: boolean;
}): Promise<ExtraServicePricing[]> {
  if (isDbCircuitOpen()) {
    return listFromFile(opts?.activeOnly);
  }

  try {
    const rows = await prisma.extraService.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });
    if (rows.length === 0) {
      return listFromFile(opts?.activeOnly);
    }
    // Fast path: serve DB rows only (no file I/O on every request).
    return mapActiveOnly(rows.map((r) => toPricing(fromPrismaRow(r))), opts?.activeOnly);
  } catch (error) {
    if (isDbOfflineError(error)) {
      noteDbOfflineOnce("extras-list", error);
    } else {
      console.warn("[extras-store] list DB error, using file store:", error);
    }
    return listFromFile(opts?.activeOnly);
  }
}

/** Persist file catalog + push to DB — call from admin mutate paths only. */
export async function persistAndSyncExtrasCatalog(rows: StoredExtraService[]): Promise<void> {
  await writeFileStore(rows);
  try {
    await syncExtrasFileToDb();
  } catch {
    /* best-effort */
  }
}
