import "server-only";

import { redisDel, redisGet, redisSet } from "@/lib/server/cache/redis-cache";

const memory = new Map<string, { at: number; value: string }>();
const TTL_MS = 15_000;
const tracked = new Set<string>();

export async function readAvailabilityCache(key: string): Promise<string[] | null> {
  const row = memory.get(key);
  if (row && Date.now() - row.at < TTL_MS) {
    try {
      const parsed = JSON.parse(row.value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : null;
    } catch {
      memory.delete(key);
    }
  }
  const remote = await redisGet(key);
  if (!remote) return null;
  memory.set(key, { at: Date.now(), value: remote });
  try {
    const parsed = JSON.parse(remote) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : null;
  } catch {
    return null;
  }
}

export async function writeAvailabilityCache(key: string, ids: string[]) {
  const value = JSON.stringify(ids);
  memory.set(key, { at: Date.now(), value });
  tracked.add(key);
  await redisSet(key, value, 15);
}

export async function clearAvailabilityCache() {
  const keys = [...tracked];
  memory.clear();
  tracked.clear();
  await Promise.all(keys.map((key) => redisDel(key)));
}
