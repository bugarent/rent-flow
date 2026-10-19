import { cn } from "@/lib/utils";

/** Animated placeholder block shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

/** A few text-like lines; the last one is shorter. */
export function SkeletonLines({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === rows - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

function SkeletonBody() {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <SkeletonLines rows={2} />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <SkeletonLines rows={3} />
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

const MODAL_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
} as const;

/**
 * Modal frame drawn on the same click while a lazily loaded modal's code
 * downloads (next/dynamic `loading`), so the overlay never waits on the network.
 */
export function ModalSkeleton({ size = "md", label = "Loading…" }: { size?: keyof typeof MODAL_WIDTH; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[260] flex items-end justify-center bg-slate-950/45 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
    >
      <div
        className={cn(
          "max-h-[90dvh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200",
          MODAL_WIDTH[size],
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <SkeletonBody />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Same placeholder for panels that are not centered overlays (chat widget). */
export function PanelSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3 bg-[#1d6fe8] px-4 py-3">
        <Skeleton className="h-4 w-32 bg-white/40" />
        <Skeleton className="h-8 w-8 rounded-full bg-white/40" />
      </div>
      <SkeletonBody />
      <span className="sr-only">{label}</span>
    </div>
  );
}
