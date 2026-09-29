import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { formatPartnerCode } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { getPartnerOperatingAirports } from "@/lib/server/partner-airports";
import { listPartnerScopedDeliveryLocations } from "@/lib/server/delivery-locations";
import { resolvePartnerSeasonalPricing } from "@/lib/server/partner-seasonal-pricing-store";
import { emptySeasonalPricing } from "@/lib/partners/seasonal-pricing";
import {
  resolveCompanySettings,
  readCompanySettingsFile,
} from "@/lib/server/partner-company-settings-store";
import {
  DEFAULT_PARTNER_PRICING_CURRENCY,
  type PartnerPricingCurrency,
} from "@/lib/partners/company-settings";
import { getFxRates } from "@/lib/server/preferences";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";

/** Current partner profile + delivery catalog from personal-info locations. */
export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let partnerId: string | null = null;
    let companyName = "";
    let status = "APPROVED";
    let sequentialNumber: number | null = null;
    let telegramChatId: string | null = null;
    let telegramUsername: string | null = null;
    let telegramVerifiedAt: Date | null = null;
    let partnerRow: {
      id: string;
      companyName: string;
      status: string;
      sequentialNumber: number | null;
      email?: string | null;
      phone?: string | null;
      secondaryPhone?: string | null;
      messengers?: unknown;
      messenger?: string | null;
      operatingCountryIso2s?: unknown;
      companySettings?: unknown;
      telegramChatId?: string | null;
      telegramUsername?: string | null;
      telegramVerifiedAt?: Date | null;
    } | null = null;

    try {
      partnerRow = await prisma.partner.findUnique({
        where: { userId: session.user.id },
      });
      if (partnerRow) {
        partnerId = partnerRow.id;
        companyName = partnerRow.companyName;
        status = partnerRow.status;
        sequentialNumber = partnerRow.sequentialNumber;
        telegramChatId = partnerRow.telegramChatId ?? null;
        telegramUsername = partnerRow.telegramUsername ?? null;
        telegramVerifiedAt = partnerRow.telegramVerifiedAt ?? null;
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    // Local / offline partner — same file id used by personal-info settings
    if (!partnerId) {
      const local = loadLocalPartner();
      const email = session.user.email;
      if (
        session.user.id === LOCAL_PARTNER_ID ||
        local?.id === session.user.id ||
        (email && local?.email && email.toLowerCase() === local.email.toLowerCase())
      ) {
        partnerId = LOCAL_PARTNER_ID;
        companyName = local?.companyName || "Partner";
        status = "APPROVED";
      } else {
        // Session id may itself be a file-store partner key
        const file = await readCompanySettingsFile(session.user.id);
        if (file) {
          partnerId = session.user.id;
          companyName = file.title || file.legalName || "Partner";
          status = "APPROVED";
        }
      }
    }

    if (!partnerId) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }

    let airports: Awaited<ReturnType<typeof getPartnerOperatingAirports>> = [];
    try {
      airports = await getPartnerOperatingAirports(partnerId);
    } catch {
      airports = [];
    }
    let countryIso2s = [...new Set(airports.map((a) => a.countryIso2))];

    let seasonalPricing = emptySeasonalPricing();
    try {
      if (partnerRow) {
        seasonalPricing = await resolvePartnerSeasonalPricing(partnerRow);
      }
    } catch {
      seasonalPricing = emptySeasonalPricing();
    }

    let tariffs = [
      { fromDays: 1, toDays: 3 },
      { fromDays: 4, toDays: 5 },
      { fromDays: 6, toDays: 30 },
    ];
    let pricingCurrency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY;
    let deliveryLocationIds: string[] = [];
    let deliveryCatalog: Awaited<ReturnType<typeof listPartnerScopedDeliveryLocations>> = [];

    try {
      const company = partnerRow
        ? await resolveCompanySettings(partnerRow)
        : (await readCompanySettingsFile(partnerId)) ||
          (await resolveCompanySettings({
            id: partnerId,
            companyName,
            email: session.user.email || "",
            phone: "",
          }));
      if (company.tariffs?.length) tariffs = company.tariffs;
      pricingCurrency = company.pricingCurrency;
      deliveryLocationIds = company.deliveryLocationIds || [];
      if (company.seasonalPricing?.seasons?.length) {
        seasonalPricing = {
          enabled: true,
          seasons: company.seasonalPricing.seasons,
        };
      } else if (!seasonalPricing.enabled && company.seasonalPricing?.enabled) {
        seasonalPricing = company.seasonalPricing;
      }
      if (!companyName && (company.title || company.legalName)) {
        companyName = company.title || company.legalName;
      }
      if (!countryIso2s.length && company.deliveryCountryIso2s?.length) {
        countryIso2s = company.deliveryCountryIso2s.map((c) => c.toUpperCase());
      }
    } catch {
      /* defaults */
    }

    try {
      deliveryCatalog = await listPartnerScopedDeliveryLocations(partnerId);
    } catch {
      deliveryCatalog = [];
    }

    // If scoped catalog empty but personal-info has ids, resolve existing locations only (no create-on-read).
    if (!deliveryCatalog.length && deliveryLocationIds.length) {
      try {
        const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
        const { normalizeLocationCode } = await import("@/lib/catalog/search-places");
        const all = await listDeliveryLocations({ activeOnly: false });
        const byId = new Map(all.map((l) => [l.id, l]));
        const byCode = new Map(
          all.map((l) => [normalizeLocationCode(l.iata).toUpperCase(), l]),
        );
        const out = [];
        const seen = new Set<string>();
        for (const id of deliveryLocationIds) {
          const hit =
            byId.get(id) ||
            byCode.get(normalizeLocationCode(id).toUpperCase());
          if (!hit || seen.has(hit.id)) continue;
          seen.add(hit.id);
          out.push(hit);
        }
        deliveryCatalog = out;
      } catch {
        /* keep empty */
      }
    }

    // Read-only on GET — do not assign sequential codes here (that was a write on every page open).
    const seq = sequentialNumber;

    const fxRates = await getFxRates();

    return NextResponse.json({
      id: partnerId,
      companyName,
      status,
      sequentialNumber: seq,
      partnerCode: formatPartnerCode(seq),
      telegramVerified: Boolean(telegramChatId && telegramVerifiedAt),
      telegramUsername,
      countryIso2s,
      airports,
      deliveryCatalog,
      deliveryLocationIds,
      seasonalPricing,
      tariffs,
      pricingCurrency,
      fxRates,
    });
  } catch (error) {
    console.error("[partners/me GET]", error);
    return NextResponse.json({ error: "Could not load partner profile" }, { status: 500 });
  }
}
