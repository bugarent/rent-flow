"use client";

import Link from "next/link";
import { ADMIN_BASE } from "@/lib/routes";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { ListingModerationActions } from "@/components/admin/listing-moderation-actions";
import { displayImageUrl } from "@/lib/media/display-image";
import type { ModerationCarView } from "@/components/admin/moderation-hub";

export function ModerationListingCard({
  car,
  openUserLabel,
  openPersonalInfoLabel,
  showPartner = true,
  onDone,
}: {
  car: ModerationCarView;
  openUserLabel: string;
  openPersonalInfoLabel: string;
  /** Hidden inside a partner group, where the header already names the partner. */
  showPartner?: boolean;
  onDone: () => void;
}) {
  const L = useBpLabels();
  return (
    <article className="flex flex-col gap-3 rounded-xl border-2 border-amber-400 bg-amber-50/80 p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-red-200">
        {car.photos[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImageUrl(car.photos[0].url, 128)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">—</div>
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800">{car.status}</p>
          {car.status === "PENDING" ? (
            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
              {L.newListing}
            </span>
          ) : car.status === "PENDING_REMODERATION" ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
              {L.correction}
            </span>
          ) : null}
        </div>
        <p className="truncate text-base font-extrabold text-[#0b1f4b]">
          {car.make} {car.model}
        </p>
        <p className="truncate text-sm font-semibold text-slate-700">
          {car.year} · {car.country} · {car.bodyType}
        </p>
        {showPartner ? (
          <>
            <p className="truncate text-xs text-slate-500">{car.partnerName}</p>
            {car.partnerId ? (
              <Link
                href={`${ADMIN_BASE}/moderation/partners/${encodeURIComponent(car.partnerId)}?returnTab=listings`}
                className="mt-1.5 inline-flex min-h-10 max-w-full items-center break-all rounded-lg bg-[#0b1f4b] px-3 py-2 text-left text-xs font-bold text-white hover:bg-[#16336e]"
                aria-label={`${openPersonalInfoLabel}: ${car.partnerEmail || car.partnerName || openUserLabel}`}
              >
                {car.partnerEmail || openUserLabel}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="relative z-10 shrink-0 sm:ms-auto">
        <ListingModerationActions carId={car.id} onDone={onDone} />
      </div>
    </article>
  );
}
