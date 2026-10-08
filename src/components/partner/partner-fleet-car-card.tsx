"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { listingHiddenReasonLabel } from "@/lib/cars/listing-visibility";
import { PARTNER_BASE } from "@/lib/routes";
import { formatMoney, toNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PartnerFleetCarCard({
  car,
  perDay,
  editLabel,
  ackLabel,
  rejectionTitle,
  locale = "en",
}: {
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    title: string;
    dailyRateEur: number;
    status: string;
    hiddenReason?: string | null;
    rejectionUnread?: boolean;
  };
  perDay: string;
  editLabel: string;
  ackLabel: string;
  rejectionTitle: string;
  locale?: string;
}) {
  const router = useRouter();
  const [acking, setAcking] = useState(false);
  const unread = Boolean(car.rejectionUnread);
  const note = listingHiddenReasonLabel(locale, car.hiddenReason);
  const awaiting =
    car.status === "REJECTED" ||
    car.status === "PENDING" ||
    car.status === "PENDING_REMODERATION";

  const ack = async () => {
    setAcking(true);
    try {
      await fetch(`/api/cars/${car.id}/ack-rejection`, { method: "POST" });
      router.refresh();
    } finally {
      setAcking(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/95 p-6 shadow-[0_12px_40px_rgba(11,31,75,0.14)] backdrop-blur-sm",
        awaiting || unread
          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
          : "border-white/50",
      )}
    >
      <h2 className="text-xl font-bold">
        {car.make} {car.model} ({car.year})
      </h2>
      <p className="mb-2 text-sm text-slate-500">{car.title}</p>

      {note ? (
        <div
          className={cn(
            "mb-3 rounded-lg border px-3 py-2 text-sm",
            unread
              ? "border-amber-400 bg-amber-100 text-amber-950"
              : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
            {rejectionTitle}
          </p>
          <p className="mt-1 font-semibold">{note}</p>
          {unread ? (
            <button
              type="button"
              disabled={acking}
              onClick={() => void ack()}
              className="mt-2 rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-400 disabled:opacity-60"
            >
              {ackLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="font-bold text-sky-600">
          {formatMoney(toNumber(car.dailyRateEur), "EUR")}
          {perDay}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`${PARTNER_BASE}/cars/${car.id}/edit`}
            className="text-sm font-semibold text-sky-700 hover:underline"
          >
            {editLabel}
          </Link>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              car.status === "APPROVED"
                ? "bg-green-100 text-green-800"
                : car.status === "PENDING" || car.status === "PENDING_REMODERATION"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800",
            )}
          >
            {car.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}
