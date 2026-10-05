import { NextResponse } from "next/server";
import { quotePlatformCharge } from "@/lib/server/platform-charges";

export const dynamic = "force-dynamic";

/** Today's converted pay-now amount in the visitor's currency, before the transfer. */
export async function GET(request: Request) {
  const amountEur = Number(new URL(request.url).searchParams.get("amountEur"));
  if (!Number.isFinite(amountEur) || amountEur < 0 || amountEur > 1_000_000) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const charge = await quotePlatformCharge(amountEur);
  return NextResponse.json(charge);
}
