import "server-only";

import { PORTAL_ID_START, formatPartnerCode } from "@/lib/ids";
import { normalizeLogin } from "@/lib/crypto";
import {
  findFilePartnerSequentialByEmail,
  allocateFilePartnerSequentialNumber,
} from "@/lib/server/partner-applications-store";
import {
  LOCAL_PARTNER_ID,
  loadLocalPartner,
  saveLocalPartner,
} from "@/lib/auth/local-partner-store";

/**
 * Resolve a real PRT-{n} sequential number for file/local partners
 * (never returns a placeholder like PRT-LOCAL).
 */
export async function ensureFilePartnerSequentialNumber(opts: {
  partnerId: string;
  email?: string | null;
}): Promise<number> {
  const email = opts.email ? normalizeLogin(opts.email) : "";
  const local = loadLocalPartner();
  const isLocal =
    opts.partnerId === LOCAL_PARTNER_ID ||
    opts.partnerId === local?.id ||
    Boolean(email && local?.email && normalizeLogin(local.email) === email);

  if (isLocal && local?.sequentialNumber != null && local.sequentialNumber >= PORTAL_ID_START) {
    return local.sequentialNumber;
  }

  if (email) {
    const fromApp = await findFilePartnerSequentialByEmail(email);
    if (fromApp != null && fromApp >= PORTAL_ID_START) {
      if (isLocal) {
        saveLocalPartner({ sequentialNumber: fromApp, email: email || undefined });
      }
      return fromApp;
    }
  }

  const allocated = await allocateFilePartnerSequentialNumber();
  if (isLocal) {
    saveLocalPartner({ sequentialNumber: allocated, email: email || undefined });
  }
  return allocated;
}

export async function formatEnsuredPartnerCode(opts: {
  partnerId: string;
  email?: string | null;
}): Promise<string> {
  const seq = await ensureFilePartnerSequentialNumber(opts);
  return formatPartnerCode(seq) ?? `PRT-${seq}`;
}
