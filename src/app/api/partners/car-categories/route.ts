import { NextResponse } from "next/server";
import { getAdminSession, getPartnerSession } from "@/lib/auth/sessions";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";
import { ensureHomepageDefaults } from "@/lib/server/homepage";

/** Active homepage categories for partner car create/edit dropdown (admin may also load for remodeation). */
export async function GET() {
  try {
    const partnerSession = await getPartnerSession();
    const adminSession = await getAdminSession();
    const isPartner =
      Boolean(partnerSession?.user) &&
      (partnerSession!.user.role === "VENDOR" || partnerSession!.user.id === LOCAL_PARTNER_ID);
    const isAdmin = adminSession?.user.role === "ADMIN";
    if (!isPartner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await ensureHomepageDefaults();
    } catch {
      /* DB may be offline — file store still works */
    }

    const rows = await listHomepageCategories();
    const active = rows
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
      }));

    return NextResponse.json(active);
  } catch (error) {
    console.error("[partners/car-categories GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load categories" },
      { status: 500 },
    );
  }
}
