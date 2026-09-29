import { NextResponse } from "next/server";
import { getPublicHelpFaqFlat } from "@/lib/server/help-center-store";

/** Public flat FAQ list (legacy Help accordion). */
export async function GET() {
  try {
    const items = await getPublicHelpFaqFlat();
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[help-faq GET]", error);
    return NextResponse.json({ error: "Could not load help FAQ" }, { status: 500 });
  }
}
