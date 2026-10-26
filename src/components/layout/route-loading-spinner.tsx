/** Full-screen RAC mark with a spinning arc. Used for page changes, back/forward, and opening windows. */
export function RouteLoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-white"
    >
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="rac-arc" aria-hidden />
        <img
          src="/brand/rac-logo.png"
          alt=""
          width={120}
          height={120}
          className="h-[120px] w-[120px] object-contain"
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
