import { parseCarDetails } from "@/lib/cars/car-details";
import { worldCountryName } from "@/lib/catalog/world-countries";

export function bodyTypeFromCarDescription(description?: string | null) {
  const type = String(parseCarDetails(description)?.bodyType || "").trim();
  return type || "—";
}

export function countriesFromCarDescription(
  description?: string | null,
  extraIso2s: string[] = [],
) {
  const iso = new Set<string>(extraIso2s.map((c) => c.toUpperCase()).filter(Boolean));
  const details = parseCarDetails(description);
  const places = Array.isArray(details?.pickupPlaces) ? details.pickupPlaces : [];
  for (const place of places) {
    if (!place || typeof place !== "object") continue;
    const row = place as { cityKey?: string; countryIso2?: string };
    const fromKey = String(row.cityKey || "").split("::")[0]?.trim();
    if (fromKey && fromKey.length === 2) iso.add(fromKey.toUpperCase());
    if (row.countryIso2) iso.add(String(row.countryIso2).toUpperCase());
  }
  const labels = [...iso].map((code) => worldCountryName(code) || code).filter(Boolean);
  return labels.length ? labels.join(", ") : "—";
}
