"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { MIN_PUBLIC_PHOTOS } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { PartnerImageLightbox } from "@/components/partner/partner-image-lightbox";

const SLOT_COUNT = MIN_PUBLIC_PHOTOS;
const LONG_PRESS_MS = 420;

function padSlots(photos: string[]): string[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => normalizePhotoUrl(photos[i]));
}

function normalizePhotoUrl(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "undefined" || s === "null") return "";
  return s;
}

function moveSlot(photos: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= SLOT_COUNT || to >= SLOT_COUNT) {
    return padSlots(photos);
  }
  const next = padSlots(photos);
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item ?? "");
  return next;
}

export function PartnerCarPhotoGallery({
  photos,
  onChange,
  uploading,
  onUploadFiles,
  invalid,
  accentColor,
  labels,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
  uploading: boolean;
  onUploadFiles: (files: File[], startIndex: number) => Promise<{ urls: string[]; coverUrl?: string }>;
  invalid?: boolean;
  accentColor: string;
  labels: {
    upload: string;
    uploading: string;
    remove: string;
    cover: string;
    coverHint: string;
    formats: string;
  };
}) {
  const slots = padSlots(photos);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const photosRef = useRef(photos);
  useLayoutEffect(() => {
    photosRef.current = photos;
  });

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const commitSlots = (next: string[]) => {
    const padded = padSlots(next);
    photosRef.current = padded;
    onChange(padded);
  };

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (dragFrom == null) return;

    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const host = el.closest("[data-photo-slot]") as HTMLElement | null;
      if (!host) return;
      const idx = Number(host.dataset.photoSlot);
      if (!Number.isFinite(idx)) return;
      if (dragOverRef.current !== idx) {
        dragOverRef.current = idx;
        setDragOver(idx);
      }
    };

    const onUp = () => {
      const from = dragFromRef.current;
      const to = dragOverRef.current;
      if (from != null && to != null && from !== to) {
        commitSlots(moveSlot(photosRef.current, from, to));
        suppressClick.current = true;
      }
      dragFromRef.current = null;
      dragOverRef.current = null;
      setDragFrom(null);
      setDragOver(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragFrom]);

  const openPicker = (index: number) => {
    const input = fileRefs.current[index];
    if (!input) return;
    input.value = "";
    input.click();
  };

  const handleFilesAt = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    const placeAt = index === 0 ? 1 : index;
    const picked = Array.from(files).slice(0, SLOT_COUNT - placeAt);
    if (!picked.length) return;
    const localUrls = picked.map((file) => URL.createObjectURL(file));
    const optimistic = padSlots(photosRef.current);
    localUrls.forEach((localUrl, i) => {
      const at = placeAt + i;
      if (at > 0 && at < SLOT_COUNT) optimistic[at] = localUrl;
    });
    commitSlots(optimistic);

    try {
      const result = await onUploadFiles(picked, index);
      const urls = result.urls;
      const next = padSlots(photosRef.current);
      if (urls.length || result.coverUrl) {
        urls.forEach((url, i) => {
          const at = placeAt + i;
          if (at > 0 && at < SLOT_COUNT) next[at] = normalizePhotoUrl(url) || next[at];
        });
        if (result.coverUrl) next[0] = normalizePhotoUrl(result.coverUrl) || next[0];
      } else {
        localUrls.forEach((_, i) => {
          const at = placeAt + i;
          if (at > 0 && at < SLOT_COUNT && next[at]?.startsWith("blob:")) next[at] = "";
        });
      }
      commitSlots(next);
    } catch {
      const next = padSlots(photosRef.current);
      localUrls.forEach((_, i) => {
        const at = placeAt + i;
        if (at > 0 && at < SLOT_COUNT && next[at]?.startsWith("blob:")) next[at] = "";
      });
      commitSlots(next);
    } finally {
      window.setTimeout(() => {
        localUrls.forEach((u) => URL.revokeObjectURL(u));
      }, 1500);
      const input = fileRefs.current[index];
      if (input) input.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center sm:max-w-[200px]">
        <div className="mx-auto flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-white text-slate-400">
          {slots[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slots[0]} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-semibold">{labels.cover}</span>
          )}
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-500">{labels.coverHint}</p>
      </div>

      <p className="text-xs text-slate-500">{labels.formats}</p>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5",
          invalid && "rounded-lg p-1 ring-2 ring-red-200",
        )}
      >
        {slots.map((url, index) => {
          const isDragging = dragFrom === index;
          const isOver = dragOver === index && dragFrom != null && dragFrom !== index;
          const filled = Boolean(url);
          return (
            <div
              key={`slot-${index}`}
              data-photo-slot={index}
              className={cn(
                "relative flex min-h-[160px] flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition",
                invalid && !filled ? "border-red-400" : "border-slate-200",
                isDragging && "opacity-60 ring-2 ring-sky-400",
                isOver && "border-sky-500 bg-sky-50",
                dragFrom != null && "select-none",
              )}
            >
              <div
                className="relative flex min-h-[118px] flex-1 items-center justify-center overflow-hidden bg-slate-100"
                onPointerDown={(e) => {
                  if (!filled || e.button !== 0) return;
                  const target = e.target as HTMLElement;
                  if (target.closest("button")) return;
                  clearLongPress();
                  longPressTimer.current = window.setTimeout(() => {
                    dragFromRef.current = index;
                    dragOverRef.current = index;
                    setDragFrom(index);
                    setDragOver(index);
                    suppressClick.current = true;
                  }, LONG_PRESS_MS);
                }}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
              >
                {filled ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className={cn(
                        "h-full w-full cursor-zoom-in",
                        index === 0 ? "object-contain bg-white" : "object-cover",
                      )}
                      draggable={false}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        setLightbox(url);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        openPicker(index);
                      }}
                      className="absolute end-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70 disabled:opacity-60"
                      title={labels.upload}
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => openPicker(index)}
                    className="inline-flex flex-col items-center justify-center gap-1.5 rounded-full px-4 py-3 text-[11px] font-bold text-white shadow-md transition hover:brightness-95 disabled:opacity-60"
                    style={{ backgroundColor: accentColor }}
                    title={labels.upload}
                  >
                    <Upload className="h-5 w-5" />
                    <span>{labels.upload}</span>
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-center border-t border-slate-100 bg-white px-1 py-1.5">
                <button
                  type="button"
                  disabled={!filled || uploading}
                  onClick={() => {
                    const next = padSlots(photosRef.current);
                    next[index] = "";
                    commitSlots(next);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-red-700 enabled:hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                  {labels.remove}
                </button>
              </div>

              <input
                ref={(el) => {
                  fileRefs.current[index] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => void handleFilesAt(index, e.target.files)}
              />
            </div>
          );
        })}
      </div>

      {uploading ? (
        <p className="text-xs font-semibold text-slate-600">{labels.uploading}</p>
      ) : null}

      <PartnerImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

export function filledPhotoCount(photos: string[]) {
  return padSlots(photos).filter(Boolean).length;
}

export function photosForSave(photos: string[]) {
  return padSlots(photos).filter(Boolean);
}