function RacMark({ size }: { size: "lg" | "md" | "sm" }) {
  const box = size === "lg" ? "h-40 w-40" : size === "md" ? "h-28 w-28" : "h-11 w-11";
  const img = size === "lg" ? 120 : size === "md" ? 84 : 32;
  return (
    <div className={`relative flex ${box} shrink-0 items-center justify-center`}>
      <span className={`rac-arc${size === "sm" ? " rac-arc--sm" : ""}`} aria-hidden />
      <img
        src="/brand/rac-logo.webp"
        alt=""
        width={img}
        height={img}
        style={{ width: img, height: img }}
        className="object-contain"
      />
    </div>
  );
}

/** Compact spinning RAC mark for buttons (e.g. checkout pay-now while booking). */
export function RacButtonLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center justify-center">
      <RacMark size="sm" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-screen RAC mark with a spinning arc. Used for page changes, back/forward, and opening windows. */
export function RouteLoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-white"
    >
      <RacMark size="lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Same RAC loader inside a page area (data still loading after the page opened). */
export function RacInlineLoader({
  label = "Loading…",
  message,
  className = "",
}: {
  label?: string;
  /** Visible line under the logo, e.g. “trying again”. */
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center ${className}`}
    >
      <RacMark size="md" />
      {message ? (
        <p className="max-w-xs text-sm text-slate-600">{message}</p>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
