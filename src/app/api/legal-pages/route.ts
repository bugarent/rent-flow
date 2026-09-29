import { NextResponse } from "next/server";
import { getPublicLegalPages } from "@/lib/server/legal-pages-store";

/** Public read of CMS Terms / Privacy for checkout modals and similar. */
export async function GET() {
  try {
    const legal = await getPublicLegalPages();
    return NextResponse.json({
      terms: {
        body: legal.terms.body,
        fileUrl: legal.terms.fileUrl,
      },
      privacy: {
        body: legal.privacy.body,
        fileUrl: legal.privacy.fileUrl,
      },
    });
  } catch (error) {
    console.error("[legal-pages GET]", error);
    return NextResponse.json({ error: "Failed to load legal pages" }, { status: 500 });
  }
}
