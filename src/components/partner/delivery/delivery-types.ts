import { capFreeAfterDays, type DeliveryLocationView } from "@/lib/delivery/pricing";

export type DeliveryRowState = {
  location: DeliveryLocationView;
  enabled: boolean;
  priceEur: string;
  freeAfterDays: string;
  travelHours: string;
  travelMinutes: string;
  maxDeliveryPriceEur: number;
};

export type DeliveryAddOption = {
  id: string;
  code: string;
  label: string;
  kind: "airport" | "city";
  cityName: string;
  countryIso2: string;
};

type PanelItem = {
  location: DeliveryLocationView;
  enabled: boolean;
  priceEur: number;
  freeAfterDays: number | null;
  travelTimeMinutes: number;
  maxDeliveryPriceEur: number;
};

export function rowsFromItems(items: unknown): DeliveryRowState[] {
  if (!Array.isArray(items)) return [];
  return (items as PanelItem[]).map((item) => {
    const mins = Math.max(0, Number(item.travelTimeMinutes) || 0);
    return {
      location: item.location,
      enabled: item.enabled === true,
      priceEur: String(item.priceEur ?? 0),
      freeAfterDays: String(item.freeAfterDays ?? 0),
      travelHours: String(Math.floor(mins / 60)),
      travelMinutes: String(mins % 60),
      maxDeliveryPriceEur: Number(item.maxDeliveryPriceEur) || 0,
    };
  });
}

export function optionsFromResponse(raw: unknown): Record<string, DeliveryAddOption[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, DeliveryAddOption[]> = {};
  for (const [iso, list] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(list)) out[iso.toUpperCase()] = list as DeliveryAddOption[];
  }
  return out;
}

export function prefsPayload(rows: DeliveryRowState[]) {
  return rows.map((row) => ({
    deliveryLocationId: row.location.id,
    enabled: row.enabled,
    priceEur: Number(row.priceEur) || 0,
    freeAfterDays: (() => {
      const parsed = Math.max(0, Math.floor(Number(row.freeAfterDays) || 0));
      return capFreeAfterDays(row.location.maxFreeAfterDays, parsed).freeAfterDays ?? 0;
    })(),
    travelTimeMinutes:
      Math.max(0, Math.floor(Number(row.travelHours) || 0)) * 60 +
      Math.max(0, Math.floor(Number(row.travelMinutes) || 0)),
  }));
}

export function cityKey(loc: DeliveryLocationView) {
  return (loc.cityName || loc.country || loc.countryIso2 || "Other").trim();
}

export function placeLabel(loc: DeliveryLocationView, locale: string) {
  if (loc.kind === "city") {
    return locale === "ka" ? "ქალაქში მიწოდება" : locale === "ru" ? "Доставка по городу" : "City delivery";
  }
  return loc.label;
}

function norm(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

/** Whether an add option is the same place as a delivery row (catalog id or place code). */
export function optionMatchesRow(option: DeliveryAddOption, row: DeliveryRowState) {
  if (option.id === row.location.id) return true;
  const code = norm(option.code);
  return Boolean(code) && (norm(row.location.iata) === code || norm(row.location.airportId) === code);
}
