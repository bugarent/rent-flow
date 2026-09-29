"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ReserveCheckout } from "@/components/cars/reserve-checkout";

export function CarBookingClient({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500">Loading…</div>
      }
    >
      <CarBookingForm params={params} />
    </Suspense>
  );
}

function CarBookingForm({ params }: { params: Promise<{ id: string }> }) {
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
    />
  );
}
