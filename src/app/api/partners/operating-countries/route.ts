import { NextResponse } from "next/server";
import { listPartnerOperatingCountries } from "@/lib/server/partner-operating-countries";

export async function GET() {
  try {
    const countries = await listPartnerOperatingCountries();
    return NextResponse.json({ countries });
  } catch {
    return NextResponse.json({ countries: [] });
  }
}
