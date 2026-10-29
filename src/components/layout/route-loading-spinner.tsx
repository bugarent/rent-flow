function RacMark({ size }: { size: "lg" | "md" }) {
  const box = size === "lg" ? "h-40 w-40" : "h-28 w-28";
  const img = size === "lg" ? 120 : 84;
  return (
    <div className={`relative flex ${box} shrink-0 items-center justify-center`}>
      <span className="rac-arc" aria-hidden />
      <img
        src="/brand/rac-logo.png"
        alt=""
        width={img}
        height={img}
        style={{ width: img, height: img }}
        className="object-contain"
      />
    </div>
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
