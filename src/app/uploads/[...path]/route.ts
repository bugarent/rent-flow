import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { uploadRoot } from "@/lib/persistent-paths";
import { readHostedFile } from "@/lib/server/durable-fs";

export const maxDuration = 60;

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];

/** In-process cache so search grids do not re-fetch multi-MB HostedFile blobs + re-encode. */
const THUMB_CACHE_MAX = 200;
type ThumbEntry = { bytes: Buffer; contentType: string };
const globalForThumbs = globalThis as typeof globalThis & {
  __uploadThumbCache?: Map<string, ThumbEntry>;
};
const thumbCache = globalForThumbs.__uploadThumbCache ?? new Map<string, ThumbEntry>();
globalForThumbs.__uploadThumbCache = thumbCache;

function clampWidth(raw: string | null): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 16) return null;
  const want = Math.min(Math.floor(n), 1920);
  return OPTIMIZER_WIDTHS.find((w) => w >= want) ?? 1920;
}

function cacheGet(key: string) {
  const hit = thumbCache.get(key);
  if (!hit) return null;
  // Refresh insertion order for a simple LRU.
  thumbCache.delete(key);
  thumbCache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: { bytes: Buffer; contentType: string }) {
  if (thumbCache.has(key)) thumbCache.delete(key);
  thumbCache.set(key, value);
  while (thumbCache.size > THUMB_CACHE_MAX) {
    const oldest = thumbCache.keys().next().value;
    if (oldest === undefined) break;
    thumbCache.delete(oldest);
  }
}

async function maybeResize(bytes: Buffer, contentType: string, width: number | null) {
  if (!width || contentType === "application/pdf" || contentType === "image/gif") {
    return { bytes, contentType };
  }
  try {
    const out = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    return { bytes: out, contentType: "image/webp" };
  } catch {
    try {
      const out = await sharp(bytes, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
      return { bytes: out, contentType: "image/jpeg" };
    } catch {
      return { bytes, contentType };
    }
  }
}

function imageResponse(bytes: Buffer, contentType: string, width: number | null) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": width
        ? "public, max-age=86400, stale-while-revalidate=604800"
        : "public, max-age=3600",
      "X-Image-Optimized": width ? "1" : "0",
    },
  });
}

/**
 * Serves uploads when they live outside `public/` (Cloudways persistent disk /
 * Neon HostedFile). Optional `?w=` shrinks large gallery photos so search cards
 * do not download multi‑MB originals from Postgres.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const rel = normalize(parts.join("/")).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const root = resolve(uploadRoot());
  const file = resolve(join(root, rel));
  if (file !== root && !file.startsWith(root + sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const type = TYPES[extname(file).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  const width = clampWidth(new URL(req.url).searchParams.get("w"));
  const cacheKey = `${rel.replace(/\\/g, "/")}@${width ?? "full"}`;

  if (width) {
    const cached = cacheGet(cacheKey);
    if (cached) return imageResponse(cached.bytes, cached.contentType, width);
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("missing");
    const raw = await readFile(file);
    const resized = await maybeResize(raw, type, width);
    if (width) cacheSet(cacheKey, resized);
    return imageResponse(resized.bytes, resized.contentType, width);
  } catch {
    const hosted = await readHostedFile(rel.replace(/\\/g, "/"));
    if (!hosted) return new NextResponse("Not found", { status: 404 });
    const resized = await maybeResize(hosted.bytes, hosted.contentType || type, width);
    if (width) cacheSet(cacheKey, resized);
    return imageResponse(resized.bytes, resized.contentType, width);
  }
}
