export const DIRECTORY_PARTNER_TABS = ["COMPANY", "PRIVATE", "REJECTED", "CUSTOMERS"] as const;

export type DirectoryPartnerTab = (typeof DIRECTORY_PARTNER_TABS)[number];

const ALLOWED = new Set<string>(DIRECTORY_PARTNER_TABS);

/** One or more directory pills. Empty or unknown values fall back to company partners. */
export function parseDirectoryPartnerTabs(raw: string | null | undefined): DirectoryPartnerTab[] {
  const parts = String(raw || "")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter((part) => ALLOWED.has(part));
  const unique = [...new Set(parts)] as DirectoryPartnerTab[];
  return unique.length ? unique : ["COMPANY"];
}

/** Back-link query. Unknown values are dropped and do not invent a default tab. */
export function directoryPartnerTabQuery(raw: string | null | undefined): string | null {
  const parts = String(raw || "")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter((part) => ALLOWED.has(part));
  const unique = [...new Set(parts)];
  return unique.length ? unique.map((part) => part.toLowerCase()).join(",") : null;
}
