import { apiError, apiOk, authenticatePartnerApi } from "@/lib/server/partner-api-auth";
import { findPartnerOwnedCar } from "@/lib/server/partner-owned-cars";
import { ApiInputError, parseAvailabilityBlocks } from "@/lib/server/partner-api-v1";
import {
  getCarApiAvailability,
  replaceCarApiAvailability,
} from "@/lib/server/partner-api-availability-store";

type Ctx = { params: Promise<{ id: string }> };

function toApiBlocks(blocks: Array<{ start: string; end: string; reference?: string }>) {
  return blocks.map((b) => ({ start_date: b.start, end_date: b.end, reference: b.reference || null }));
}

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const car = await findPartnerOwnedCar(auth.owner, (await params).id);
  if (!car) return apiError(404, "vehicle_not_found", "No vehicle with this id or external_id.");
  const row = await getCarApiAvailability(car.id);
  return apiOk({ data: { vehicle_id: car.id, blocked: toApiBlocks(row?.blocks || []), updated_at: row?.updatedAt || null } });
}

/** Replaces the full list of busy ranges. Overlaps with site bookings are accepted and reported. */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const car = await findPartnerOwnedCar(auth.owner, (await params).id);
  if (!car) return apiError(404, "vehicle_not_found", "No vehicle with this id or external_id.");
  const body = await req.json().catch(() => null);
  try {
    const blocks = parseAvailabilityBlocks(body);
    const saved = await replaceCarApiAvailability(car.id, auth.owner.partnerId, blocks);

    const { resetApiBlockCache } = await import("@/lib/server/channel-sync");
    resetApiBlockCache();
    const { noteReservationPublished } = await import("@/lib/server/channel-publish");
    await noteReservationPublished(car.id);

    const { carIdsBookedInRange } = await import("@/lib/server/car-availability");
    const conflicts: Array<{ start_date: string; end_date: string }> = [];
    for (const block of blocks) {
      const booked = await carIdsBookedInRange(new Date(block.start), new Date(block.end)).catch(
        () => new Set<string>(),
      );
      if (booked.has(car.id)) conflicts.push({ start_date: block.start, end_date: block.end });
    }

    return apiOk({
      data: {
        vehicle_id: car.id,
        blocked: toApiBlocks(saved.blocks),
        updated_at: saved.updatedAt,
        conflicts_with_site_bookings: conflicts,
      },
    });
  } catch (error) {
    if (error instanceof ApiInputError) return apiError(error.status, error.code, error.message);
    console.error("[api/v1 availability PUT]", error);
    return apiError(500, "server_error", "Could not save availability.");
  }
}
