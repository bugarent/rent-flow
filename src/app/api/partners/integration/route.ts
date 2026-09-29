import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { resolvePartnerId } from "@/lib/server/partner-booking-access";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { ensureCarExportFeed } from "@/lib/server/channel-feeds-store";
import { ensurePartnerWebsiteToken } from "@/lib/server/partner-integration-store";

export async function GET(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cars = await listFileCarsForPartner({
    userId: session.user.id,
    email: session.user.email,
    partnerId,
  });
  const origin = new URL(req.url).origin;
  const websiteToken = await ensurePartnerWebsiteToken(partnerId);
  const rows = [];
  for (const car of cars) {
    const feed = await ensureCarExportFeed(partnerId, car.id);
    rows.push({
      id: car.id,
      label: `${car.make} ${car.model}`.trim() || car.title,
      registrationNumber: car.registrationNumber || "",
      channelUrl: `${origin}/api/channel/ical/${feed.exportToken}`,
    });
  }

  const pageUrl = `${origin}/embed/fleet/${websiteToken}`;
  const embedHtml = [
    `<div id="rentairportcars-fleet"></div>`,
    `<script src="${origin}/embed/fleet.js" data-token="${websiteToken}"></script>`,
  ].join("\n");

  return NextResponse.json({
    website: { pageUrl, embedHtml },
    cars: rows,
  });
}
