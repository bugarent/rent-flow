import "server-only";

import { clearAvailabilityCache } from "@/lib/server/cache/availability-cache";
import { touchChannelFeedsForCar } from "@/lib/server/channel-feeds-store";

/** Drop search cache and refresh outbound calendars after a hold is saved. */
export async function noteReservationPublished(carId: string) {
  await clearAvailabilityCache();
  await touchChannelFeedsForCar(carId);
}
