import { NextResponse } from "next/server";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";

export async function GET() {
  try {
    const config = await getHelpCenterConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[help-center GET]", error);
    return NextResponse.json({ error: "Could not load help center" }, { status: 500 });
  }
}
