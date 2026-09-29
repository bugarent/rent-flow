import { parseCarDetails, type CarDetailsBlob } from "@/lib/cars/car-details";
import type { PublishedCarSnapshot } from "@/lib/server/car-published-store";
import { toNumber } from "@/lib/utils";

export type CarFieldChange = {
  previous: string;
};

function norm(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function moneyKey(value: unknown): string {
  const n = toNumber(value, Number.NaN);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function placesKey(details: CarDetailsBlob | null): string {
  const places = Array.isArray(details?.pickupPlaces) ? details!.pickupPlaces : [];
  return places
    .map((place) => {
      const row = place as { placeLabel?: string; cityLabel?: string; deliveryLocationId?: string };
      return norm(row.deliveryLocationId || row.placeLabel || row.cityLabel);
    })
    .filter(Boolean)
    .sort()
    .join("|");
}

function tiersKey(details: CarDetailsBlob | null): string {
  const tiers = Array.isArray(details?.pricingTiers) ? details!.pricingTiers : [];
  return tiers
    .map((tier) => `${tier.fromDays}-${tier.toDays}:${moneyKey(tier.priceEur)}`)
    .join("|");
}

function photosKey(urls: string[]): string {
  return [...urls].map((u) => norm(u)).filter(Boolean).sort().join("|");
}

export function diffCarAgainstPublished(input: {
  live: {
    make?: unknown;
    model?: unknown;
    year?: unknown;
    registrationNumber?: unknown;
    seats?: unknown;
    doors?: unknown;
    fuelType?: unknown;
    transmission?: unknown;
    dailyRateEur?: unknown;
    description?: unknown;
    photoUrls?: string[];
    passportFrontUrl?: string | null;
    passportBackUrl?: string | null;
    insuranceUrl?: string | null;
  };
  details: CarDetailsBlob | null;
  snapshot: PublishedCarSnapshot | null | undefined;
}): Map<string, CarFieldChange> {
  const changed = new Map<string, CarFieldChange>();
  const snap = input.snapshot;
  if (!snap) return changed;

  const prevDetails = parseCarDetails(snap.description);
  const mark = (key: string, previous: unknown, current: unknown, asMoney = false) => {
    const prev = asMoney ? moneyKey(previous) : norm(previous);
    const curr = asMoney ? moneyKey(current) : norm(current);
    if (prev === curr) return;
    changed.set(key, { previous: asMoney && prev ? `${prev}€` : prev || "—" });
  };

  mark("dailyRateEur", snap.dailyRateEur, input.live.dailyRateEur, true);

  if ("make" in snap) mark("make", snap.make, input.live.make);
  if ("model" in snap) mark("model", snap.model, input.live.model);
  if ("year" in snap) mark("year", snap.year, input.live.year);
  if ("registrationNumber" in snap || prevDetails?.plate != null) {
    mark(
      "registration",
      snap.registrationNumber || prevDetails?.plate,
      input.live.registrationNumber || input.details?.plate,
    );
  }
  if ("seats" in snap) mark("seats", snap.seats, input.live.seats);
  if ("doors" in snap) mark("doors", snap.doors, input.live.doors);
  if ("fuelType" in snap) mark("fuelType", snap.fuelType, input.live.fuelType);
  if ("transmission" in snap) mark("transmission", snap.transmission, input.live.transmission);

  if (!prevDetails) return changed;

  mark("color", prevDetails.color, input.details?.color);
  mark("bodyType", prevDetails.bodyType, input.details?.bodyType);
  mark("categorySlug", prevDetails.categorySlug, input.details?.categorySlug);
  mark("licenseCat", prevDetails.licenseCat, input.details?.licenseCat);
  mark("minDriverAge", prevDetails.minDriverAge, input.details?.minDriverAge);
  mark("minLicenseYears", prevDetails.minLicenseYears, input.details?.minLicenseYears);
  mark("deposit", prevDetails.deposit, input.details?.deposit, true);
  mark("franchise", prevDetails.franchise, input.details?.franchise);
  mark("franchiseEnabled", prevDetails.franchiseEnabled, input.details?.franchiseEnabled);
  mark("mileageLimit", prevDetails.mileageLimit, input.details?.mileageLimit);
  mark("mileageKm", prevDetails.mileageKm, input.details?.mileageKm);
  mark("engineVolume", prevDetails.engineVolume, input.details?.engineVolume);
  mark("engineHp", prevDetails.engineHp, input.details?.engineHp);
  mark("drive", prevDetails.drive, input.details?.drive);
  mark("ac", prevDetails.ac, input.details?.ac);
  mark("interior", prevDetails.interior, input.details?.interior);
  mark("cardRequired", prevDetails.cardRequired, input.details?.cardRequired);

  const prevPlaces = placesKey(prevDetails);
  const currPlaces = placesKey(input.details);
  if (prevPlaces !== currPlaces) {
    changed.set("pickupPlaces", {
      previous: prevPlaces ? prevPlaces.split("|").join(", ") : "—",
    });
  }

  const prevTiers = tiersKey(prevDetails);
  const currTiers = tiersKey(input.details);
  if (prevTiers !== currTiers) {
    changed.set("pricingTiers", {
      previous: prevTiers
        ? prevTiers
            .split("|")
            .map((row) => row.replace(":", " → "))
            .join("; ")
        : "—",
    });
  }

  const prevTiersList = Array.isArray(prevDetails.pricingTiers) ? prevDetails.pricingTiers : [];
  const currTiersList = Array.isArray(input.details?.pricingTiers) ? input.details!.pricingTiers : [];
  const tierKeys = new Set([
    ...prevTiersList.map((t) => `${t.fromDays}-${t.toDays}`),
    ...currTiersList.map((t) => `${t.fromDays}-${t.toDays}`),
  ]);
  for (const key of tierKeys) {
    const [from, to] = key.split("-").map(Number);
    const prev = prevTiersList.find((t) => t.fromDays === from && t.toDays === to);
    const curr = currTiersList.find((t) => t.fromDays === from && t.toDays === to);
    if (moneyKey(prev?.priceEur) !== moneyKey(curr?.priceEur) || !prev || !curr) {
      changed.set(`tier:${key}`, {
        previous: prev ? `${moneyKey(prev.priceEur)}€` : "—",
      });
    }
  }

  const snapPhotos = Array.isArray((snap as { photoUrls?: string[] }).photoUrls)
    ? ((snap as { photoUrls?: string[] }).photoUrls as string[])
    : [];
  // Photos/docs live outside description — compare when caller supplies live URLs.
  if (input.live.photoUrls) {
    const prev = photosKey(snapPhotos);
    const curr = photosKey(input.live.photoUrls);
    if (prev !== curr && (prev || curr)) {
      changed.set("photos", { previous: prev ? `${snapPhotos.length} photo(s)` : "—" });
    }
  }
  if (input.live.passportFrontUrl != null || input.live.passportBackUrl != null) {
    const prevFront = norm((snap as { passportFrontUrl?: string }).passportFrontUrl);
    const prevBack = norm((snap as { passportBackUrl?: string }).passportBackUrl);
    if (prevFront !== norm(input.live.passportFrontUrl) || prevBack !== norm(input.live.passportBackUrl)) {
      if (prevFront || prevBack || input.live.passportFrontUrl || input.live.passportBackUrl) {
        changed.set("passport", { previous: "previous docs" });
      }
    }
  }
  if (input.live.insuranceUrl != null) {
    const prevIns = norm((snap as { insuranceUrl?: string }).insuranceUrl);
    if (prevIns !== norm(input.live.insuranceUrl) && (prevIns || input.live.insuranceUrl)) {
      changed.set("insurance", { previous: prevIns || "—" });
    }
  }

  return changed;
}

export function fieldChangesMapFromRecord(
  record: Record<string, CarFieldChange> | null | undefined,
): Map<string, CarFieldChange> {
  const map = new Map<string, CarFieldChange>();
  if (!record) return map;
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    map.set(key, { previous: String(value.previous ?? "—") });
  }
  return map;
}
