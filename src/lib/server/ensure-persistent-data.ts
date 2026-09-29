import "server-only";

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { dataRoot, uploadRoot } from "@/lib/persistent-paths";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy files that are missing in the persistent folder.
 * Never overwrites and never deletes — a deploy must not wipe saved data.
 */
async function copyMissing(source: string, destination: string) {
  if (!(await exists(source))) return;
  if (source === destination) return;
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyMissing(from, to);
      continue;
    }
    if (entry.isFile() && !(await exists(to))) {
      await cp(from, to);
    }
  }
}

export async function ensurePersistentData() {
  const cwdData = join(process.cwd(), ".data");
  const cwdUploads = join(process.cwd(), "public", "uploads");
  await mkdir(dataRoot(), { recursive: true });
  await mkdir(uploadRoot(), { recursive: true });
  await copyMissing(cwdData, dataRoot());
  await copyMissing(cwdUploads, uploadRoot());
}
