"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ReserveCheckout } from "@/components/cars/reserve-checkout";

type Props = {
  params: Promise<{ id: string }>;
  /** Public car payload rendered on the server (same shape as GET /api/cars/[id]). */
  initialCar?: Record<string, unknown> | null;
  /** `startDate|endDate` the initial car was priced for. */
  initialRange?: string;
};

export function CarBookingClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500">Loading…</div>
      }
    >
      <CarBookingForm {...props} />
    </Suspense>
  );
}

function CarBookingForm({ params, initialCar, initialRange }: Props) {
  const { id: carId } = use(params);
  const searchParams = useSearchParams();

  return (
    <ReserveCheckout
      carId={carId}
      startDate={searchParams.get("startDate") || ""}
      endDate={searchParams.get("endDate") || ""}
      pickup={searchParams.get("pickup") || "KUT"}
      dropoff={searchParams.get("dropoff") || searchParams.get("pickup") || "KUT"}
      pickupAddress={searchParams.get("pickupAddress") || ""}
      dropoffAddress={searchParams.get("dropoffAddress") || ""}
      initialCar={initialCar}
      initialRange={initialRange}
    />
  );
}
