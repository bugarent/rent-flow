"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { compressImageForUpload } from "@/lib/files/compress-image";
import { cn } from "@/lib/utils";

type AspectId = "free" | "4:3" | "1:1" | "3:4" | "16:9";
type Handle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "pan";

const ASPECT_VALUES: Record<AspectId, number | null> = {
  free: null,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
};

const MIN_CROP = 0.18;
const MAX_INSET = 1 - MIN_CROP;

type Insets = { left: number; right: number; top: number; bottom: number };

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "სურათის კორექტირება",
      hint: "გადაათრიეთ ჩარჩოს კიდეები ან კუთხეები — როგორც ტელეფონზე მოჭრისას. შიგნით გადათრევა სურათს გადაადგილებს.",
      aspect: "ფორმა",
      free: "თავისუფალი",
      zoom: "მასშტაბი",
      tilt: "დახრა",
      rotateLeft: "90° მარცხნივ",
      rotateRight: "90° მარჯვნივ",
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
      hint: "Тяните края или углы рамки — как обрезка на телефоне. Перетаскивание внутри сдвигает фото.",
      aspect: "Формат",
      free: "Свободно",
      zoom: "Масштаб",
      tilt: "Наклон",
      rotateLeft: "90° влево",
      rotateRight: "90° вправо",
      cancel: "Отмена",
      apply: "Сохранить",
      saving: "Сохранение…",
      failed: "Не удалось сохранить",
      loadFailed: "Не удалось загрузить изображение",
    };
  }
  return {
    title: "Edit image",
    hint: "Drag the frame edges or corners — like phone crop. Drag inside to move the photo.",
    aspect: "Shape",
    free: "Free",
    zoom: "Zoom",
    tilt: "Tilt",
    rotateLeft: "90° left",
    rotateRight: "90° right",
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

function canvasToObjectUrl(canvas: HTMLCanvasElement, quality = 0.95): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("export failed"))),
      "image/jpeg",
      quality,
    );
  });
}

