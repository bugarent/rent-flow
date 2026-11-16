"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { compressImageForUpload } from "@/lib/files/compress-image";
import { cn } from "@/lib/utils";

type AspectId = "free" | "4:3" | "1:1" | "3:4" | "16:9";

const ASPECT_VALUES: Record<AspectId, number | null> = {
  free: null,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
};

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "სურათის კორექტირება",
      hint: "მოატრიალეთ, გაადიდეთ და გადაადგილეთ — ჩარჩოში დარჩენილი ნაწილი შეინახება.",
      aspect: "ფორმა",
      free: "თავისუფალი",
      zoom: "მასშტაბი",
      rotateLeft: "მარცხნივ",
      rotateRight: "მარჯვნივ",
      cancel: "გაუქმება",
      apply: "შენახვა",
      saving: "ინახება…",
      failed: "სურათი ვერ შეინახა",
      loadFailed: "სურათი ვერ ჩაიტვირთა",
    };
  }
  if (locale === "ru") {
    return {
      title: "Правка изображения",
      hint: "Поверните, увеличьте и сдвиньте — сохранится область в рамке.",
      aspect: "Формат",
      free: "Свободно",
      zoom: "Масштаб",
      rotateLeft: "Влево",
      rotateRight: "Вправо",
      cancel: "Отмена",
      apply: "Сохранить",
      saving: "Сохранение…",
      failed: "Не удалось сохранить",
      loadFailed: "Не удалось загрузить изображение",
    };
  }
  return {
    title: "Edit image",
    hint: "Rotate, zoom and drag — the framed area will be saved.",
    aspect: "Shape",
    free: "Free",
    zoom: "Zoom",
    rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    cancel: "Cancel",
    apply: "Save",
    saving: "Saving…",
    failed: "Could not save image",
    loadFailed: "Could not load image",
  };
}

async function blobUrlFromRemote(src: string): Promise<{ url: string; revoke: boolean }> {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), revoke: true };
  } catch {
    return { url: src, revoke: false };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

/** Bake a 90° rotation into a new object URL (keeps crop math simple). */
async function rotateWorkSrc(src: string, degrees: 90 | -90): Promise<string> {
  const img = await loadImage(src);
  const canvas = globalThis.document.createElement("canvas");
  const cw = degrees === 90 || degrees === -90 ? img.naturalHeight : img.naturalWidth;
  const ch = degrees === 90 || degrees === -90 ? img.naturalWidth : img.naturalHeight;
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rotate failed");
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("rotate failed"))), "image/jpeg", 0.95);
  });
  return URL.createObjectURL(blob);
}

