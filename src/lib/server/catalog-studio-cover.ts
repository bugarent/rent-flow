import "server-only";

import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { uploadDir } from "@/lib/persistent-paths";
import { persistUploadedFile } from "@/lib/server/persist-upload";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

const CANVAS_W = 1536;
const CANVAS_H = 1024;

export type StudioCoverIdentity = {
  make: string;
  model: string;
  year: string;
  color: string;
};

const inflight = new Map<string, Promise<string>>();

function cleanPart(value: string, max = 48): string {
  return value.replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s.'-]+/gu, "").trim().slice(0, max);
}

export function normalizeStudioCoverIdentity(input: StudioCoverIdentity): StudioCoverIdentity | null {
  const make = cleanPart(input.make);
  const model = cleanPart(input.model);
  const year = String(input.year || "").trim();
  const color = cleanPart(input.color, 32);
  if (!make || !model || !color || !/^(19|20)\d{2}$/.test(year)) return null;
  return { make, model, year, color };
}

function identityKey(identity: StudioCoverIdentity): string {
  return createHash("sha256")
    .update([identity.make, identity.model, identity.year, identity.color].join("|").toLowerCase())
    .digest("hex")
    .slice(0, 20);
}

function coverPrompt(identity: StudioCoverIdentity): string {
  return [
    `Professional automotive catalog photograph of one ${identity.year} ${identity.make} ${identity.model}.`,
    `Body paint is exactly ${identity.color}.`,
    "Front three-quarter view, the entire vehicle visible, realistic proportions.",
    "Flat pure white studio background, soft commercial lighting, no people, no text, no logo, no watermark, no license plate.",
  ].join(" ");
}

async function readOpenAiKey(): Promise<string | null> {
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* settings are optional */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

async function generateWithOpenAi(prompt: string, key: string): Promise<Buffer | null> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = payload.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const image = await fetch(first.url, { signal: AbortSignal.timeout(20_000) });
    if (!image.ok) return null;
    return Buffer.from(await image.arrayBuffer());
  }
  return null;
}

async function generateWithCatalog(prompt: string, seed: number): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=854&nologo=true&model=flux&seed=${seed}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error("cover_style");
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/") || bytes.length < 8_000) throw new Error("cover_style");
  return bytes;
}

async function placeOnWhite(bytes: Buffer): Promise<Buffer> {
  const fitted = await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({ width: 1320, height: 860, fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(fitted).metadata();
  const width = meta.width || 1320;
  const height = meta.height || 860;
  const left = Math.max(0, Math.round((CANVAS_W - width) / 2));
  const top = Math.max(0, Math.round((CANVAS_H - height) / 2));
  return sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: fitted, left, top }])
    .jpeg({ quality: 86 })
    .toBuffer();
}

async function createCoverFile(identity: StudioCoverIdentity, filename: string): Promise<void> {
  const prompt = coverPrompt(identity);
  const seed = Number.parseInt(filename.slice(7, 15), 16) || 1;
  let source: Buffer | null = null;
  const key = await readOpenAiKey();
  if (key) {
    try {
      source = await generateWithOpenAi(prompt, key);
    } catch (error) {
      console.error("[studio-cover] openai", error instanceof Error ? error.message : "failed");
    }
  }
  if (!source || source.length < 8_000) source = await generateWithCatalog(prompt, seed);
  const plate = await placeOnWhite(source);
  await persistUploadedFile(["partner-cars", filename], plate, "image/jpeg");
}

/** Find a saved studio cover for this car, or create one and store it as the listing cover. */
export async function ensureCatalogStudioCover(input: StudioCoverIdentity): Promise<string> {
  const identity = normalizeStudioCoverIdentity(input);
  if (!identity) throw new Error("cover_identity");
  const filename = `studio-${identityKey(identity)}.jpg`;
  const url = `/uploads/partner-cars/${filename}`;
  const disk = join(uploadDir("partner-cars"), filename);
  try {
    await access(disk);
    return url;
  } catch {
    /* not saved yet */
  }
  const existing = inflight.get(filename);
  if (existing) return existing;
  const job = createCoverFile(identity, filename)
    .then(() => url)
    .finally(() => {
      inflight.delete(filename);
    });
  inflight.set(filename, job);
  return job;
}
