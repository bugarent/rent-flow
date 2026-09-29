"use client";

import { useEffect, useRef, useState } from "react";

type CropState = {
  src: string;
  fileName: string;
};

/**
 * Interactive zoom/pan cropper sized to homepage category card aspect ratio (~5:3).
 */
export function ImageCropUpload({
  onUploaded,
  onError,
  label = "Or upload image",
  aspect = 5 / 3,
  outputWidth = 900,
}: {
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  label?: string;
  aspect?: number;
  outputWidth?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (crop?.src) URL.revokeObjectURL(crop.src);
    };
  }, [crop?.src]);

  useEffect(() => {
    if (!crop || !viewportRef.current) return;
    const node = viewportRef.current;
    const measure = () => setViewportSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [crop]);

  const close = () => {
    if (crop?.src) URL.revokeObjectURL(crop.src);
    setCrop(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Please choose an image file");
      return;
    }
    const src = URL.createObjectURL(file);
    setCrop({ src, fileName: file.name });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const coverScale =
    natural.w && viewportSize.w
      ? Math.max(viewportSize.w / natural.w, viewportSize.h / natural.h)
      : 1;
  const drawW = natural.w * coverScale * zoom;
  const drawH = natural.h * coverScale * zoom;

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const exportAndUpload = async () => {
    if (!crop || !viewportSize.w || !natural.w) return;
    setBusy(true);
    try {
      const vw = viewportSize.w;
      const vh = viewportSize.h;
      const dx = (vw - drawW) / 2 + offset.x;
      const dy = (vh - drawH) / 2 + offset.y;

      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not crop image");

      const img = new Image();
      img.src = crop.src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image"));
      });

      const scaleX = outputWidth / vw;
      const scaleY = outH / vh;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, outputWidth, outH);
      ctx.drawImage(img, dx * scaleX, dy * scaleY, drawW * scaleX, drawH * scaleY);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92);
      });

      const file = new File([blob], crop.fileName.replace(/\.\w+$/, "") + "-cropped.jpg", {
        type: "image/jpeg",
      });
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onUploaded(json.url as string);
      close();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {crop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-slate-900">Adjust image</h3>
            <p className="mb-4 text-sm text-slate-500">Zoom and drag to frame the category card.</p>

            <div
              ref={viewportRef}
              className="relative mx-auto w-full max-w-md cursor-grab overflow-hidden rounded-xl bg-slate-900 active:cursor-grabbing"
              style={{ aspectRatio: String(aspect) }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crop.src}
                alt=""
                draggable={false}
                onLoad={(e) =>
                  setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
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
              <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/70" />
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Zoom
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

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400"
                onClick={() => void exportAndUpload()}
                disabled={busy || !natural.w}
              >
                {busy ? "Uploading…" : "Apply & upload"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
