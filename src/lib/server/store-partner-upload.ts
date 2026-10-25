import "server-only";

import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { uploadImageToCloudinary } from "@/lib/server/cloudinary-upload";
import { persistUploadedFile } from "@/lib/server/persist-upload";

const MAX_BYTES = 20 * 1024 * 1024;
/** Cloudinary must not hold the request until the host kills it (the browser then shows "Failed to fetch"). */
const CLOUDINARY_TIMEOUT_MS = 8_000;

type Sniff = "jpeg" | "png" | "gif" | "webp" | "pdf" | "other";

function sniff(bytes: Buffer): Sniff | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (bytes.length >= 6 && (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return "gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "other";
  if (bytes.length >= 4 && ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d))) {
    return "other";
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") return "other";
  return null;
}

function contentTypeOf(kind: Sniff): string {
  if (kind === "png") return "image/png";
  if (kind === "gif") return "image/gif";
  if (kind === "webp") return "image/webp";
  if (kind === "pdf") return "application/pdf";
  return "image/jpeg";
}

function extOf(kind: Sniff): string {
  if (kind === "png") return "png";
  if (kind === "gif") return "gif";
  if (kind === "webp") return "webp";
  if (kind === "pdf") return "pdf";
  return "jpg";
}

async function toJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const out = await sharp(bytes, { failOn: "none", animated: false, limitInputPixels: 120_000_000 })
      .rotate()
      .resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return out.length > 80 ? out : null;
  } catch {
    return null;
  }
}

async function putCloudinary(bytes: Uint8Array, publicId: string): Promise<string> {
  const uploaded = await Promise.race([
    uploadImageToCloudinary({ bytes: Buffer.from(bytes), folder: "partner-cars", publicId }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), CLOUDINARY_TIMEOUT_MS);
    }),
  ]);
  return uploaded.secureUrl;
}

async function putHosted(name: string, bytes: Uint8Array, contentType: string): Promise<string> {
  await persistUploadedFile(["partner-cars", name], Buffer.from(bytes), contentType);
  return `/uploads/partner-cars/${name}`;
}

/**
 * Save a partner/admin upload. Passport scans (`kind=document`) go to HostedFile
 * first so a slow image host cannot drop the request. Any image sharp can read
 * (JPEG, PNG, WEBP, GIF, HEIC, BMP, TIFF) is accepted.
 */
export async function storePartnerUpload(file: File, kind?: string | null): Promise<{ url: string }> {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("file required");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 20 MB)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(bytes);
  const document = kind === "document" || kind === "passport";

  if (sniffed === "pdf") {
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}.pdf`;
    return { url: await putHosted(name, bytes, "application/pdf") };
  }

  const standard = sniffed === "jpeg" || sniffed === "png" || sniffed === "gif" || sniffed === "webp";
  const keepOriginal = !document && standard && bytes.length <= 900 * 1024;
  let payload: Uint8Array = bytes;
  let contentType = sniffed ? contentTypeOf(sniffed) : "image/jpeg";
  let ext = sniffed ? extOf(sniffed) : "jpg";

  if (!keepOriginal) {
    const jpeg = await toJpeg(bytes);
    if (jpeg) {
      payload = jpeg;
      contentType = "image/jpeg";
      ext = "jpg";
    } else if (!standard) {
      throw new Error("PNG, JPG, WEBP, GIF, HEIC or PDF only");
    }
  }

  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const publicId = name.replace(/\.[^.]+$/, "");

  const hosted = () => putHosted(name, payload, contentType);
  const cloud = () => putCloudinary(payload, publicId);

  if (document) {
    try {
      return { url: await hosted() };
    } catch (error) {
      console.error("[upload] document store failed, trying image host", error);
      return { url: await cloud() };
    }
  }

  try {
    return { url: await cloud() };
  } catch (error) {
    console.error("[upload] image host failed, storing file", error);
    return { url: await hosted() };
  }
}