async function rotateCanvas90(src: string, degrees: 90 | -90): Promise<string> {
  const img = await loadImage(src);
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rotate failed");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvasToObjectUrl(canvas);
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

function clampInsets(next: Insets): Insets {
  const out = { ...next };
  out.left = Math.min(MAX_INSET, Math.max(0, out.left));
  out.right = Math.min(MAX_INSET, Math.max(0, out.right));
  out.top = Math.min(MAX_INSET, Math.max(0, out.top));
  out.bottom = Math.min(MAX_INSET, Math.max(0, out.bottom));
  if (out.left + out.right > 1 - MIN_CROP) {
    const overflow = out.left + out.right - (1 - MIN_CROP);
    if (out.left >= out.right) out.left = Math.max(0, out.left - overflow);
    else out.right = Math.max(0, out.right - overflow);
  }
  if (out.top + out.bottom > 1 - MIN_CROP) {
    const overflow = out.top + out.bottom - (1 - MIN_CROP);
    if (out.top >= out.bottom) out.top = Math.max(0, out.top - overflow);
    else out.bottom = Math.max(0, out.bottom - overflow);
  }
  return out;
}

function applyAspectToInsets(
  insets: Insets,
  viewportAspect: number,
  targetAspect: number | null,
  prefer: "width" | "height" = "width",
): Insets {
  if (!targetAspect || !viewportAspect) return clampInsets(insets);
  let next = { ...insets };
  const availW = 1 - next.left - next.right;
  const availH = 1 - next.top - next.bottom;
  const boxAspect = (availW * viewportAspect) / availH;
  if (Math.abs(boxAspect - targetAspect) < 0.01) return clampInsets(next);

  if (prefer === "width" || boxAspect > targetAspect) {
    const needH = (availW * viewportAspect) / targetAspect;
    const diff = availH - needH;
    if (diff > 0) {
      next.top += diff / 2;
      next.bottom += diff / 2;
    } else {
      const needW = (availH * targetAspect) / viewportAspect;
      const d = availW - needW;
      next.left += d / 2;
      next.right += d / 2;
    }
  } else {
    const needW = (availH * targetAspect) / viewportAspect;
    const diff = availW - needW;
    if (diff > 0) {
      next.left += diff / 2;
      next.right += diff / 2;
    } else {
      const needH = (availW * viewportAspect) / targetAspect;
      const d = availH - needH;
      next.top += d / 2;
      next.bottom += d / 2;
    }
  }
  return clampInsets(next);
}

/** Crop / tilt an existing listing or passport image with Android-style edge handles. */
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
  const [tilt, setTilt] = useState(0);
  const [insets, setInsets] = useState<Insets>({ left: 0.05, right: 0.05, top: 0.05, bottom: 0.05 });
  const [aspectId, setAspectId] = useState<AspectId>("free");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeHandle, setActiveHandle] = useState<Handle | null>(null);
  const dragStart = useRef({
    x: 0,
    y: 0,
    ox: 0,
    oy: 0,
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
  });
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
    setTilt(0);
    setInsets({ left: 0.05, right: 0.05, top: 0.05, bottom: 0.05 });
    setNatural({ w: 0, h: 0 });
    setAspectId("free");
    setActiveHandle(null);
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
  }, [open, workSrc]);

  if (!open || !mounted) return null;

  const viewportAspect =
    viewportSize.w && viewportSize.h ? viewportSize.w / viewportSize.h : asDocument ? 3 / 4 : 4 / 3;
  const lockedAspect = ASPECT_VALUES[aspectId];

  const coverScale =
    natural.w && viewportSize.w
      ? Math.max(viewportSize.w / natural.w, viewportSize.h / natural.h)
      : 1;
  const drawW = natural.w * coverScale * zoom;
  const drawH = natural.h * coverScale * zoom;

  const startHandle = (handle: Handle, e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
      insets: { ...insets },
    };
  };

  const onHandleMove = (e: ReactPointerEvent) => {
    if (!activeHandle || !viewportSize.w || !viewportSize.h) return;
    const dx = (e.clientX - dragStart.current.x) / viewportSize.w;
    const dy = (e.clientY - dragStart.current.y) / viewportSize.h;
    const base = dragStart.current.insets;

    if (activeHandle === "pan") {
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
      return;
    }

    let next: Insets = { ...base };
    const moveLeft = () => {
      next.left = base.left + dx;
    };
    const moveRight = () => {
      next.right = base.right - dx;
    };
    const moveTop = () => {
      next.top = base.top + dy;
    };
    const moveBottom = () => {
      next.bottom = base.bottom - dy;
    };

    if (activeHandle === "left" || activeHandle === "top-left" || activeHandle === "bottom-left") {
      moveLeft();
    }
    if (activeHandle === "right" || activeHandle === "top-right" || activeHandle === "bottom-right") {
      moveRight();
    }
    if (activeHandle === "top" || activeHandle === "top-left" || activeHandle === "top-right") {
      moveTop();
    }
    if (
      activeHandle === "bottom" ||
      activeHandle === "bottom-left" ||
      activeHandle === "bottom-right"
    ) {
      moveBottom();
    }

    next = clampInsets(next);

    if (lockedAspect) {
      // Keep aspect: when dragging a side, adjust the opposite pair centered.
      const prefer =
        activeHandle === "left" ||
        activeHandle === "right" ||
        activeHandle.includes("left") ||
        activeHandle.includes("right")
          ? "width"
          : "height";
      if (prefer === "width") {
        const availW = 1 - next.left - next.right;
        const needH = (availW * viewportAspect) / lockedAspect;
        const curH = 1 - base.top - base.bottom;
        const diff = curH - needH;
        next.top = base.top + diff / 2;
        next.bottom = base.bottom + diff / 2;
      } else {
        const availH = 1 - next.top - next.bottom;
        const needW = (availH * lockedAspect) / viewportAspect;
        const curW = 1 - base.left - base.right;
        const diff = curW - needW;
        next.left = base.left + diff / 2;
        next.right = base.right + diff / 2;
      }
      next = clampInsets(next);
    }

    setInsets(next);
  };

  const endHandle = (e: ReactPointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setActiveHandle(null);
  };

  const applyRotate90 = async (degrees: 90 | -90) => {
    if (!workSrc || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await rotateCanvas90(workSrc, degrees);
      setWorkSrc((prev) => {
        if (prev && revokeWorkRef.current) URL.revokeObjectURL(prev);
        return next;
      });
      setRevokeWork(true);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setTilt(0);
      setInsets({ left: 0.05, right: 0.05, top: 0.05, bottom: 0.05 });
      setNatural({ w: 0, h: 0 });
    } catch {
      setError(copy.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const setAspect = (id: AspectId) => {
    setAspectId(id);
    const target = ASPECT_VALUES[id];
    if (!target) return;
    setInsets((prev) => applyAspectToInsets(prev, viewportAspect, target));
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
      const cropX = vw * insets.left;
      const cropY = vh * insets.top;
      const cropW = Math.max(8, vw * (1 - insets.left - insets.right));
      const cropH = Math.max(8, vh * (1 - insets.top - insets.bottom));

      const outW = asDocument ? 1600 : 1920;
      const outH = Math.max(1, Math.round(outW / (cropW / cropH)));
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(copy.failed);

      const full = globalThis.document.createElement("canvas");
      full.width = Math.max(1, Math.round(vw));
      full.height = Math.max(1, Math.round(vh));
      const fctx = full.getContext("2d");
      if (!fctx) throw new Error(copy.failed);
      fctx.fillStyle = "#0f172a";
      fctx.fillRect(0, 0, full.width, full.height);
      fctx.save();
      fctx.translate(full.width / 2 + offset.x, full.height / 2 + offset.y);
      fctx.rotate((tilt * Math.PI) / 180);
      fctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      fctx.restore();

      ctx.drawImage(full, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

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

  const frameStyle = {
    left: `${insets.left * 100}%`,
    right: `${insets.right * 100}%`,
    top: `${insets.top * 100}%`,
    bottom: `${insets.bottom * 100}%`,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/55 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(96dvh,940px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
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
            className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-slate-900 touch-none"
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
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${tilt}deg)`,
                }}
              />
            ) : null}

            {/* Dim outside crop */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-black/55"
              style={{ width: `${insets.left * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-black/55"
              style={{ width: `${insets.right * 100}%` }}
            />
            <div
              className="pointer-events-none absolute bg-black/55"
              style={{
                left: `${insets.left * 100}%`,
                right: `${insets.right * 100}%`,
                top: 0,
                height: `${insets.top * 100}%`,
              }}
            />
            <div
              className="pointer-events-none absolute bg-black/55"
              style={{
                left: `${insets.left * 100}%`,
                right: `${insets.right * 100}%`,
                bottom: 0,
                height: `${insets.bottom * 100}%`,
              }}
            />

            {/* Crop frame + pan area */}
            <div
              className={cn(
                "absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]",
                activeHandle === "pan" ? "cursor-grabbing" : "cursor-grab",
              )}
              style={frameStyle}
              onPointerDown={(e) => startHandle("pan", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              {/* Rule-of-thirds lines like Android */}
              <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/35" />
              <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/35" />
              <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/35" />
              <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/35" />
            </div>

            {/* Edge + corner handles (Android-style) */}
            <div
              role="presentation"
              className="absolute z-20 w-10 -translate-x-1/2 cursor-ew-resize touch-none"
              style={{ left: `${insets.left * 100}%`, top: `${insets.top * 100}%`, bottom: `${insets.bottom * 100}%` }}
              onPointerDown={(e) => startHandle("left", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-20 w-10 translate-x-1/2 cursor-ew-resize touch-none"
              style={{ right: `${insets.right * 100}%`, top: `${insets.top * 100}%`, bottom: `${insets.bottom * 100}%` }}
              onPointerDown={(e) => startHandle("right", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-20 h-10 -translate-y-1/2 cursor-ns-resize touch-none"
              style={{ top: `${insets.top * 100}%`, left: `${insets.left * 100}%`, right: `${insets.right * 100}%` }}
              onPointerDown={(e) => startHandle("top", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-1.5 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-20 h-10 translate-y-1/2 cursor-ns-resize touch-none"
              style={{ bottom: `${insets.bottom * 100}%`, left: `${insets.left * 100}%`, right: `${insets.right * 100}%` }}
              onPointerDown={(e) => startHandle("bottom", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-1.5 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
            </div>

            <div
              role="presentation"
              className="absolute z-30 h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none sm:h-10 sm:w-10"
              style={{ left: `${insets.left * 100}%`, top: `${insets.top * 100}%` }}
              onPointerDown={(e) => startHandle("top-left", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white bg-sky-500 shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-30 h-11 w-11 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize touch-none sm:h-10 sm:w-10"
              style={{ right: `${insets.right * 100}%`, top: `${insets.top * 100}%` }}
              onPointerDown={(e) => startHandle("top-right", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white bg-sky-500 shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-30 h-11 w-11 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize touch-none sm:h-10 sm:w-10"
              style={{ left: `${insets.left * 100}%`, bottom: `${insets.bottom * 100}%` }}
              onPointerDown={(e) => startHandle("bottom-left", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white bg-sky-500 shadow" />
            </div>
            <div
              role="presentation"
              className="absolute z-30 h-11 w-11 translate-x-1/2 translate-y-1/2 cursor-nwse-resize touch-none sm:h-10 sm:w-10"
              style={{ right: `${insets.right * 100}%`, bottom: `${insets.bottom * 100}%` }}
              onPointerDown={(e) => startHandle("bottom-right", e)}
              onPointerMove={onHandleMove}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            >
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white bg-sky-500 shadow" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">{copy.aspect}</span>
            {(Object.keys(ASPECT_VALUES) as AspectId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAspect(id)}
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
              onClick={() => void applyRotate90(-90)}
              disabled={busy || !workSrc}
              title={copy.rotateLeft}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.rotateLeft}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void applyRotate90(90)}
              disabled={busy || !workSrc}
              title={copy.rotateRight}
            >
              <RotateCw className="h-3.5 w-3.5" />
              {copy.rotateRight}
            </button>
          </div>

          <label className="block text-xs font-bold text-slate-700">
            {copy.tilt}{" "}
            <span className="font-semibold tabular-nums text-slate-500">
              {tilt > 0 ? `+${tilt}` : tilt}°
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              step={0.5}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>

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
