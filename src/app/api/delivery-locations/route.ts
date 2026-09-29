import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";

/** Delivery location catalog for partner pickers. Use ?all=1 to include inactive rows. */
export async function GET(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const countriesParam = url.searchParams.get("countries");
    const includeInactive =
      url.searchParams.get("all") === "1" || url.searchParams.get("includeInactive") === "1";
    const countrySet = countriesParam
      ? new Set(
          countriesParam
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean),
        )
      : null;

    let locations = await listDeliveryLocations({ activeOnly: !includeInactive });
    if (countrySet && countrySet.size) {
      locations = locations.filter((loc) => countrySet.has((loc.countryIso2 || "").toUpperCase()));
    }
    locations = [...locations].sort(
      (a, b) =>
        a.countryIso2.localeCompare(b.countryIso2) ||
        (a.kind === b.kind ? 0 : a.kind === "city" ? 1 : -1) ||
        a.label.localeCompare(b.label),
    );
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("[delivery-locations GET]", error);
    return NextResponse.json({ error: "Could not load delivery locations" }, { status: 500 });
  }
}
