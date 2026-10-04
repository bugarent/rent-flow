export default function CarBookingLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6" aria-busy="true">
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="aspect-[16/10] w-full animate-pulse rounded-md bg-slate-200 sm:w-1/2" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
          <div className="h-14 animate-pulse rounded-lg bg-sky-200/70" />
          <div className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
        <div className="w-full space-y-3 lg:w-80">
          <div className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
