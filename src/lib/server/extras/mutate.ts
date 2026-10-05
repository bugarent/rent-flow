import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  descriptionWithCheckoutSlot,
  extractCheckoutSlotFromDescription,
  extractStoredMaxPeriod,
  normalizeCheckoutSlot,
  resolveCheckoutSlot,
} from "@/lib/extras/checkout-slot";
import {
  localizeExtraName,
  slugifyExtraName,
  toExtraServicePricing,
  type ExtraServicePricing,
} from "@/lib/extras/pricing";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  allocateSlug,
  fromPrismaRow,
  readFileStore,
  toPricing,
  writeFileStore,
} from "./file-store";
import { clearExtrasCatalogCache, listExtraServices } from "./list";
import type { ExtraCreateInput, ExtraUpdateInput, StoredExtraService } from "./types";

export async function createExtraService(input: ExtraCreateInput): Promise<ExtraServicePricing> {
  const name = input.name.trim();
  const description = (input.description || "").trim();
  const minPriceEur = input.minPriceEur === undefined ? null : input.minPriceEur;
  const maxPriceEur = input.maxPriceEur === undefined ? null : input.maxPriceEur;
  const maxPeriodEur =
    input.maxPeriodEur == null || !Number.isFinite(input.maxPeriodEur) || input.maxPeriodEur < 0
      ? null
      : input.maxPeriodEur;
  const defaultPrice =
    maxPriceEur != null && maxPriceEur <= 0
      ? 0
      : (input.defaultPriceEur ?? minPriceEur ?? 0);
  const isActive = input.isActive ?? true;
  const sortOrder = input.sortOrder ?? 100;
  const checkoutSlot = resolveCheckoutSlot({
    checkoutSlot: input.checkoutSlot,
    slug: slugifyExtraName(name),
    name,
  });
  const baseSlug = slugifyExtraName(name);
  const descriptionJson = descriptionWithCheckoutSlot(description, checkoutSlot, maxPeriodEur);

  try {
    let slug = baseSlug;
    let n = 1;
    while (await prisma.extraService.findFirst({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${++n}`;
      if (n > 50) throw new Error("Could not allocate a unique slug");
    }

    const row = await prisma.extraService.create({
      data: {
        slug,
        name: { en: name },
        description: descriptionJson,
        minPriceEur,
        maxPriceEur,
        defaultPriceEur: defaultPrice,
        isActive,
        sortOrder,
      },
    });

    const stored = fromPrismaRow(row);
    stored.checkoutSlot = checkoutSlot;
    stored.maxPeriodEur = maxPeriodEur;
    const fileRows = await readFileStore();
    await writeFileStore([...fileRows.filter((r) => r.slug !== stored.slug), stored]);
    clearExtrasCatalogCache();
    return toExtraServicePricing({ ...row, checkoutSlot, maxPeriodEur });
  } catch (error) {
    // DB offline or not migrated — persist globally via file store so partners still see it
    console.warn("[extras-store] create via file store:", error);
    const fileRows = await readFileStore();
    const slug = await allocateSlug(baseSlug, fileRows);
    const now = new Date().toISOString();
    const stored: StoredExtraService = {
      id: randomUUID(),
      slug,
      name,
      description,
      isTpl: false,
      isActive,
      sortOrder,
      defaultPriceEur: defaultPrice,
      minPriceEur,
      maxPriceEur,
      maxPeriodEur,
      checkoutSlot,
      createdAt: now,
      updatedAt: now,
    };
    await writeFileStore([...fileRows, stored]);
    clearExtrasCatalogCache();
    return toPricing(stored);
  }
}

export async function updateExtraService(
  id: string,
  input: ExtraUpdateInput,
): Promise<ExtraServicePricing | null> {
  const patchFile = async (): Promise<ExtraServicePricing | null> => {
    const fileRows = await readFileStore();
    const idx = fileRows.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const current = fileRows[idx];
    const next: StoredExtraService = {
      ...current,
      name: input.name?.trim() ?? current.name,
      description: input.description !== undefined ? input.description.trim() : current.description,
      isActive: input.isActive ?? current.isActive,
      isTpl: input.isTpl ?? current.isTpl,
      sortOrder: input.sortOrder ?? current.sortOrder,
      defaultPriceEur: input.defaultPriceEur ?? current.defaultPriceEur,
      minPriceEur: input.minPriceEur !== undefined ? input.minPriceEur : current.minPriceEur,
      maxPriceEur: input.maxPriceEur !== undefined ? input.maxPriceEur : current.maxPriceEur,
      maxPeriodEur:
        input.maxPeriodEur !== undefined
          ? input.maxPeriodEur != null && Number.isFinite(input.maxPeriodEur) && input.maxPeriodEur >= 0
            ? input.maxPeriodEur
            : null
          : current.maxPeriodEur,
      checkoutSlot:
        input.checkoutSlot !== undefined
          ? normalizeCheckoutSlot(input.checkoutSlot)
          : current.checkoutSlot,
      updatedAt: new Date().toISOString(),
    };
    if (next.maxPriceEur != null && next.maxPriceEur <= 0) next.defaultPriceEur = 0;
    fileRows[idx] = next;
    await writeFileStore(fileRows);
    clearExtrasCatalogCache();
    if (next.maxPeriodEur != null && next.maxPeriodEur > 0) {
      const { clampAllPartnerPeriodCaps } = await import("@/lib/server/partner-extras-prefs-store");
      await clampAllPartnerPeriodCaps(id, next.maxPeriodEur);
    } else if (next.maxPeriodEur === 0) {
      const { forcePartnersFreeForExtra } = await import("@/lib/server/partner-extras-prefs-store");
      await forcePartnersFreeForExtra(id);
    }
    {
      const { clampAllPartnerDailyPrices } = await import("@/lib/server/partner-extras-prefs-store");
      await clampAllPartnerDailyPrices(id, next.minPriceEur, next.maxPriceEur);
    }
    return toPricing(next);
  };

  try {
    const current = await prisma.extraService.findUnique({ where: { id } });
    if (!current) {
      return patchFile();
    }

    const nextName = input.name?.trim() ?? localizeExtraName(current.name);
    const nextDescription =
      input.description !== undefined
        ? input.description.trim()
        : localizeExtraName(current.description, "");
    const nextSlot =
      input.checkoutSlot !== undefined
        ? normalizeCheckoutSlot(input.checkoutSlot)
        : resolveCheckoutSlot({
            checkoutSlot: extractCheckoutSlotFromDescription(current.description) ?? undefined,
            slug: current.slug,
            isTpl: input.isTpl ?? current.isTpl,
            name: nextName,
          });

    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = { en: input.name.trim() };
    const embeddedPeriod = extractStoredMaxPeriod(current.description);
    const nextPeriod =
      input.maxPeriodEur !== undefined
        ? input.maxPeriodEur != null && Number.isFinite(input.maxPeriodEur) && input.maxPeriodEur >= 0
          ? input.maxPeriodEur
          : null
        : embeddedPeriod.present
          ? embeddedPeriod.value
          : undefined;
    if (
      input.description !== undefined ||
      input.checkoutSlot !== undefined ||
      input.isTpl != null ||
      input.maxPeriodEur !== undefined
    ) {
      data.description = descriptionWithCheckoutSlot(nextDescription, nextSlot, nextPeriod);
    }
    if (input.isActive != null) data.isActive = input.isActive;
    if (input.isTpl != null) data.isTpl = input.isTpl;
    if (input.sortOrder != null) data.sortOrder = input.sortOrder;
    if (input.defaultPriceEur != null) data.defaultPriceEur = input.defaultPriceEur;
    if (input.minPriceEur !== undefined || input.maxPriceEur !== undefined) {
      const boundsMin =
        input.minPriceEur !== undefined
          ? input.minPriceEur
          : current.minPriceEur != null
            ? Number(current.minPriceEur)
            : null;
      const boundsMax =
        input.maxPriceEur !== undefined
          ? input.maxPriceEur
          : current.maxPriceEur != null
            ? Number(current.maxPriceEur)
            : null;
      data.minPriceEur = boundsMin;
      data.maxPriceEur = boundsMax;
      if (boundsMax != null && boundsMax <= 0) data.defaultPriceEur = 0;
    }

    const row = await prisma.extraService.update({ where: { id }, data });
    const stored = fromPrismaRow(row);
    stored.checkoutSlot = nextSlot;
    // Prisma Decimal / null quirks can drop explicit 0 bounds — prefer the patch input.
    if (input.minPriceEur !== undefined) stored.minPriceEur = input.minPriceEur;
    if (input.maxPriceEur !== undefined) stored.maxPriceEur = input.maxPriceEur;
    if (input.defaultPriceEur !== undefined) stored.defaultPriceEur = input.defaultPriceEur;
    if (input.isTpl !== undefined) stored.isTpl = input.isTpl;
    if (stored.maxPriceEur != null && stored.maxPriceEur <= 0) stored.defaultPriceEur = 0;
    const fileRows = await readFileStore();
    const previous = fileRows.find((r) => r.id === id || r.slug === stored.slug);
    stored.maxPeriodEur =
      input.maxPeriodEur !== undefined
        ? input.maxPeriodEur != null && Number.isFinite(input.maxPeriodEur) && input.maxPeriodEur >= 0
          ? input.maxPeriodEur
          : null
        : previous?.maxPeriodEur ?? null;
    await writeFileStore([...fileRows.filter((r) => r.id !== id && r.slug !== stored.slug), stored]);
    clearExtrasCatalogCache();
    if (stored.maxPeriodEur != null && stored.maxPeriodEur > 0) {
      const { clampAllPartnerPeriodCaps } = await import("@/lib/server/partner-extras-prefs-store");
      await clampAllPartnerPeriodCaps(id, stored.maxPeriodEur);
    } else if (stored.maxPeriodEur === 0) {
      const { forcePartnersFreeForExtra } = await import("@/lib/server/partner-extras-prefs-store");
      await forcePartnersFreeForExtra(id);
    }
    {
      const { clampAllPartnerDailyPrices } = await import("@/lib/server/partner-extras-prefs-store");
      await clampAllPartnerDailyPrices(id, stored.minPriceEur, stored.maxPriceEur);
    }
    return toExtraServicePricing({
      ...row,
      minPriceEur: stored.minPriceEur,
      maxPriceEur: stored.maxPriceEur,
      defaultPriceEur: stored.defaultPriceEur,
      maxPeriodEur: stored.maxPeriodEur,
      checkoutSlot: nextSlot,
    });
  } catch (error) {
    console.warn("[extras-store] update via file store:", error);
    return patchFile();
  }
}

export async function deleteExtraService(id: string): Promise<{ ok: true } | { error: string; status: number }> {
  try {
    const row = await prisma.extraService.findUnique({ where: { id } });
    if (row?.isTpl) return { error: "TPL cannot be deleted", status: 400 };
    if (row) {
      await prisma.extraService.delete({ where: { id } });
    }
  } catch (error) {
    console.warn("[extras-store] delete DB path failed:", error);
  }

  const fileRows = await readFileStore();
  const target = fileRows.find((r) => r.id === id);
  if (target?.isTpl) return { error: "TPL cannot be deleted", status: 400 };
  if (!target) {
    // May have been DB-only and already deleted
    try {
      const still = await prisma.extraService.findUnique({ where: { id } });
      if (!still) return { ok: true };
    } catch {
      /* offline */
    }
    if (!fileRows.some((r) => r.id === id)) return { error: "Not found", status: 404 };
  }
  await writeFileStore(fileRows.filter((r) => r.id !== id));
  return { ok: true };
}

/** Persist display order from an ordered list of catalog ids (admin drag reorder). */
export async function reorderExtraServices(orderedIds: string[]): Promise<ExtraServicePricing[]> {
  const applyFileReorder = async () => {
    const rows = await readFileStore();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const now = new Date().toISOString();
    const next: StoredExtraService[] = [];
    for (const id of orderedIds) {
      const row = byId.get(id);
      if (!row) continue;
      next.push({ ...row, sortOrder: next.length, updatedAt: now });
      byId.delete(id);
    }
    for (const row of byId.values()) {
      next.push({ ...row, sortOrder: next.length, updatedAt: now });
    }
    await writeFileStore(next);
    try {
      const { clearPublicCarPayloadCache } = await import("@/lib/server/public-car-payload");
      clearPublicCarPayloadCache();
    } catch {
      /* cache is best-effort */
    }
    return next.map(toPricing);
  };

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.extraService.updateMany({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    // Keep file store in sync when present.
    try {
      const fileRows = await readFileStore();
      if (fileRows.length) {
        const byId = new Map(fileRows.map((r) => [r.id, r]));
        const now = new Date().toISOString();
        const next: StoredExtraService[] = [];
        for (const id of orderedIds) {
          const row = byId.get(id);
          if (!row) continue;
          next.push({ ...row, sortOrder: next.length, updatedAt: now });
          byId.delete(id);
        }
        for (const row of byId.values()) {
          next.push({ ...row, sortOrder: next.length, updatedAt: now });
        }
        await writeFileStore(next);
      }
    } catch {
      /* file optional */
    }
    try {
      const { clearPublicCarPayloadCache } = await import("@/lib/server/public-car-payload");
      clearPublicCarPayloadCache();
    } catch {
      /* cache is best-effort */
    }
    return listExtraServices();
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[extras-store] DB reorder failed, using file store:", error);
    }
    return applyFileReorder();
  }
}

/** Ensure catalog rows exist in Postgres before attaching CarExtra FKs. */
export async function ensureExtrasExistInDb(catalog: ExtraServicePricing[]): Promise<void> {
  for (const service of catalog) {
    try {
      await prisma.extraService.upsert({
        where: { slug: service.slug },
        create: {
          id: service.id,
          slug: service.slug,
          name: { en: service.name },
          description: descriptionWithCheckoutSlot(
            service.description || "",
            service.checkoutSlot,
            service.maxPeriodEur,
          ),
          isTpl: service.isTpl,
          isActive: service.isActive,
          sortOrder: service.sortOrder,
          defaultPriceEur: service.defaultPriceEur,
          minPriceEur: service.minPriceEur,
          maxPriceEur: service.maxPriceEur,
        },
        update: {
          name: { en: service.name },
          description: descriptionWithCheckoutSlot(
            service.description || "",
            service.checkoutSlot,
            service.maxPeriodEur,
          ),
          isActive: service.isActive,
          sortOrder: service.sortOrder,
          defaultPriceEur: service.defaultPriceEur,
          minPriceEur: service.minPriceEur,
          maxPriceEur: service.maxPriceEur,
        },
      });
    } catch (error) {
      console.warn("[extras-store] ensureExtrasExistInDb failed for", service.slug, error);
    }
  }
}
