import "server-only";

import {
  isInsuranceCheckoutSlot,
  resolveCheckoutSlot,
  type ExtraCheckoutSlot,
} from "@/lib/extras/checkout-slot";
import {
  clampPartnerDailyPrice,
  effectivePeriodBounds,
  isMandatoryExtra,
  isMandatoryFreeExtra,
  isMandatoryPricedExtra,
  isPeriodForcedFreeExtra,
  localizeExtraName,
} from "@/lib/extras/pricing";
import { readExtraI18n } from "@/lib/extras/localized-copy";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { listExtraServices } from "./list";
import type { HydratedListingExtra } from "./types";

const slugIndexCache = createTtlCache<Map<string, string>>(15_000);

/** File id and database id of the same extra share a slug. */
async function extraSlugById(): Promise<Map<string, string>> {
  const hit = slugIndexCache.get();
  if (hit) return hit;
  try {
    const { readFileStore } = await import("./file-store");
    const [catalog, fileRows] = await Promise.all([
      listExtraServices({ activeOnly: false }),
      readFileStore().catch(() => []),
    ]);
    const slugById = new Map<string, string>();
    for (const row of fileRows) {
      if (row.id && row.slug) slugById.set(row.id, row.slug);
    }
    for (const row of catalog) {
      if (row.id && row.slug) slugById.set(row.id, row.slug);
    }
    slugIndexCache.set(slugById);
    return slugById;
  } catch {
    return slugIndexCache.peek() ?? new Map();
  }
}

function prefLookup<T extends { extraServiceId: string }>(prefs: T[], slugById: Map<string, string>) {
  const byId = new Map(prefs.map((pref) => [pref.extraServiceId, pref]));
  const bySlug = new Map<string, T>();
  for (const pref of prefs) {
    const slug = slugById.get(pref.extraServiceId);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, pref);
  }
  return {
    forRow(extraServiceId: string, slug?: string | null) {
      const direct = byId.get(extraServiceId);
      if (direct) return direct;
      const resolved = String(slug || slugById.get(extraServiceId) || "").trim();
      return resolved ? bySlug.get(resolved) : undefined;
    },
  };
}

function copyBags(service: { name?: unknown; description?: unknown; nameI18n?: Record<string, string>; descriptionI18n?: Record<string, string> } | null | undefined) {
  return {
    nameI18n: { ...readExtraI18n(service?.name), ...(service?.nameI18n || {}) },
    descriptionI18n: { ...readExtraI18n(service?.description), ...(service?.descriptionI18n || {}) },
  };
}

function sortHydratedExtras(rows: HydratedListingExtra[]): HydratedListingExtra[] {
  return [...rows].sort(
    (a, b) =>
      (a.extraService?.sortOrder ?? 100) - (b.extraService?.sortOrder ?? 100) ||
      a.extraServiceId.localeCompare(b.extraServiceId),
  );
}

