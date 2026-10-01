import "server-only";

import { access, rename } from "node:fs/promises";
import { mkdir } from "@/lib/server/durable-fs";
import { dirname, join } from "node:path";
import { dataRoot as persistentDataRoot } from "@/lib/persistent-paths";

/** Logical groups under `.data/<group>/…` (legacy flat `.data/file.json` still read). */
export type DataGroup =
  | "bookings"
  | "invoices"
  | "homepage"
  | "partner"
  | "catalog"
  | "admin"
  | "misc";

const ROOT = () => persistentDataRoot();

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a JSON store path under `.data/<group>/<file>`.
 * If only the legacy flat `.data/<file>` exists, migrate it once into the group folder.
 */
export async function resolveDataFile(group: DataGroup, fileName: string): Promise<string> {
  const root = ROOT();
  const modern = join(root, group, fileName);
  const legacy = join(root, fileName);

  if (await exists(modern)) return modern;

  if (await exists(legacy)) {
    try {
      await mkdir(dirname(modern), { recursive: true });
      await rename(legacy, modern);
      return modern;
    } catch {
      // Another process may have moved it; prefer modern if it appeared.
      if (await exists(modern)) return modern;
      return legacy;
    }
  }

  return modern;
}

export async function ensureDataDir(group?: DataGroup): Promise<string> {
  const dir = group ? join(ROOT(), group) : ROOT();
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.warn("[data-paths] mkdir skipped", dir, error);
  }
  return dir;
}

export function dataRoot(): string {
  return persistentDataRoot();
}
