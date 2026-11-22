"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

/**
 * Booking confirmation overlay: appears only after a short delay so a fast
 * confirm does not flash. Blocks the page with the spinning RAC logo.
 */
export function BookingConfirmOverlay({
  active,
  label = "Confirming booking…",
  message,
  delayMs = 450,
}: {
  active: boolean;
  label?: string;
  /** Visible line under the logo (localized). */
  message?: string;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-white/95 px-4 backdrop-blur-[1px]"
    >
      <div className="flex max-w-xs flex-col items-center gap-4 text-center">
        <RacMark size="lg" />
        <p className="text-sm font-semibold text-slate-600 sm:text-base">{message || label}</p>
      </div>
    </div>,
    document.body,
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