/** Attach catalog extraService onto listing extra rows (file cars often store ids only). */
export async function hydrateListingExtras(raw: unknown): Promise<HydratedListingExtra[]> {
  const extras = Array.isArray(raw) ? raw : [];
  if (!extras.length) return [];
  const catalog = await listExtraServices({ activeOnly: false });
  const byId = new Map(catalog.map((service) => [service.id, service]));
  const { findPartnerCustomExtra, partnerCustomToPricing } = await import(
    "@/lib/server/partner-custom-extras-store"
  );
  const resolved: HydratedListingExtra[] = [];
  for (const row of extras) {
    const item = (row ?? {}) as {
      extraServiceId?: unknown;
      priceEur?: unknown;
      forbidden?: unknown;
      extraService?: {
        id?: unknown;
        slug?: unknown;
        name?: unknown;
        description?: unknown;
        isTpl?: unknown;
        isActive?: unknown;
        minPriceEur?: unknown;
        maxPriceEur?: unknown;
        checkoutSlot?: unknown;
      } | null;
    };
    const nested = item.extraService;
    const id = String(item.extraServiceId || nested?.id || "").trim();
    if (!id) continue;
    const forbidden = Boolean(item.forbidden);
    let catalogSvc = byId.get(id) || null;
    if (!catalogSvc) {
      const custom = await findPartnerCustomExtra(id);
      if (custom) catalogSvc = partnerCustomToPricing(custom.extra);
    }
    const name = nested?.id
      ? localizeExtraName(nested.name, catalogSvc?.name || id)
      : catalogSvc?.name || id;
    const description = nested?.id
      ? localizeExtraName(nested.description, catalogSvc?.description || "")
      : catalogSvc?.description || "";
    const isTpl = Boolean(nested?.isTpl ?? catalogSvc?.isTpl);
    const slug = String(nested?.slug || catalogSvc?.slug || id);
    const checkoutSlot = resolveCheckoutSlot({
      checkoutSlot: nested?.checkoutSlot ?? catalogSvc?.checkoutSlot,
      slug,
      isTpl,
      name,
    });
    const sortOrder = catalogSvc?.sortOrder ?? 100;
    const extraService = nested?.id
      ? {
          id: String(nested.id),
          slug,
          name,
          description,
          nameI18n: { ...readExtraI18n(nested?.name), ...(catalogSvc?.nameI18n || {}) },
          descriptionI18n: { ...readExtraI18n(nested?.description), ...(catalogSvc?.descriptionI18n || {}) },
          isTpl,
          isActive: nested.isActive !== false && catalogSvc?.isActive !== false,
          minPriceEur:
            nested.minPriceEur == null ? catalogSvc?.minPriceEur ?? null : Number(nested.minPriceEur),
          maxPriceEur:
            nested.maxPriceEur == null ? catalogSvc?.maxPriceEur ?? null : Number(nested.maxPriceEur),
          maxPeriodEur: catalogSvc?.maxPeriodEur ?? null,
          sortOrder,
          checkoutSlot,
        }
      : catalogSvc
        ? {
            id: catalogSvc.id,
            slug: catalogSvc.slug,
            name: catalogSvc.name,
            description: catalogSvc.description || "",
            ...copyBags(catalogSvc),
            isTpl: catalogSvc.isTpl,
            isActive: catalogSvc.isActive,
            minPriceEur: catalogSvc.minPriceEur,
            maxPriceEur: catalogSvc.maxPriceEur,
            maxPeriodEur: catalogSvc.maxPeriodEur,
            sortOrder: catalogSvc.sortOrder,
            checkoutSlot: catalogSvc.checkoutSlot,
          }
        : null;
    resolved.push({
      extraServiceId: id,
      priceEur: forbidden
        ? 0
        : isPeriodForcedFreeExtra({ maxPeriodEur: catalogSvc?.maxPeriodEur })
          ? 0
          : clampPartnerDailyPrice(
              catalogSvc?.minPriceEur,
              catalogSvc?.maxPriceEur,
              Number(item.priceEur) || 0,
            ),
      ...(forbidden ? { forbidden: true as const } : {}),
      extraService,
    });
  }
  return sortHydratedExtras(resolved);
}

/**
 * Apply partner equipment prefs onto listing extras for customer checkout:
 * - enabled → normal service (price from car)
 * - forbidden → red notice, no price
 * - off → hidden entirely
 * Mandatory/TPL catalog free extras are never hidden or forbidden by prefs.
 */
export async function applyPartnerExtraOfferModes(
  extras: HydratedListingExtra[],
  partnerId?: string | null,
  carId?: string | null,
): Promise<HydratedListingExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id || !extras.length) return extras;

  try {
    const { readPartnerExtraPrefs, partnerExtraPrefAppliesToCar } = await import(
      "@/lib/server/partner-extras-prefs-store"
    );
    const { LOCAL_PARTNER_ID } = await import("@/lib/auth/local-partner-store");
    const candidateIds = [id];
    if (id.startsWith("file-partner-")) {
      const stripped = id.replace(/^file-partner-/, "");
      if (stripped) candidateIds.push(stripped);
    }
    if (!candidateIds.includes(LOCAL_PARTNER_ID)) candidateIds.push(LOCAL_PARTNER_ID);

    let prefs: Array<{
      extraServiceId: string;
      enabled: boolean;
      forbidden?: boolean;
      priceEur?: number;
      minPeriodEur?: number | null;
      maxPeriodEur?: number | null;
      carIds?: string[];
    }> = [];
    let resolvedPartnerId = id;
    for (const pid of candidateIds) {
      prefs = await readPartnerExtraPrefs(pid);
      if (prefs.length) {
        resolvedPartnerId = pid;
        break;
      }
    }
    if (!prefs.length) return extras;

    const lookup = prefLookup(prefs, await extraSlugById());
    const next: HydratedListingExtra[] = [];
    for (const row of extras) {
      const svc = row.extraService;
      const pref = lookup.forRow(row.extraServiceId, svc?.slug);
      const mandatoryPriced = Boolean(svc && isMandatoryPricedExtra(svc));
      if (svc && !mandatoryPriced && (svc.isTpl || isMandatoryExtra(svc))) {
        next.push({
          extraServiceId: row.extraServiceId,
          priceEur: 0,
          extraService: row.extraService,
        });
        continue;
      }
      if (!pref) {
        next.push(row);
        continue;
      }
      if (!partnerExtraPrefAppliesToCar(pref, carId)) {
        // Pref scoped to other cars — leave the car's own extra row as-is.
        next.push(row);
        continue;
      }
      // Mandatory extras cannot be hidden or forbidden by the partner; only the price applies.
      if (pref.forbidden && !mandatoryPriced) {
        next.push({ ...row, priceEur: 0, forbidden: true });
        continue;
      }
      if (!pref.enabled && !mandatoryPriced) {
        continue; // off — hide from customer
      }
      const bounds = effectivePeriodBounds(
        row.extraService?.maxPeriodEur,
        pref.maxPeriodEur,
        pref.minPeriodEur,
      );
      next.push({
        extraServiceId: row.extraServiceId,
        priceEur: isPeriodForcedFreeExtra({ maxPeriodEur: row.extraService?.maxPeriodEur })
          ? 0
          : clampPartnerDailyPrice(
              row.extraService?.minPriceEur,
              row.extraService?.maxPriceEur,
              pref.priceEur != null && Number.isFinite(Number(pref.priceEur))
                ? Number(pref.priceEur)
                : Number(row.priceEur) || 0,
            ),
        extraService: row.extraService
          ? {
              ...row.extraService,
              maxPeriodEur: bounds.maxPeriodEur,
              minPeriodEur: bounds.minPeriodEur,
            }
          : row.extraService,
      });
    }
    void resolvedPartnerId;
    return sortHydratedExtras(next);
  } catch {
    return extras;
  }
}

