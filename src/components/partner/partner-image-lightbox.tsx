"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { Crop, Download, Minus, Plus, X } from "lucide-react";
import { PartnerImageEditor } from "@/components/partner/partner-image-editor";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

function fileNameFromUrl(src: string) {
  try {
    const path = new URL(src, typeof window !== "undefined" ? window.location.origin : "http://local").pathname;
    const base = path.split("/").pop() || "document";
    return base.includes(".") ? base : `${base}.jpg`;
  } catch {
    return "document.jpg";
  }
}

async function downloadImage(src: string) {
  const name = fileNameFromUrl(src);
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

type AnchorBox = { top: number; left: number; width: number; maxHeight: number };

function boxNearAnchor(el: HTMLElement): AnchorBox {
  const rect = el.getBoundingClientRect();
  const pad = 12;
  const width = Math.min(860, Math.max(280, Math.min(Math.max(rect.width, 280), window.innerWidth - pad * 2)));
  // Keep the dialog on the gallery block (not viewport-centered above it).
  let top = Math.max(pad, rect.top);
  let maxHeight = window.innerHeight - top - pad;
  const minUsable = Math.min(320, window.innerHeight - pad * 2);
  if (maxHeight < minUsable) {
    top = Math.max(pad, window.innerHeight - pad - minUsable);
    maxHeight = window.innerHeight - top - pad;
  }
  maxHeight = Math.min(maxHeight, Math.max(minUsable, window.innerHeight * 0.82));
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
  return { top, left, width, maxHeight };
}

/** Preview dialog with zoom, pan (drag), and download — shared by partner + admin. */
export function PartnerImageLightbox({
  src,
  onClose,
  title,
  /** When set, the dialog opens over/near this element (e.g. the photo gallery) instead of page center. */
  anchorRef,
  /** When set, shows Edit — crop / rotate / reshape and replace the saved image. */
  onEdited,
  asDocument = false,
  locale = "en",
}: {
  src: string | null;
  onClose: () => void;
  title?: string;
  anchorRef?: RefObject<HTMLElement | null>;
  onEdited?: (url: string) => void;
  asDocument?: boolean;
  locale?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);
  const [editing, setEditing] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setEditing(false);
    dragOrigin.current = null;
  }, [src]);

  useEffect(() => {
    if (zoom <= 1) setOffset({ x: 0, y: 0 });
  }, [zoom]);

  useLayoutEffect(() => {
    if (!src || !anchorRef?.current) {
      setAnchorBox(null);
      return;
    }
    const el = anchorRef.current;
    // Instant scroll so we can measure before body scroll-lock (overflow:hidden) runs.
    try {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    } catch {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    }
    const update = () => setAnchorBox(boxNearAnchor(el));
    update();
    const raf = window.requestAnimationFrame(() => {
      update();
      window.requestAnimationFrame(update);
    });
    window.addEventListener("resize", update);
    const scrollParents: Array<Element | Window> = [window];
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll|overlay)/.test(style.overflowY) || /(auto|scroll|overlay)/.test(style.overflow)) {
        scrollParents.push(parent);
      }
      parent = parent.parentElement;
    }
    for (const node of scrollParents) node.addEventListener("scroll", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      for (const node of scrollParents) node.removeEventListener("scroll", update);
    };
  }, [src, anchorRef]);

  useEffect(() => {
    if (!src) return;
    // Lock scroll only after the gallery has been scrolled into place + measured.
    if (anchorRef && !anchorBox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
      if (e.key === "-" || e.key === "_") {
        setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
      }
      if (zoom > 1) {
        const step = 48;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setOffset((o) => ({ ...o, x: o.x + step }));
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setOffset((o) => ({ ...o, x: o.x - step }));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setOffset((o) => ({ ...o, y: o.y + step }));
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOffset((o) => ({ ...o, y: o.y - step }));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [src, onClose, zoom, anchorRef, anchorBox]);

  if (!src || !mounted) return null;
  // Wait for the first anchor measure so we never flash a page-top / centered dialog.
  if (anchorRef && !anchorBox) return null;

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const canPan = zoom > 1;
  const anchored = Boolean(anchorBox);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canPan || e.button !== 0) return;
    e.preventDefault();
    dragOrigin.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin || !canPan) return;
    setOffset({
      x: origin.ox + (e.clientX - origin.x),
      y: origin.oy + (e.clientY - origin.y),
    });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!canPan) return;
    e.preventDefault();
    setOffset((o) => ({
      x: o.x - e.deltaX,
      y: o.y - e.deltaY,
    }));
  };

  const dialog = (
    <div
      className={cn(
        "fixed inset-0 z-[80] bg-slate-900/45 p-3 sm:p-6",
        anchored ? "block" : "flex items-center justify-center",
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          anchored ? "max-w-none" : "max-h-[min(88vh,820px)] max-w-[min(94vw,860px)]",
        )}
        style={
          anchored && anchorBox
            ? {
                position: "fixed",
                top: anchorBox.top,
                left: anchorBox.left,
                width: anchorBox.width,
                maxHeight: anchorBox.maxHeight,
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          {title ? (
            <p className="me-auto truncate text-sm font-bold text-slate-800">{title}</p>
          ) : (
            <span className="me-auto" />
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
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
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          {onEdited ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
              onClick={() => setEditing(true)}
              title={locale === "ka" ? "კორექტირება" : locale === "ru" ? "Править" : "Edit"}
            >
              <Crop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {locale === "ka" ? "კორექტირება" : locale === "ru" ? "Править" : "Edit"}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            onClick={() => void downloadImage(src)}
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-50 p-3 sm:p-5 touch-none",
            canPan ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className={cn(
              "max-h-[min(70vh,640px)] w-auto max-w-full origin-center select-none object-contain",
              anchored && anchorBox ? "max-h-[min(58vh,520px)]" : null,
              !dragging && "transition-transform duration-150",
            )}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(dialog, document.body)}
      {onEdited && src ? (
        <PartnerImageEditor
          src={src}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={onEdited}
          asDocument={asDocument}
          locale={locale}
        />
      ) : null}
    </>
  );
}
