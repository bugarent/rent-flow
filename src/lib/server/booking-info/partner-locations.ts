import "server-only";

import { formatPartnerCode } from "@/lib/ids";
import { parsePartnerMessengers } from "@/lib/partner";
import { parseCompanySettings } from "@/lib/partners/company-settings";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { normalizeLogin } from "@/lib/crypto";
import type { DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import type { FileCarListing } from "@/lib/server/partner-cars-store";
import { withDeliveryFees } from "./delivery";
import type { BookingInfoLocationOption, BookingInfoPartnerPayload } from "./types";

export async function resolvePartnerPayload(input: {
  partnerId?: string | null;
  emailHint?: string | null;
  companyName?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  messengers?: unknown;
  messenger?: string | null;
  companySettings?: unknown;
  logoUrl?: string | null;
  sequentialNumber?: number | null;
}): Promise<BookingInfoPartnerPayload> {
  const emailHint = String(input.emailHint || "").trim();
  let sequentialNumber =
    input.sequentialNumber != null && Number.isFinite(input.sequentialNumber)
      ? Number(input.sequentialNumber)
      : null;

  if (sequentialNumber == null && emailHint) {
    try {
      const { findFilePartnerSequentialByEmail } = await import(
        "@/lib/server/partner-applications-store"
      );
      sequentialNumber = await findFilePartnerSequentialByEmail(emailHint);
    } catch {
      /* ignore */
    }
  }

  if (sequentialNumber == null) {
    const local = loadLocalPartner();
    const pid = String(input.partnerId || "");
    if (
      local?.sequentialNumber != null &&
      (pid === LOCAL_PARTNER_ID ||
        pid === local.id ||
        pid === `file-partner-${LOCAL_PARTNER_ID}` ||
        (emailHint && local.email && normalizeLogin(local.email) === normalizeLogin(emailHint)))
    ) {
      sequentialNumber = local.sequentialNumber;
    }
  }

  let companyName = String(input.companyName || "").trim();
  let phone = String(input.phone || "").trim();
  let secondaryPhone = String(input.secondaryPhone || "").trim();
  let logoUrl = input.logoUrl || null;
  let email = emailHint;
  let messengers: string[] = [];
  let primaryMessengers: string[] = [];
  let secondaryMessengers: string[] = [];
  let clientLanguages: string[] = [];

  const legacy = parsePartnerMessengers(input.messengers, input.messenger || undefined);
  try {
    const { readCompanySettingsFile } = await import(
      "@/lib/server/partner-company-settings-store"
    );
    const ids = [String(input.partnerId || "").trim()].filter(Boolean);
    if (ids[0]?.startsWith("file-partner-")) {
      const stripped = ids[0].replace(/^file-partner-/, "");
      if (stripped && !ids.includes(stripped)) ids.push(stripped);
    }
    if (!ids.includes(LOCAL_PARTNER_ID)) ids.push(LOCAL_PARTNER_ID);

    let settings = null;
    for (const id of ids) {
      settings = await readCompanySettingsFile(id);
      if (settings) break;
    }
    if (settings || input.companySettings) {
      const company = parseCompanySettings(settings || input.companySettings, {
        companyName,
        phone,
        secondaryPhone,
        messengers: legacy,
        messenger: input.messenger || undefined,
        email: emailHint || undefined,
      });
      companyName = company.legalName || company.title || companyName;
      phone = company.primaryPhone || phone;
      secondaryPhone = String(company.secondaryPhone || secondaryPhone || "").trim();
      email = company.email || email;
      if (company.logoUrl) logoUrl = company.logoUrl;
      primaryMessengers = [...(company.primaryMessengers || [])];
      secondaryMessengers = [...(company.secondaryMessengers || [])];
      messengers = [...new Set([...primaryMessengers, ...secondaryMessengers, ...legacy])];
      clientLanguages = Array.isArray(company.clientLanguages)
        ? company.clientLanguages.map(String)
        : [];
    } else {
      messengers = legacy;
      primaryMessengers = legacy;
    }
  } catch {
    messengers = legacy;
    primaryMessengers = legacy;
  }

  if (!companyName && email) companyName = email;

  return {
    companyName,
    partnerCode: formatPartnerCode(sequentialNumber),
    sequentialNumber,
    email,
    phone,
    secondaryPhone,
    messengers,
    primaryMessengers,
    secondaryMessengers,
    clientLanguages,
    logoUrl,
  };
}

export async function resolveCountryIso2ForIata(iataRaw: string): Promise<string> {
  const iata = String(iataRaw || "").trim().toUpperCase();
  if (!iata) return "";
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const locs = await listDeliveryLocations({ activeOnly: false });
    const loc = locs.find((l) => String(l.iata || "").toUpperCase() === iata);
    const iso = String(loc?.countryIso2 || "").trim().toUpperCase();
    if (iso) return iso;
  } catch {
    /* fall through */
  }
  try {
    const { CATALOG_AIRPORTS } = await import("@/lib/catalog/airports");
    const hit = CATALOG_AIRPORTS.find((a) => a.iata.toUpperCase() === iata);
    return String(hit?.countryIso2 || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export async function resolveLocationOptions(
  fileCar: FileCarListing | null,
  extraIatas: string[] = [],
  countryIso2?: string,
  feeRows: DeliveryPriceRowLike[] = [],
): Promise<BookingInfoLocationOption[]> {
  const country = String(countryIso2 || "").trim().toUpperCase();
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const locs = await listDeliveryLocations({ activeOnly: false });
    const inCountry = (loc: { countryIso2?: string | null; iata?: string | null }) => {
      if (!country) return true;
      return String(loc.countryIso2 || "").toUpperCase() === country;
    };
    const byId = new Map(locs.map((l) => [l.id, l]));
    const byIata = new Map(locs.map((l) => [String(l.iata || "").toUpperCase(), l]));
    const out = new Map<string, { iata: string; label: string }>();

    for (const dp of fileCar?.deliveryPrices || []) {
      const loc = byId.get(dp.deliveryLocationId);
      if (!loc || !inCountry(loc)) continue;
      const iata = String(loc.iata || "").toUpperCase();
      if (!iata || out.has(iata)) continue;
      out.set(iata, { iata, label: loc.label || iata });
    }
    for (const raw of extraIatas) {
      const iata = String(raw || "").trim().toUpperCase();
      if (!iata || out.has(iata)) continue;
      const loc = byIata.get(iata);
      if (loc && !inCountry(loc)) continue;
      out.set(iata, { iata, label: loc?.label || iata });
    }
    // Always offer other active locations in the same booking country
    for (const loc of locs.filter((l) => l.isActive && inCountry(l))) {
      const iata = String(loc.iata || "").toUpperCase();
      if (!iata || out.has(iata)) continue;
      out.set(iata, { iata, label: loc.label || iata });
    }
    return withDeliveryFees([...out.values()].sort((a, b) => a.label.localeCompare(b.label)), feeRows);
  } catch {
    return withDeliveryFees(
      extraIatas
        .map((i) => String(i || "").trim().toUpperCase())
        .filter(Boolean)
        .map((iata) => ({ iata, label: iata })),
      feeRows,
    );
  }
}

export async function resolveAirportLabels(iataRaw: string, address?: string) {
  const iata = String(iataRaw || "").trim().toUpperCase();
  const addr = String(address || "").trim();
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const locs = await listDeliveryLocations({ activeOnly: false });
    const loc = locs.find((l) => String(l.iata || "").toUpperCase() === iata);
    if (loc) {
      return {
        iata: loc.iata || iata,
        city: loc.country || loc.label || iata,
        name: addr || loc.label || iata,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    iata: iata || "—",
    city: iata || "—",
    name: addr || iata || "—",
  };
}
