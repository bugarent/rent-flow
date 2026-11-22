/** Shared cabinet-pref → listing rules (client + server). */

export type PartnerExtraPrefScope = {
  carIds?: string[];
  enabled?: boolean;
  forbidden?: boolean;
  added?: boolean;
};

/**
 * Whether a cabinet pref should change a specific car listing.
 * - omitted carIds → all cars (legacy)
 * - non-empty carIds → only those cars
 * - empty carIds + enabled → applies to no cars (explicitly none selected)
 * - empty carIds + off/forbid → all cars (older saves left [] and listings stayed "on")
 */
export function partnerExtraPrefAppliesToCar(
  pref: PartnerExtraPrefScope,
  carId: string | null | undefined,
): boolean {
  const id = String(carId || "").trim();
  if (!id) return true;
  if (!pref.carIds) return true;
  if (pref.carIds.length === 0) {
    return Boolean(pref.forbidden) || pref.enabled === false;
  }
  if (pref.carIds.includes(id)) return true;
  // File listings sometimes keep a bare id while prefs store `file-partner-…` (or the reverse).
  const bare = id.replace(/^file-partner-/, "");
  const prefixed = id.startsWith("file-partner-") ? id : `file-partner-${id}`;
  return pref.carIds.some((raw) => {
    const other = String(raw || "").trim();
    if (!other) return false;
    if (other === id || other === bare || other === prefixed) return true;
    const otherBare = other.replace(/^file-partner-/, "");
    return Boolean(bare) && otherBare === bare;
  });
}

/**
 * Cabinet On or Forbidden for this car → show on listing forms / customer offers.
 * Cabinet Off (or not on this car / removed from the partner list) → hide everywhere.
 */
export function partnerExtraOfferedOnListing(
  pref: PartnerExtraPrefScope | null | undefined,
  carId?: string | null,
): boolean {
  if (!pref) return false;
  if (pref.added === false) return false;
  if (!partnerExtraPrefAppliesToCar(pref, carId)) return false;
  if (pref.forbidden) return true;
  return pref.enabled !== false;
}

/** Cabinet Off or removed — hide on ads/listings (Forbidden still shows as a notice). */
export function partnerExtraHiddenOnListing(
  pref: PartnerExtraPrefScope | null | undefined,
  carId?: string | null,
): boolean {
  if (!pref) return false;
  if (!partnerExtraPrefAppliesToCar(pref, carId)) return false;
  if (pref.added === false) return true;
  if (pref.forbidden) return false;
  return pref.enabled === false;
}
