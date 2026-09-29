import { NextResponse } from "next/server";
import { buildCarChannelIcal } from "@/lib/server/channel-export";
import { getChannelFeedByToken } from "@/lib/server/channel-feeds-store";
import { getFileCar } from "@/lib/server/partner-cars-store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const feed = await getChannelFeedByToken(token);
  if (!feed) {
    return new NextResponse("Not found", { status: 404 });
  }
  const car = await getFileCar(feed.carId);
  const label = car ? `${car.make} ${car.model}`.trim() : "RentAirportCars";
  const body = await buildCarChannelIcal(feed.carId, label);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${feed.carId}.ics"`,
      "Cache-Control": "private, max-age=120",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
