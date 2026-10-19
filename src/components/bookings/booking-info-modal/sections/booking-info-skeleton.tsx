import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <Skeleton className="h-4 w-32" />
      <SkeletonLines rows={rows} />
    </div>
  );
}

/** Booking details placeholder in the same two-column layout as the loaded modal. */
export function BookingInfoSkeleton({ calendarView = false }: { calendarView?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        calendarView ? "p-2 sm:p-3" : "p-4 sm:p-5",
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="space-y-4 lg:col-start-2 lg:row-start-1">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <CardSkeleton rows={3} />
        </div>
        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={4} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
