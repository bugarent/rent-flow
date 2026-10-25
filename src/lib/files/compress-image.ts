/**
 * Client-side image shrink for partner uploads.
 * Phone photos of documents are often 8–15 MB (or HEIC). Those requests die on the
 * host before the server can answer, which the browser reports as "Failed to fetch".
 * This always tries to hand back a small JPEG. The original file is returned only
 * when the browser cannot decode it at all.
 */

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_TARGET_BYTES = 420 * 1024;
/** Stay under platform request limits even when the first encode is still heavy. */
const HARD_MAX_BYTES = 3.5 * 1024 * 1024;
const SKIP_UNDER_BYTES = 280 * 1024;

export type CompressImageOptions = {
  maxEdge?: number;
  targetBytes?: number;
};

function isPdf(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  return type === "application/pdf" || type === "application/x-pdf" || /\.pdf$/i.test(file.name);
}

function shouldTryDecode(file: File): boolean {
  if (isPdf(file)) return false;
  const type = (file.type || "").toLowerCase();
  if (type === "image/svg+xml") return false;
  if (type.startsWith("image/")) return true;
  if (!type || type === "application/octet-stream") return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|jfif|tiff?)$/i.test(file.name);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const edge = Math.max(width, height);
  if (!edge || edge <= maxEdge) return { width: Math.max(1, width), height: Math.max(1, height) };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawToCanvas(
  source: CanvasImageSource & { width: number; height: number },
  maxEdge: number,
): HTMLCanvasElement | null {
  const { width, height } = scaledSize(source.width, source.height, maxEdge);
  if (width < 8 || height < 8) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function encodeJpeg(canvas: HTMLCanvasElement, targetBytes: number): Promise<Blob | null> {
  const qualities = [0.82, 0.72, 0.6, 0.48, 0.38];
  let best: Blob | null = null;
  let current = canvas;
  for (let pass = 0; pass < 4; pass += 1) {
    for (const quality of qualities) {
      const blob = await canvasToBlob(current, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) return blob;
    }
    if (current.width <= 960 && current.height <= 960) break;
    const nextEdge = Math.max(960, Math.round(Math.max(current.width, current.height) * 0.72));
    const shrunk = drawToCanvas(current, nextEdge);
    if (!shrunk) break;
    current = shrunk;
  }
  return best;
}

async function bitmapFromFile(file: File, maxEdge: number): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  const attempts: ImageBitmapOptions[] = [];
  if (file.size > 1_200_000) {
    attempts.push({ imageOrientation: "from-image", resizeWidth: maxEdge, resizeQuality: "medium" });
  }
  attempts.push({ imageOrientation: "from-image" });
  attempts.push({});
  for (const options of attempts) {
    try {
      const bitmap = await createImageBitmap(file, options);
      if (bitmap.width >= 8 && bitmap.height >= 8) return bitmap;
      bitmap.close();
    } catch {
      /* try the next decoder settings */
    }
  }
  return null;
}

function imageElementFromFile(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width >= 8 && img.height >= 8 ? img : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function jpegFile(blob: Blob): File {
  return new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Resize + JPEG-encode images before upload. PDFs pass through.
 * Falls back to the original file if the browser cannot decode the image.
 */
export async function compressImageForUpload(file: File, options?: CompressImageOptions): Promise<File> {
  if (!shouldTryDecode(file)) return file;

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const targetBytes = options?.targetBytes ?? DEFAULT_TARGET_BYTES;

  try {
    const bitmap = await bitmapFromFile(file, maxEdge);
    let canvas: HTMLCanvasElement | null = null;
    if (bitmap) {
      const alreadySmall =
        !options?.maxEdge &&
        !options?.targetBytes &&
        file.size <= SKIP_UNDER_BYTES &&
        bitmap.width <= maxEdge &&
        bitmap.height <= maxEdge &&
        (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp");
      if (alreadySmall) {
        bitmap.close();
        return file;
      }
      canvas = drawToCanvas(bitmap, maxEdge);
      bitmap.close();
    }
    if (!canvas) {
      const img = await imageElementFromFile(file);
      if (img) canvas = drawToCanvas(img, maxEdge);
    }
    if (!canvas) return file;

    const blob = await encodeJpeg(canvas, targetBytes);
    if (!blob) return file;
    if (blob.size >= file.size && file.type === "image/jpeg" && file.size <= HARD_MAX_BYTES) return file;
    if (blob.size > HARD_MAX_BYTES && file.size <= blob.size) return file;
    return jpegFile(blob);
  } catch {
    return file;
  }
}
