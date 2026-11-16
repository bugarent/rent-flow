"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Eraser, Move, RotateCcw, RotateCw, X } from "lucide-react";
import { compressImageForUpload } from "@/lib/files/compress-image";
import { cn } from "@/lib/utils";

type AspectId = "free" | "4:3" | "1:1" | "3:4" | "16:9";
type ToolId = "move" | "erase";

const ASPECT_VALUES: Record<AspectId, number | null> = {
  free: null,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
};

const MAX_INSET = 0.4;

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "სურათის კორექტირება",
      hint: "მოჭერით გვერდები, დახარეთ, წაშალეთ ზედმეტი დეტალები და შეინახეთ ჩარჩო.",
      aspect: "ფორმა",
      free: "თავისუფალი",
      zoom: "მასშტაბი",
      tilt: "დახრა",
      sides: "გვერდების მოჭრა",
      left: "მარცხენა",
      right: "მარჯვენა",
      top: "ზედა",
      bottom: "ქვედა",
      toolMove: "გადაადგილება",
      toolErase: "წაშლა",
      brush: "ფუნჯი",
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
      hint: "Обрежьте края, наклоните, сотрите лишнее и сохраните кадр.",
      aspect: "Формат",
      free: "Свободно",
      zoom: "Масштаб",
      tilt: "Наклон",
      sides: "Обрезка сторон",
      left: "Слева",
      right: "Справа",
      top: "Сверху",
      bottom: "Снизу",
      toolMove: "Сдвиг",
      toolErase: "Ластик",
      brush: "Кисть",
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
    hint: "Trim sides, tilt, erase unwanted details, then save the frame.",
    aspect: "Shape",
    free: "Free",
    zoom: "Zoom",
    tilt: "Tilt",
    sides: "Side trim",
    left: "Left",
    right: "Right",
    top: "Top",
    bottom: "Bottom",
    toolMove: "Move",
    toolErase: "Erase",
    brush: "Brush",
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

/** Soft heal brush: fill the stroke with averaged nearby pixels so spots fade. */
function healBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  imgW: number,
  imgH: number,
) {
  const r = Math.max(4, Math.round(radius));
  const sampleR = Math.round(r * 2.2);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  const sx0 = Math.max(0, Math.floor(x - sampleR));
  const sy0 = Math.max(0, Math.floor(y - sampleR));
  const sx1 = Math.min(imgW, Math.ceil(x + sampleR));
  const sy1 = Math.min(imgH, Math.ceil(y + sampleR));
  if (sx1 <= sx0 || sy1 <= sy0) return;
  const sample = ctx.getImageData(sx0, sy0, sx1 - sx0, sy1 - sy0);
  const data = sample.data;
  for (let py = sy0; py < sy1; py++) {
    for (let px = sx0; px < sx1; px++) {
      const dx = px - x;
      const dy = py - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r * 1.15 || dist > sampleR) continue;
      const i = ((py - sy0) * (sx1 - sx0) + (px - sx0)) * 4;
      sumR += data[i]!;
      sumG += data[i + 1]!;
      sumB += data[i + 2]!;
      count += 1;
    }
  }
  if (!count) return;
  const fill = `rgb(${Math.round(sumR / count)},${Math.round(sumG / count)},${Math.round(sumB / count)})`;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, fill);
  grad.addColorStop(0.65, fill);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
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

type Insets = { left: number; right: number; top: number; bottom: number };

