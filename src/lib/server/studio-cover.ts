import "server-only";

import { getPlatformSettings } from "@/lib/server/platform-settings-store";

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

function cleanLabel(value: string, max: number) {
  return value
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function studioCoverIdentity(input: {
  make: string;
  model: string;
  year: string;
  color: string;
}) {
  const make = cleanLabel(input.make, 40);
  const model = cleanLabel(input.model, 40);
  const color = cleanLabel(input.color, 24);
  const yearNum = Number(String(input.year).trim());
  const maxYear = new Date().getFullYear() + 1;
  const year = Number.isInteger(yearNum) && yearNum >= 1980 && yearNum <= maxYear ? String(yearNum) : "";
  if (!make || !model || !year || !color) return null;
  return { make, model, year, color };
}

async function openAiKey() {
  try {
    const settings = await getPlatformSettings();
    const fromSettings = settings.openaiApiKey?.trim();
    if (fromSettings) return fromSettings;
  } catch {
    /* settings file can be missing in local dev */
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

/**
 * Restyle one uploaded car photo as a white-studio catalog cover of the
 * selected make, model, year, and color. Other listing photos are not passed here.
 */
export async function renderStudioCover(input: {
  bytes: Buffer;
  mime: string;
  make: string;
  model: string;
  year: string;
  color: string;
}): Promise<Buffer> {
  const identity = studioCoverIdentity(input);
  if (!identity) throw new Error("cover_identity");
  const key = await openAiKey();
  if (!key) throw new Error("cover_style");

  const prompt = [
    `Photorealistic car-rental catalog cover of a ${identity.year} ${identity.color} ${identity.make} ${identity.model}.`,
    "Use the uploaded photo only as the source vehicle, then restyle it.",
    "The car must match that make, model, year, and paint color. Do not substitute a different model or color.",
    "Three-quarter front view, entire car visible and centered, all wheels on the ground.",
    "Seamless pure white studio background. Light gray floor with one thin circular turntable ring under the car.",
    "Soft even studio light, no harsh shadows, blank white license plate.",
    "No people, no text, no watermark, no extra objects.",
  ].join(" ");

  const form = new FormData();
  form.append("model", IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  const source = new Uint8Array(input.bytes.byteLength);
  source.set(input.bytes);
  form.append("image", new Blob([source], { type: input.mime || "image/jpeg" }), "source.jpg");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(55_000),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("[studio-cover] image edit failed", res.status, raw.slice(0, 400));
    throw new Error("cover_style");
  }

  let parsed: { data?: Array<{ b64_json?: string; url?: string }> };
  try {
    parsed = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> };
  } catch {
    throw new Error("cover_style");
  }

  const first = parsed.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const image = await fetch(first.url, { signal: AbortSignal.timeout(20_000) });
    if (!image.ok) throw new Error("cover_style");
    return Buffer.from(await image.arrayBuffer());
  }
  throw new Error("cover_style");
}
