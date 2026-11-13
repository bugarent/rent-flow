import {
  clampPartnerDailyPrice,
  isMandatoryExtra,
  isMandatoryFreeExtra,
  isPeriodForcedFreeExtra,
} from "@/lib/extras/pricing";
import { isListingInsuranceService, resolveCheckoutSlot } from "@/lib/extras/checkout-slot";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";

type ChoiceService = Parameters<typeof isMandatoryExtra>[0] & {
  id?: string;
  checkoutSlot?: unknown;
  name?: string;
};

/**
 * Admin-mandatory extras (insurance included) stay on: the partner cannot turn them off
 * or forbid them, and listings always carry them as enabled.
 */
export function partnerStatusLocked(service: ChoiceService): boolean {
  return isMandatoryExtra(service);
}

/** Always on a partner's list: TPL, admin-mandatory services and border crossing (switched on the Delivery page). */
export function partnerServiceAlwaysAdded(service: ChoiceService): boolean {
  if (partnerStatusLocked(service)) return true;
  const slug = service.slug ?? undefined;
  if (isCrossBorderExtra({ id: service.id, slug })) return true;
  return (
    resolveCheckoutSlot({
      checkoutSlot: service.checkoutSlot,
      slug,
      isTpl: Boolean(service.isTpl),
      name: service.name,
    }) === "tpl"
  );
}

/**
 * Whether the partner put this service on their own list.
 * Saved choice wins; older saves without the flag count a service as added when it is switched on,
 * forbidden, or already offered on one of the partner's cars.
 */
export function partnerServiceAdded(
  service: ChoiceService,
  pref: { added?: boolean; enabled?: boolean; forbidden?: boolean } | null | undefined,
  usedOnCar = false,
): boolean {
  if (partnerServiceAlwaysAdded(service)) return true;
  if (typeof pref?.added === "boolean") return pref.added;
  return Boolean(pref?.enabled || pref?.forbidden || usedOnCar);
}

/** One service as the partner's cabinet shows it: on the list, default state and daily price (EUR). */
export function partnerCabinetDefaults(
  service: ChoiceService & {
    minPriceEur: number | null;
    maxPriceEur: number | null;
    maxPeriodEur?: number | null;
    defaultPriceEur?: number | null;
  },
  pref: { added?: boolean; enabled?: boolean; forbidden?: boolean; priceEur?: number } | null | undefined,
  usedOnCar = false,
): { added: boolean; enabled: boolean; forbidden: boolean; priceEur: number } {
  const locked = partnerStatusLocked(service);
  const added = partnerServiceAdded(service, pref, usedOnCar);
  const forbidden = locked || !added ? false : Boolean(pref?.forbidden);
  const insuranceDefault =
    !pref &&
    isListingInsuranceService({
      checkoutSlot: service.checkoutSlot,
      slug: service.slug ?? undefined,
      isTpl: Boolean(service.isTpl),
      name: service.name,
    });
  const priceEur =
    isMandatoryFreeExtra(service) || forbidden || isPeriodForcedFreeExtra(service)
      ? 0
      : clampPartnerDailyPrice(
          service.minPriceEur,
          service.maxPriceEur,
          isMandatoryExtra(service)
            ? pref?.priceEur ?? 0
            : pref?.priceEur ?? service.defaultPriceEur ?? service.minPriceEur ?? 0,
        );
  const enabled = locked
    ? true
    : !added
      ? false
      : forbidden
        ? true
        : pref
          ? Boolean(pref.enabled)
          : insuranceDefault;
  return { added, enabled, forbidden, priceEur };
}
