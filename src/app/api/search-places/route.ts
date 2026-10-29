import { NextResponse } from "next/server";
import { cachedSearchDeliveryAirports } from "@/lib/server/public-page-data";

/** Pickup places for the search form when the page was rendered without them (slow first read). */
export async function GET() {
  try {
    const places = await cachedSearchDeliveryAirports();
    return NextResponse.json(Array.isArray(places) ? places : [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[search-places GET]", error);
    return NextResponse.json([], { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