/**
 * Inject partner-enabled / forbidden extras (catalog + partner-custom) that are not
 * already attached on the car, so equipment-service prefs show in checkout.
 */
export async function mergePartnerOfferedExtras(
  extras: HydratedListingExtra[],
  partnerId?: string | null,
  carId?: string | null,
): Promise<HydratedListingExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id) return extras;

  try {
    const { readPartnerExtraPrefs, partnerExtraPrefAppliesToCar } = await import(
      "@/lib/server/partner-extras-prefs-store"
    );
    const { LOCAL_PARTNER_ID } = await import("@/lib/auth/local-partner-store");
    const {
      listPartnerCustomExtrasAsPricing,
    } = await import("@/lib/server/partner-custom-extras-store");

    const candidateIds = [id];
    if (id.startsWith("file-partner-")) {
      const stripped = id.replace(/^file-partner-/, "");
      if (stripped) candidateIds.push(stripped);
    }
    if (!candidateIds.includes(LOCAL_PARTNER_ID)) candidateIds.push(LOCAL_PARTNER_ID);

    let prefs: Array<{
      extraServiceId: string;
      enabled: boolean;
      forbidden?: boolean;
      priceEur: number;
      minPeriodEur?: number | null;
      maxPeriodEur?: number | null;
      carIds?: string[];
    }> = [];
    let resolvedPartnerId = id;
    for (const pid of candidateIds) {
      prefs = await readPartnerExtraPrefs(pid);
      if (prefs.length) {
        resolvedPartnerId = pid;
        break;
      }
    }
    if (!prefs.length) return extras;

    const slugById = await extraSlugById();
    const present = new Set(extras.map((e) => e.extraServiceId));
    const presentSlugs = new Set(
      extras
        .map((row) => row.extraService?.slug || slugById.get(row.extraServiceId) || "")
        .filter(Boolean),
    );
    const catalog = await listExtraServices({ activeOnly: true });
    const customs = await listPartnerCustomExtrasAsPricing(resolvedPartnerId, { activeOnly: true });
    const services = [...catalog, ...customs];
    const byId = new Map(services.map((s) => [s.id, s]));
    const bySlug = new Map(services.filter((s) => s.slug).map((s) => [s.slug, s]));

    const merged = [...extras];
    for (const pref of prefs) {
      if (!partnerExtraPrefAppliesToCar(pref, carId)) continue;
      const slug = slugById.get(pref.extraServiceId) || "";
      if (present.has(pref.extraServiceId) || (slug && presentSlugs.has(slug))) continue;
      const service = byId.get(pref.extraServiceId) || (slug ? bySlug.get(slug) : undefined);
      if (!service) continue;
      const mandatoryPriced = isMandatoryPricedExtra(service);
      if (!mandatoryPriced && (service.isTpl || isMandatoryExtra(service))) continue;
      if (!mandatoryPriced && !pref.enabled && !pref.forbidden) continue;
      const forbidden = !mandatoryPriced && Boolean(pref.forbidden);
      const bounds = effectivePeriodBounds(service.maxPeriodEur, pref.maxPeriodEur, pref.minPeriodEur);
      merged.push({
        extraServiceId: service.id,
        priceEur: forbidden
          ? 0
          : isPeriodForcedFreeExtra(service)
            ? 0
            : clampPartnerDailyPrice(service.minPriceEur, service.maxPriceEur, pref.priceEur),
        ...(forbidden ? { forbidden: true as const } : {}),
        extraService: {
          id: service.id,
          slug: service.slug,
          name: service.name,
          description: service.description || "",
          ...copyBags(service),
          isTpl: service.isTpl,
          isActive: service.isActive,
          minPriceEur: service.minPriceEur,
          maxPriceEur: service.maxPriceEur,
          maxPeriodEur: bounds.maxPeriodEur,
          minPeriodEur: bounds.minPeriodEur,
          sortOrder: service.sortOrder,
          checkoutSlot: service.checkoutSlot,
        },
      });
      present.add(service.id);
      if (service.slug) presentSlugs.add(service.slug);
    }
    return sortHydratedExtras(merged);
  } catch {
    return extras;
  }
}

