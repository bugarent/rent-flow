import { isAbsolute, join, resolve } from "node:path";

const TMP_DATA = "/tmp/rentairportcars-data";
const TMP_UPLOADS = "/tmp/rentairportcars-uploads";

/**
 * JSON stores (bookings, partners, cars, settings).
 * Locally this is `<app>/.data`.
 * On Cloudways set DATA_DIR to a folder outside the deploy directory so a
 * new release never deletes saved information.
 * On Netlify/Vercel/Lambda the app lives at read-only `/var/task`. A relative
 * `DATA_DIR=data` becomes `/var/task/data`, and `mkdir` throws
 * `ENOENT: no such file or directory`. Those hosts use `/tmp` plus Postgres.
 */
function envPath(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function posix(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Indirect call so the bundler cannot replace this with the build directory. */
function runtimeCwd(): string {
  const read = process.cwd;
  return read.call(process);
}

function isTaskPath(resolved: string): boolean {
  const n = posix(resolved);
  return n === "/var/task" || n.startsWith("/var/task/");
}

export function isServerlessHost(): boolean {
  const cwd = posix(runtimeCwd());
  const taskRoot = posix(envPath("LAMBDA_TASK_ROOT"));
  return (
    Boolean(
      envPath("VERCEL") ||
        envPath("NETLIFY") ||
        envPath("AWS_LAMBDA_FUNCTION_NAME") ||
        envPath("AWS_EXECUTION_ENV"),
    ) ||
    isTaskPath(cwd) ||
    isTaskPath(taskRoot)
  );
}

function resolveRoot(envName: string, localFallback: string, tmpFallback: string): string {
  const fromEnv = envPath(envName);
  const cwd = runtimeCwd();
  const serverless = isServerlessHost() || isTaskPath(cwd);

  if (!fromEnv) {
    if (serverless || isTaskPath(localFallback)) return tmpFallback;
    return localFallback;
  }

  const resolved = isAbsolute(fromEnv) ? fromEnv : resolve(cwd, fromEnv);
  // Relative DATA_DIR (for example "data") is inside the read-only bundle.
  if (isTaskPath(resolved) || (serverless && !isAbsolute(fromEnv))) return tmpFallback;
  return resolved;
}

/**
 * Rewrite DATA_DIR before any store reads it. A relative `data` on Netlify/Lambda
 * is `/var/task/data`, which cannot be created.
 */
function pinWritableDataDir() {
  const cwd = runtimeCwd();
  const fromEnv = envPath("DATA_DIR");
  const resolved = !fromEnv ? join(cwd, ".data") : isAbsolute(fromEnv) ? fromEnv : resolve(cwd, fromEnv);
  const relativeOnServerless = Boolean(fromEnv) && !isAbsolute(fromEnv) && isServerlessHost();
  const missingOnServerless = !fromEnv && isServerlessHost();
  if (isTaskPath(resolved) || relativeOnServerless || missingOnServerless) {
    process.env.DATA_DIR = TMP_DATA;
  }
}

pinWritableDataDir();

export function dataRoot(): string {
  return resolveRoot("DATA_DIR", join(runtimeCwd(), ".data"), TMP_DATA);
}

export function dataFile(...parts: string[]): string {
  return join(dataRoot(), ...parts);
}

/**
 * Uploaded images and PDFs.
 * Locally this is `public/uploads`.
 * On Cloudways set UPLOAD_DIR outside the deploy directory and point
 * `public/uploads` at that folder (the start script does this).
 */
export function uploadRoot(): string {
  return resolveRoot("UPLOAD_DIR", join(runtimeCwd(), "public", "uploads"), TMP_UPLOADS);
}

export function uploadDir(...parts: string[]): string {
  return join(uploadRoot(), ...parts);
}

export function jsonStoreKey(absPath: string): string {
  const root = posix(dataRoot());
  const n = posix(absPath);
  if (n === root) return "_root";
  if (n.startsWith(`${root}/`)) return n.slice(root.length + 1);
  const named = n.split("/").filter(Boolean).slice(-2).join("/");
  return named || posix(absPath);
}
