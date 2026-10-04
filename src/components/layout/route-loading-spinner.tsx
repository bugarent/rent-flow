export function RouteLoadingSpinner({
  label = "Loading…",
  seconds = null,
}: {
  label?: string;
  /** Countdown shown inside the ring; null shows the ring alone. */
  seconds?: number | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/35 backdrop-blur-[1px]"
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200">
        <span
          aria-hidden
          className="absolute h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"
        />
        {seconds !== null ? (
          <span aria-hidden className="relative text-lg font-extrabold tabular-nums text-sky-700">
            {seconds}
          </span>
        ) : null}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