/** Ensure free catalog services (insurance + mandatory free extras) appear on checkout. */
export async function mergeFreeInsuranceExtras(
  extras: HydratedListingExtra[],
): Promise<HydratedListingExtra[]> {
  const catalog = await listExtraServices({ activeOnly: true });
  const presentIds = new Set(extras.map((row) => row.extraServiceId));
  const presentSlots = new Set(
    extras
      .map((row) => row.extraService?.checkoutSlot)
      .filter((slot): slot is ExtraCheckoutSlot => Boolean(slot) && slot !== "none"),
  );
  const merged = [...extras];
  for (const service of catalog) {
    const isFree = service.mode === "free" || service.isTpl || isMandatoryFreeExtra(service);
    if (!isFree) continue;

    if (isInsuranceCheckoutSlot(service.checkoutSlot)) {
      if (presentIds.has(service.id) || presentSlots.has(service.checkoutSlot)) continue;
    } else if (presentIds.has(service.id)) {
      continue;
    }

    merged.push({
      extraServiceId: service.id,
      priceEur: 0,
      extraService: {
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description || "",
        ...copyBags(service),
        isTpl: service.isTpl,
        isActive: service.isActive,
        minPriceEur: service.minPriceEur,
        maxPriceEur: service.maxPriceEur,
        maxPeriodEur: service.maxPeriodEur,
        sortOrder: service.sortOrder,
        checkoutSlot: service.checkoutSlot,
      },
    });
    presentIds.add(service.id);
    if (isInsuranceCheckoutSlot(service.checkoutSlot)) {
      presentSlots.add(service.checkoutSlot);
    }
  }
  return sortHydratedExtras(merged);
}

/** Prices the customer can actually be charged: partner daily inside admin min/max, rental total inside the admin period cap. */
export async function customerExtraQuotes(opts: {
  rawExtras: unknown;
  partnerId?: string | null;
  carId?: string | null;
}): Promise<
  Array<{
    extraServiceId: string;
    priceEur: number;
    maxPeriodEur: number | null;
    minPeriodEur: number | null;
  }>
> {
  const hydrated = await hydrateListingExtras(opts.rawExtras);
  const withPrefs = await applyPartnerExtraOfferModes(hydrated, opts.partnerId, opts.carId);
  const withOffered = await mergePartnerOfferedExtras(withPrefs, opts.partnerId, opts.carId);
  return withOffered
    .filter((row) => !row.forbidden)
    .map((row) => {
      const periodFree = isPeriodForcedFreeExtra({
        maxPeriodEur: row.extraService?.maxPeriodEur,
      });
      return {
        extraServiceId: row.extraServiceId,
        priceEur: periodFree
          ? 0
          : clampPartnerDailyPrice(
              row.extraService?.minPriceEur,
              row.extraService?.maxPriceEur,
              row.priceEur,
            ),
        maxPeriodEur:
          row.extraService?.maxPeriodEur == null ||
          !Number.isFinite(Number(row.extraService.maxPeriodEur))
            ? null
            : Number(row.extraService.maxPeriodEur),
        minPeriodEur: periodFree
          ? null
          : row.extraService?.minPeriodEur == null ||
              !Number.isFinite(Number(row.extraService.minPeriodEur))
            ? null
            : Number(row.extraService.minPeriodEur),
      };
    });
}
