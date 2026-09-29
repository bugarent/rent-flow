import { isAbsolute, join, resolve } from "node:path";

/**
 * JSON stores (bookings, partners, cars, settings).
 * Locally this is `<app>/.data`.
 * On Cloudways set DATA_DIR to a folder outside the deploy directory so a
 * new release never deletes saved information.
 */
function envPath(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function dataRoot(): string {
  const fromEnv = envPath("DATA_DIR");
  if (!fromEnv) return join(/*turbopackIgnore: true*/ process.cwd(), ".data");
  return isAbsolute(fromEnv)
    ? fromEnv
    : resolve(/*turbopackIgnore: true*/ process.cwd(), fromEnv);
}

export function dataFile(...parts: string[]): string {
  return join(/*turbopackIgnore: true*/ dataRoot(), ...parts);
}

/**
 * Uploaded images and PDFs.
 * Locally this is `public/uploads`.
 * On Cloudways set UPLOAD_DIR outside the deploy directory and point
 * `public/uploads` at that folder (the start script does this).
 */
export function uploadRoot(): string {
  const fromEnv = envPath("UPLOAD_DIR");
  if (!fromEnv) return join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
  return isAbsolute(fromEnv)
    ? fromEnv
    : resolve(/*turbopackIgnore: true*/ process.cwd(), fromEnv);
}

export function uploadDir(...parts: string[]): string {
  return join(/*turbopackIgnore: true*/ uploadRoot(), ...parts);
}
