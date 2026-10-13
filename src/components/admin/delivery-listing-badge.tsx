import { Truck } from "lucide-react";

/** Marks a place where at least one partner listing is set for delivery. */
export function DeliveryListingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
      <Truck className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
