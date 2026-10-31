import "server-only";

import { randomBytes } from "node:crypto";
import sharp from "sharp";
import type { CountryCover } from "@/lib/catalog/country-covers";
import { persistUploadedFile } from "@/lib/server/persist-upload";

const MAX_BYTES = 20 * 1024 * 1024;
const DESKTOP_MAX_WIDTH = 1600;
const MOBILE_MAX_HEIGHT = 1000;

async function put(name: string, bytes: Buffer, contentType: string): Promise<string> {
  await persistUploadedFile(["country-covers", name], bytes, contentType);
  return `/uploads/country-covers/${name}`;
}

/**
 * Any photo the admin uploads becomes a light landscape cover (≤1600px) and a 3:4 phone crop
 * around the landmark, each as AVIF + WebP, so the hero stays fast whatever the original was.
 */
export async function buildCountryCover(file: File, iso: string, focalX: number): Promise<CountryCover> {
  if (!(file instanceof File) || file.size <= 0) throw new Error("file required");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 20 MB)");

  const input = Buffer.from(await file.arrayBuffer());
  const base = sharp(input, { failOn: "none", animated: false, limitInputPixels: 120_000_000 }).rotate();
  const oriented = await base.clone().toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!oriented) throw new Error("PNG, JPG, WEBP, HEIC or AVIF only");
  const { width: srcW, height: srcH } = oriented.info;
  if (!srcW || !srcH) throw new Error("Could not read the image");

  const desktop = sharp(oriented.data).resize({ width: DESKTOP_MAX_WIDTH, withoutEnlargement: true });
  const cropW = Math.min(srcW, Math.round((srcH * 3) / 4));
  const left = Math.max(0, Math.min(srcW - cropW, Math.round(srcW * focalX - cropW / 2)));
  const mobile = sharp(oriented.data)
    .extract({ left, top: 0, width: cropW, height: srcH })
    .resize({ height: MOBILE_MAX_HEIGHT, withoutEnlargement: true });

  const [webp, avif, mobileWebp, mobileAvif] = await Promise.all([
    desktop.clone().webp({ quality: 70, effort: 5 }).toBuffer({ resolveWithObject: true }),
    desktop.clone().avif({ quality: 48, effort: 3 }).toBuffer(),
    mobile.clone().webp({ quality: 68, effort: 5 }).toBuffer(),
    mobile.clone().avif({ quality: 46, effort: 3 }).toBuffer(),
  ]);

  const stamp = `${iso.toLowerCase()}-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const [webpUrl, avifUrl, mobileWebpUrl, mobileAvifUrl] = await Promise.all([
    put(`${stamp}.webp`, webp.data, "image/webp"),
    put(`${stamp}.avif`, avif, "image/avif"),
    put(`${stamp}-sm.webp`, mobileWebp, "image/webp"),
    put(`${stamp}-sm.avif`, mobileAvif, "image/avif"),
  ]);

  return {
    webp: webpUrl,
    avif: avifUrl,
    mobileWebp: mobileWebpUrl,
    mobileAvif: mobileAvifUrl,
    focalX,
    width: webp.info.width,
    height: webp.info.height,
    updatedAt: new Date().toISOString(),
  };
}
