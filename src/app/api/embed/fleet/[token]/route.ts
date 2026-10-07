import { NextResponse } from "next/server";
import { getPartnerIdByWebsiteToken } from "@/lib/server/partner-integration-store";
import { isPublicFileCar, listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { takeRateLimit } from "@/lib/rate-limit";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=120",
  "X-Robots-Tag": "noindex, nofollow",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const limit = takeRateLimit(`embed-fleet:${token.slice(0, 12)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: cors });
  }
  const partnerId = await getPartnerIdByWebsiteToken(token);
  if (!partnerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: cors });
  }
  const cars = await listFileCarsForPartner({ partnerId });
  const origin = new URL(req.url).origin;
  return NextResponse.json(
    {
      cars: cars
        .filter((car) => isPublicFileCar(car))
        .map((car) => ({
          id: car.id,
          label: `${car.make} ${car.model}`.trim() || car.title,
          registrationNumber: car.registrationNumber || "",
          year: car.year,
          href: `${origin}/cars/${car.id}`,
          photo: car.photos?.[0] || "",
        })),
    },
    { headers: cors },
  );
}
