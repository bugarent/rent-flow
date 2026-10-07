import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { uploadRoot } from "@/lib/persistent-paths";
import { readHostedFile } from "@/lib/server/durable-fs";
import { persistUploadedFile } from "@/lib/server/persist-upload";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

const CANVAS_W = 1536;
const CANVAS_H = 1024;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const inflight = new Map<string, Promise<string>>();

export type PhotoCoverHint = { make?: string; model?: string; year?: string; color?: string };

function coverFilename(photoUrl: string): string {
  const hash = createHash("sha256").update(`photo-cover-v1|${photoUrl.trim()}`).digest("hex").slice(0, 20);
  return `studio-${hash}.jpg`;
}

function uploadKey(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  if (!path.startsWith("/uploads/")) return null;
  const key = decodeURIComponent(path.slice("/uploads/".length));
  if (!key || key.includes("..")) return null;
  return key;
}

/** Bytes of a gallery photo saved by our upload route (disk first, then the hosted copy). Only `/uploads/…`. */
async function loadPhotoBytes(photoUrl: string): Promise<Buffer> {
  const key = uploadKey(photoUrl);
  if (key) {
    try {
      const disk = await readFile(join(uploadRoot(), ...key.split("/")));
      if (disk.length && disk.length <= MAX_SOURCE_BYTES) return disk;
    } catch {
      /* serverless disk copy may be gone */
    }
    const hosted = await readHostedFile(key);
    if (hosted?.bytes?.length && hosted.bytes.length <= MAX_SOURCE_BYTES) return hosted.bytes;
  }
  throw new Error("cover_source");
}

async function coverExists(filename: string): Promise<boolean> {
  try {
    await readFile(join(uploadRoot(), "partner-cars", filename));
    return true;
  } catch {
    /* check hosted copy */
  }
  try {
    return Boolean((await readHostedFile(`partner-cars/${filename}`))?.bytes?.length);
  } catch {
    return false;
  }
}

async function readOpenAiKey(): Promise<string | null> {
  try {
    const fromSettings = (await getPlatformSettings()).openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* settings are optional */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function editPrompt(hint: PhotoCoverHint): string {
  const named = [hint.year, hint.color, hint.make, hint.model].filter((p) => p?.trim()).join(" ");
  return [
    `Professional rental catalog studio photo of exactly this car${named ? ` (${named})` : ""}.`,
    "Keep the same car: identical make, model, body shape, paint color, wheels and details as in the photo.",
    "Remove the original surroundings. Place the whole car centered in a bright photo studio:",
    "seamless pure white background, light gray glossy floor, soft natural shadow under the tires, soft even studio lighting.",
    "Three-quarter front view. Blank license plate. No people, no text, no logos, no watermark, no extra objects.",
  ].join(" ");
}

/** Same car on a studio background, generated from the partner's own photo. */
async function studioWithOpenAi(source: Buffer, hint: PhotoCoverHint, key: string): Promise<Buffer | null> {
  const input = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", editPrompt(hint));
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  form.append("image", new Blob([new Uint8Array(input)], { type: "image/png" }), "car.png");
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    console.error("[photo-cover] openai edit", response.status, (await response.text()).slice(0, 300));
    return null;
  }
  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = payload.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const image = await fetch(first.url, { signal: AbortSignal.timeout(20_000) });
    if (image.ok) return Buffer.from(await image.arrayBuffer());
  }
  return null;
}

/**
 * Offline studio look: the photo, colour-corrected, with rounded corners and a soft
 * shadow on a white-to-gray studio backdrop. Always succeeds for a readable image.
 */
async function studioLocally(source: Buffer): Promise<Buffer> {
  const photoW = 1320;
  const photoH = 830;
  const radius = 32;
  const photo = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: photoW, height: photoH, fit: "cover", position: "attention" })
    .normalise({ lower: 1, upper: 99 })
    .modulate({ brightness: 1.04, saturation: 1.08 })
    .sharpen({ sigma: 0.8 })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${photoW}" height="${photoH}"><rect width="${photoW}" height="${photoH}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const left = Math.round((CANVAS_W - photoW) / 2);
  const top = Math.round((CANVAS_H - photoH) / 2) - 20;
  const backdrop = Buffer.from(
    `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.62" stop-color="#f4f6f9"/>
          <stop offset="1" stop-color="#e3e8ef"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#wall)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <rect x="${left + 18}" y="${top + 34}" width="${photoW - 36}" height="${photoH - 10}" rx="${radius}" fill="#0b1f4b" opacity="0.28" filter="url(#blur)"/>
      <ellipse cx="${CANVAS_W / 2}" cy="${top + photoH + 26}" rx="${photoW * 0.42}" ry="18" fill="#0b1f4b" opacity="0.12" filter="url(#blur)"/>
    </svg>`,
  );

  return sharp(backdrop)
    .composite([{ input: photo, left, top }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function fitCanvas(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes, { failOn: "none" })
    .resize({ width: CANVAS_W, height: CANVAS_H, fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function createCover(photoUrl: string, hint: PhotoCoverHint, filename: string): Promise<void> {
  const source = await loadPhotoBytes(photoUrl);
  let cover: Buffer | null = null;
  const key = await readOpenAiKey();
  if (key) {
    try {
      const edited = await studioWithOpenAi(source, hint, key);
      if (edited && edited.length > 8_000) cover = await fitCanvas(edited);
    } catch (error) {
      console.error("[photo-cover] openai", error instanceof Error ? error.message : "failed");
    }
  }
  if (!cover) cover = await studioLocally(source);
  await persistUploadedFile(["partner-cars", filename], cover, "image/jpeg");
}

/** Studio-style cover built from the first gallery photo; cached per photo URL. */
export async function ensureStudioCoverFromPhoto(photoUrl: string, hint: PhotoCoverHint = {}): Promise<string> {
  const source = String(photoUrl || "").trim();
  if (!source || source.startsWith("blob:")) throw new Error("cover_source");
  const filename = coverFilename(source);
  const url = `/uploads/partner-cars/${filename}`;
  if (await coverExists(filename)) return url;
  const existing = inflight.get(filename);
  if (existing) return existing;
  const job = createCover(source, hint, filename)
    .then(() => url)
    .finally(() => inflight.delete(filename));
  inflight.set(filename, job);
  return job;
}
