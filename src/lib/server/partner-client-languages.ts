import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";
import {
  readCompanySettingsFile,
  resolveCompanySettings,
} from "@/lib/server/partner-company-settings-store";

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: string[] }>();

function clean(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((c) => String(c).trim().toLowerCase()).filter(Boolean))];
}

async function resolve(partnerId: string): Promise<string[]> {
  const bare = partnerId.replace(/^file-partner-/, "");
  try {
    const row = await prisma.partner.findFirst({
      where: { OR: [{ id: partnerId }, { id: bare }, { userId: bare }] },
    });
    if (row) return clean((await resolveCompanySettings(row)).clientLanguages);
  } catch {
    /* DB offline — file store below */
  }
  for (const id of new Set([partnerId, bare])) {
    const file = await readCompanySettingsFile(id);
    if (file) return clean(file.clientLanguages);
  }
  if (bare === LOCAL_PARTNER_ID) {
    const local = await readCompanySettingsFile(LOCAL_PARTNER_ID);
    if (local) return clean(local.clientLanguages);
  }
  return [];
}

/** Languages the partner selected in personal info for talking to clients (locale codes). */
export async function loadPartnerClientLanguages(partnerId: string | null | undefined): Promise<string[]> {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const value = await resolve(id);
    cache.set(id, { at: Date.now(), value });
    return value;
  } catch {
    return hit?.value ?? [];
  }
}
