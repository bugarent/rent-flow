/**
 * Client-side image shrink for partner uploads.
 * Keeps car photos viewable while cutting transfer size and disk use.
 */

const MAX_EDGE_PX = 1600;
const TARGET_BYTES = 420 * 1024;
const QUALITY_START = 0.76;
const QUALITY_MIN = 0.55;
const QUALITY_STEP = 0.07;
/** Skip work when the file is already light enough. */
const SKIP_UNDER_BYTES = 280 * 1024;

function isRasterImage(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return type !== "image/svg+xml";
  }
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image compress failed"))),
      type,
      quality,
    );
  });
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Resize + JPEG-encode images before upload. PDFs and non-images pass through.
 * Falls back to the original file if the browser cannot decode the image.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!isRasterImage(file)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaledSize(bitmap.width, bitmap.height, MAX_EDGE_PX);
    const alreadySmall =
      file.size <= SKIP_UNDER_BYTES &&
      bitmap.width <= MAX_EDGE_PX &&
      bitmap.height <= MAX_EDGE_PX;

    if (alreadySmall) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = QUALITY_START;
    let best = await canvasToBlob(canvas, "image/jpeg", quality);

    while (best.size > TARGET_BYTES && quality - QUALITY_STEP >= QUALITY_MIN) {
      quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
      const next = await canvasToBlob(canvas, "image/jpeg", quality);
      if (next.size >= best.size) break;
      best = next;
    }

    // Prefer original only if we somehow made it larger (rare tiny PNG icons).
    if (best.size >= file.size && file.type === "image/jpeg") {
      return file;
    }

    const base = file.name.replace(/\.\w+$/, "") || "photo";
    return new File([best], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
