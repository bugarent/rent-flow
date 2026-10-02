import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isServerlessHost, uploadDir } from "@/lib/persistent-paths";
import { saveHostedFile } from "@/lib/server/durable-fs";

/**
 * Write an upload to disk and to Postgres.
 * On Netlify the disk copy disappears, so the database copy is required.
 */
export async function persistUploadedFile(relativeParts: string[], bytes: Buffer, contentType: string) {
  const key = relativeParts.join("/");
  const filename = relativeParts[relativeParts.length - 1];
  const dir = uploadDir(...relativeParts.slice(0, -1));
  let fileOk = false;
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), bytes);
    fileOk = true;
  } catch (error) {
    console.warn("[upload] disk write failed", key, error);
  }
  const dbOk = await saveHostedFile(key, contentType, bytes);
  if (dbOk) return;
  if (fileOk && !isServerlessHost()) return;
  throw new Error("Could not save the image");
}
