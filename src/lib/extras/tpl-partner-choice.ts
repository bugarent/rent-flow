/** System TPL pack. Other extras that reuse the TPL checkout slot are not this pack. */
export function isCoreTplSlug(slug: string | null | undefined): boolean {
  return String(slug || "").toLowerCase().trim() === "tpl";
}

/**
 * Partners may switch TPL on or off only when every country they operate in
 * is on the admin list. A partner who also works in a mandatory country stays locked.
 * An empty list means TPL stays mandatory everywhere.
 */
export function tplChoiceCoversPartner(partnerIso2s: string[], optionalIso2s: string[]): boolean {
  const optional = new Set(
    optionalIso2s.map((iso) => iso.trim().toUpperCase()).filter((iso) => iso.length === 2),
  );
  const countries = [
    ...new Set(partnerIso2s.map((iso) => iso.trim().toUpperCase()).filter((iso) => iso.length === 2)),
  ];
  if (!optional.size || !countries.length) return false;
  return countries.every((iso) => optional.has(iso));
}

export function withTplPartnerChoice<T extends { slug?: string | null }>(
  services: T[],
  canToggle: boolean,
): T[] {
  if (!canToggle) return services;
  return services.map((service) =>
    isCoreTplSlug(service.slug) ? { ...service, partnerCanToggleTpl: true } : service,
  );
}
