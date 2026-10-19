"use client";

import { useCallback, useRef, useState } from "react";
import type { BookingInfoData } from "@/components/bookings/booking-info-modal";

type DetailResponse = { booking?: BookingInfoData; error?: unknown };

/**
 * Opens the booking modal on the click with the list row, then swaps in the full
 * booking from `url`. `loading` stays true until the detail arrives, so the modal
 * shows a skeleton and no actions on partial data. A late answer for a booking
 * that was closed or replaced is ignored.
 */
export function useBookingDetailView<T extends BookingInfoData = BookingInfoData>() {
  const [viewing, setViewing] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  const open = useCallback(
    (
      stub: T,
      url: string,
      opts?: { onLoaded?: (booking: T) => void; onError?: (message: string) => void },
    ) => {
      const request = ++requestRef.current;
      setViewing(stub);
      setLoading(true);
      void (async () => {
        let message = "";
        try {
          const res = await fetch(url, { cache: "no-store" });
          const data = (await res.json().catch(() => ({}))) as DetailResponse;
          if (request !== requestRef.current) return;
          if (res.ok && data.booking) {
            const booking = data.booking as T;
            opts?.onLoaded?.(booking);
            setViewing(booking);
          } else {
            message = typeof data.error === "string" ? data.error : "load failed";
          }
        } catch (error) {
          message = error instanceof Error ? error.message : "load failed";
        } finally {
          if (request === requestRef.current) {
            setLoading(false);
            if (message && opts?.onError) {
              setViewing(null);
              opts.onError(message);
            }
          }
        }
      })();
    },
    [],
  );

  const close = useCallback(() => {
    requestRef.current += 1;
    setViewing(null);
    setLoading(false);
  }, []);

  return { viewing, setViewing, loading, open, close };
}
