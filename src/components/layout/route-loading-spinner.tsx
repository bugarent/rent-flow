export function RouteLoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/35 backdrop-blur-[1px]"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200">
        <span
          aria-hidden
          className="h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
