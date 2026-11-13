import { isMandatoryExtra } from "@/lib/extras/pricing";
import { resolveCheckoutSlot } from "@/lib/extras/checkout-slot";
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
