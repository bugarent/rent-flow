import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { resyncAllPartnerListingExtras } from "@/lib/server/resync-partner-listing-extras";

/** One-shot: stamp every partner's cabinet extras onto their car listings. */
export async function POST() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await resyncAllPartnerListingExtras();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[admin/resync-listing-extras]", error);
    return NextResponse.json({ error: "Resync failed" }, { status: 500 });
  }
}