/** Crop / tilt / side-trim / erase an existing listing or passport image. */
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
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [workSrc, setWorkSrc] = useState<string | null>(null);
  const [revokeWork, setRevokeWork] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState(0);
  const [insets, setInsets] = useState<Insets>({ left: 0, right: 0, top: 0, bottom: 0 });
  const [aspectId, setAspectId] = useState<AspectId>(asDocument ? "3:4" : "4:3");
  const [tool, setTool] = useState<ToolId>("move");
  const [brush, setBrush] = useState(28);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [usingPaint, setUsingPaint] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const lastErase = useRef<{ x: number; y: number } | null>(null);
  const revokeWorkRef = useRef(false);
  revokeWorkRef.current = revokeWork;

  const syncViewCanvas = () => {
    const paint = paintCanvasRef.current;
    const view = viewCanvasRef.current;
    if (!paint || !view) return;
    if (view.width !== paint.width || view.height !== paint.height) {
      view.width = paint.width;
      view.height = paint.height;
    }
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(paint, 0, 0);
  };

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
    setInsets({ left: 0, right: 0, top: 0, bottom: 0 });
    setNatural({ w: 0, h: 0 });
    setAspectId(asDocument ? "3:4" : "4:3");
    setTool("move");
    setUsingPaint(false);
    paintCanvasRef.current = null;
    lastErase.current = null;
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
  }, [open, aspectId, workSrc, insets.left, insets.right, insets.top, insets.bottom]);

  const ensurePaintCanvas = async () => {
    if (paintCanvasRef.current) {
      syncViewCanvas();
      setUsingPaint(true);
      return paintCanvasRef.current;
    }
    if (!workSrc) throw new Error(copy.loadFailed);
    const img = await loadImage(workSrc);
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error(copy.failed);
    ctx.drawImage(img, 0, 0);
    paintCanvasRef.current = canvas;
    setNatural({ w: canvas.width, h: canvas.height });
    setUsingPaint(true);
    requestAnimationFrame(syncViewCanvas);
    return canvas;
  };

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

  const mapPointerToImage = (clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp || !natural.w) return null;
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx - offset.x;
    let dy = clientY - cy - offset.y;
    const rad = (-tilt * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    const x = rx / (coverScale * zoom) + natural.w / 2;
    const y = ry / (coverScale * zoom) + natural.h / 2;
    return { x, y };
  };

  const eraseAt = async (clientX: number, clientY: number, continuous: boolean) => {
    try {
      const canvas = await ensurePaintCanvas();
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const pt = mapPointerToImage(clientX, clientY);
      if (!pt) return;
      const radius = brush / (coverScale * zoom);
      const points: Array<{ x: number; y: number }> = [pt];
      if (continuous && lastErase.current) {
        const prev = lastErase.current;
        const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
        const steps = Math.max(1, Math.floor(dist / Math.max(2, radius * 0.35)));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          points.push({
            x: prev.x + (pt.x - prev.x) * t,
            y: prev.y + (pt.y - prev.y) * t,
          });
        }
      }
      for (const p of points) {
        if (p.x < -radius || p.y < -radius || p.x > canvas.width + radius || p.y > canvas.height + radius) {
          continue;
        }
        healBrush(ctx, p.x, p.y, radius, canvas.width, canvas.height);
      }
      lastErase.current = pt;
      syncViewCanvas();
    } catch {
      setError(copy.failed);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    if (tool === "erase") {
      lastErase.current = null;
      void eraseAt(e.clientX, e.clientY, false);
      return;
    }
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (tool === "erase") {
      void eraseAt(e.clientX, e.clientY, true);
      return;
    }
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    lastErase.current = null;
  };

  const applyRotate90 = async (degrees: 90 | -90) => {
    if (!workSrc || busy) return;
    setBusy(true);
    setError(null);
    try {
      const sourceUrl = paintCanvasRef.current
        ? await canvasToObjectUrl(paintCanvasRef.current, 0.95)
        : workSrc;
      const next = await rotateCanvas90(sourceUrl, degrees);
      if (sourceUrl !== workSrc) URL.revokeObjectURL(sourceUrl);
      setWorkSrc((prev) => {
        if (prev && revokeWorkRef.current) URL.revokeObjectURL(prev);
        return next;
      });
      setRevokeWork(true);
      paintCanvasRef.current = null;
      setUsingPaint(false);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setTilt(0);
      setNatural({ w: 0, h: 0 });
    } catch {
      setError(copy.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const setInset = (key: keyof Insets, value: number) => {
    setInsets((prev) => {
      const next = { ...prev, [key]: Math.min(MAX_INSET, Math.max(0, value)) };
      const pair =
        key === "left" || key === "right"
          ? next.left + next.right
          : next.top + next.bottom;
      if (pair > 0.75) {
        const other = key === "left" ? "right" : key === "right" ? "left" : key === "top" ? "bottom" : "top";
        next[other] = Math.max(0, 0.75 - next[key]);
      }
      return next;
    });
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
      await ensurePaintCanvas();
      const source = paintCanvasRef.current;
      if (!source) throw new Error(copy.failed);

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

      // Render the full viewport, then crop the inset window.
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
      fctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
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
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTool("move")}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold",
                tool === "move"
                  ? "border-sky-600 bg-sky-50 text-sky-800"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              <Move className="h-3.5 w-3.5" />
              {copy.toolMove}
            </button>
            <button
              type="button"
              onClick={() => {
                setTool("erase");
                void ensurePaintCanvas().catch(() => setError(copy.loadFailed));
              }}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold",
                tool === "erase"
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              <Eraser className="h-3.5 w-3.5" />
              {copy.toolErase}
            </button>
          </div>

          <div
            ref={viewportRef}
            className={cn(
              "relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-900 touch-none",
              tool === "erase" ? "cursor-crosshair" : dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {usingPaint ? (
              <canvas
                ref={(el) => {
                  viewCanvasRef.current = el;
                  if (el) syncViewCanvas();
                }}
                className="pointer-events-none absolute select-none"
                style={{
                  width: drawW || "100%",
                  height: drawH || "auto",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${tilt}deg)`,
                }}
              />
            ) : workSrc ? (
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
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/75" />
            {/* Side-trim guides */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-slate-950/55"
              style={{ width: `${insets.left * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-slate-950/55"
              style={{ width: `${insets.right * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/55"
              style={{ height: `${insets.top * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/55"
              style={{ height: `${insets.bottom * 100}%` }}
            />
            <div
              className="pointer-events-none absolute border-2 border-sky-300/90"
              style={{
                left: `${insets.left * 100}%`,
                right: `${insets.right * 100}%`,
                top: `${insets.top * 100}%`,
                bottom: `${insets.bottom * 100}%`,
              }}
            />
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

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-xs font-extrabold text-slate-700">{copy.sides}</p>
            {(
              [
                ["left", copy.left],
                ["right", copy.right],
                ["top", copy.top],
                ["bottom", copy.bottom],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid grid-cols-[4.5rem_1fr_2.25rem] items-center gap-2 text-xs font-semibold text-slate-700">
                <span>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_INSET}
                  step={0.01}
                  value={insets[key]}
                  onChange={(e) => setInset(key, Number(e.target.value))}
                  className="w-full"
                />
                <span className="tabular-nums text-slate-500">{Math.round(insets[key] * 100)}%</span>
              </label>
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

          {tool === "erase" ? (
            <label className="block text-xs font-bold text-slate-700">
              {copy.brush}
              <input
                type="range"
                min={12}
                max={72}
                step={1}
                value={brush}
                onChange={(e) => setBrush(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
          ) : null}

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
