"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Car as CarIcon, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

/** Thumbnail frame: previous md size (16rem × 12rem) + 5cm width / +3cm height. */
const GALLERY_FRAME =
  "relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-[calc(16rem+5cm)] sm:h-[calc(12rem+3cm)]";

/** Lightbox image stage — fixed box so every photo opens at the same size. */
const LIGHTBOX_STAGE =
  "relative mx-auto w-full max-w-[min(92vw,52rem)] overflow-hidden rounded-xl bg-slate-200 aspect-[4/3] max-h-[min(72vh,36rem)]";

export function CheckoutCarGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const urls = photos.filter(Boolean);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActive(0);
  }, [urls.join("|")]);

  const current = urls[active] || urls[0] || "";

  const go = (dir: -1 | 1) => {
    if (urls.length < 2) return;
    setActive((i) => (i + dir + urls.length) % urls.length);
  };

  return (
    <div className="w-full shrink-0 sm:w-[calc(16rem+5cm)]">
      <div className={cn(GALLERY_FRAME, "aspect-[4/3] sm:aspect-auto")}>
        {current ? (
          <button
            type="button"
            className="absolute inset-0 block"
            onClick={() => setLightboxOpen(true)}
            aria-label={title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </button>
        ) : (
          <span className="flex h-full min-h-[12rem] items-center justify-center text-slate-400">
            <CarIcon className="h-12 w-12" />
          </span>
        )}

        {urls.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute start-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="absolute end-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    "pointer-events-auto h-2 w-2 rounded-full transition",
                    i === active ? "bg-white shadow-sm ring-1 ring-black/20" : "bg-white/55 hover:bg-white/80",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {lightboxOpen && current ? (
        <GalleryLightbox
          urls={urls}
          index={active}
          title={title}
          onIndexChange={setActive}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}

function GalleryLightbox({
  urls,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  urls: string[];
  index: number;
  title: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const src = urls[index] || urls[0] || "";
  const canNavigate = urls.length > 1;

  useEffect(() => {
    setZoom(1);
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && canNavigate) {
        onIndexChange((index - 1 + urls.length) % urls.length);
      }
      if (e.key === "ArrowRight" && canNavigate) {
        onIndexChange((index + 1) % urls.length);
      }
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
      if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNavigate, index, onClose, onIndexChange, urls.length]);

  const go = (dir: -1 | 1) => {
    if (!canNavigate) return;
    onIndexChange((index + dir + urls.length) % urls.length);
  };

  const onImageAreaClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!canNavigate || zoom > 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) go(-1);
    else go(1);
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/55 p-2 sm:p-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-[min(94vw,56rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <p className="me-auto min-w-0 break-words text-sm font-bold text-slate-800">{title}</p>
          {canNavigate ? (
            <span className="text-xs font-semibold tabular-nums text-slate-500">
              {index + 1} / {urls.length}
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold tabular-nums text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="bg-slate-50 p-3 sm:p-5">
          <div
            className={cn(
              LIGHTBOX_STAGE,
              canNavigate && zoom <= 1 ? "cursor-pointer" : "cursor-default",
            )}
            onClick={onImageAreaClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={title}
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover object-center transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            />

            {canNavigate ? (
              <>
                <button
                  type="button"
                  className="absolute start-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute end-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
                  {urls.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2 w-2 rounded-full",
                        i === index ? "bg-[#1d6fe8]" : "bg-white/70 ring-1 ring-black/10",
                      )}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