async function uploadEdited(file: File, asDocument: boolean): Promise<string> {
  const payload = asDocument
    ? await compressImageForUpload(file, { maxEdge: 2200, targetBytes: 1_100_000 })
    : await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", payload);
  if (asDocument) fd.append("kind", "document");
  const res = await fetch("/api/partners/uploads", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
  return String(data.url);
}

/** Crop / rotate an existing listing or passport image, then upload the result. */
export function PartnerImageEditor({
  src,
  open,
  onClose,
  onSaved,
  asDocument = false,
  locale = "en",
}: {
  src: string;
  open: boolean;
  onClose: () => void;
  onSaved: (url: string) => void;
  asDocument?: boolean;
  locale?: string;
}) {
  const copy = copyFor(locale);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [workSrc, setWorkSrc] = useState<string | null>(null);
  const [revokeWork, setRevokeWork] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [aspectId, setAspectId] = useState<AspectId>(asDocument ? "3:4" : "4:3");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const revokeWorkRef = useRef(false);
  revokeWorkRef.current = revokeWork;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
    setAspectId(asDocument ? "3:4" : "4:3");
    void blobUrlFromRemote(src).then((loaded) => {
      if (cancelled) {
        if (loaded.revoke) URL.revokeObjectURL(loaded.url);
        return;
      }
      setWorkSrc((prev) => {
        if (prev && revokeWorkRef.current) URL.revokeObjectURL(prev);
        return loaded.url;
      });
      setRevokeWork(loaded.revoke);
    });
    return () => {
      cancelled = true;
    };
  }, [open, src, asDocument]);

  useEffect(() => {
    return () => {
      if (workSrc && revokeWork) URL.revokeObjectURL(workSrc);
    };
  }, [workSrc, revokeWork]);

  useEffect(() => {
    if (!open || !viewportRef.current) return;
    const node = viewportRef.current;
    const measure = () => setViewportSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, aspectId, workSrc]);

  if (!open || !mounted) return null;

  const aspect =
    ASPECT_VALUES[aspectId] ??
    (natural.w && natural.h ? natural.w / natural.h : asDocument ? 3 / 4 : 4 / 3);

  const coverScale =
    natural.w && viewportSize.w
      ? Math.max(viewportSize.w / natural.w, viewportSize.h / natural.h)
      : 1;
  const drawW = natural.w * coverScale * zoom;
  const drawH = natural.h * coverScale * zoom;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => setDragging(false);

  const applyRotate = async (degrees: 90 | -90) => {
    if (!workSrc || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await rotateWorkSrc(workSrc, degrees);
      setWorkSrc((prev) => {
        if (prev && revokeWorkRef.current) URL.revokeObjectURL(prev);
        return next;
      });
      setRevokeWork(true);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setNatural({ w: 0, h: 0 });
    } catch {
      setError(copy.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const exportAndSave = async () => {
    const vw = viewportSize.w || viewportRef.current?.clientWidth || 0;
    const vh = viewportSize.h || viewportRef.current?.clientHeight || 0;
    if (!workSrc || !vw || !vh || !natural.w) {
      setError(copy.failed);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(workSrc);
      const outW = asDocument ? 1600 : 1920;
      const outH = Math.max(1, Math.round(outW / aspect));
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(copy.failed);

      const cover = Math.max(vw / natural.w, vh / natural.h);
      const drawnW = natural.w * cover * zoom;
      const drawnH = natural.h * cover * zoom;
      const dx = (vw - drawnW) / 2 + offset.x;
      const dy = (vh - drawnH) / 2 + offset.y;
      const scaleX = outW / vw;
      const scaleY = outH / vh;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, dx * scaleX, dy * scaleY, drawnW * scaleX, drawnH * scaleY);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(copy.failed))), "image/jpeg", 0.92);
      });
      const file = new File([blob], "edited.jpg", { type: "image/jpeg" });
      const url = await uploadEdited(file, asDocument);
      onSaved(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/55 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(96dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <div className="me-auto min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">{copy.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{copy.hint}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={onClose}
            aria-label={copy.cancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
          <div
            ref={viewportRef}
            className={cn(
              "relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-900 touch-none",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {workSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workSrc}
                alt=""
                draggable={false}
                onLoad={(e) =>
                  setNatural({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="pointer-events-none absolute select-none"
                style={{
                  width: drawW || "100%",
                  height: drawH || "auto",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/75" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">{copy.aspect}</span>
            {(Object.keys(ASPECT_VALUES) as AspectId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setAspectId(id);
                  setOffset({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className={cn(
                  "min-h-9 rounded-full border px-2.5 text-xs font-bold",
                  aspectId === id
                    ? "border-sky-600 bg-sky-50 text-sky-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50",
                )}
              >
                {id === "free" ? copy.free : id}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void applyRotate(-90)}
              disabled={busy || !workSrc}
              title={copy.rotateLeft}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.rotateLeft}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void applyRotate(90)}
              disabled={busy || !workSrc}
              title={copy.rotateRight}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {copy.rotateRight}
            </button>
          </div>

          <label className="block text-xs font-bold text-slate-700">
            {copy.zoom}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            onClick={onClose}
            disabled={busy}
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white disabled:bg-slate-400"
            onClick={() => void exportAndSave()}
            disabled={busy || !natural.w}
          >
            {busy ? copy.saving : copy.apply}
          </button>
        </div>
      </div>
    </div>,
    globalThis.document.body,
  );
}
