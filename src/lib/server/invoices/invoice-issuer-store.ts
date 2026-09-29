import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { SITE_DOMAIN } from "@/lib/brand";
import type { InvoiceIssuer } from "@/lib/invoices/types";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { getFooterContactConfig } from "@/lib/server/footer-contact-store";

async function issuerPath() {
  return resolveDataFile("invoices", "invoice-issuer.json");
}

type IssuerFile = Partial<InvoiceIssuer> & { updatedAt?: string };

function defaultsFromContact(contact: {
  phone: string;
  email: string;
  address: string;
}): InvoiceIssuer {
  return {
    legalName: "Rent Airport Cars",
    tradingName: SITE_DOMAIN,
    email: contact.email || "info@rentairportcars.com",
    phone: contact.phone || "",
    address: contact.address || "",
    taxId: "",
    bankName: "",
    iban: "",
    bic: "",
    logoUrl: "/brand/logo-mark.png?v=4",
    website: `https://${SITE_DOMAIN}`,
  };
}

function normalize(raw: IssuerFile | null | undefined, fallback: InvoiceIssuer): InvoiceIssuer {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    legalName: String(r.legalName || fallback.legalName).trim() || fallback.legalName,
    tradingName: String(r.tradingName || fallback.tradingName).trim() || fallback.tradingName,
    email: String(r.email || fallback.email).trim() || fallback.email,
    phone: String(r.phone || fallback.phone).trim(),
    address: String(r.address || fallback.address).trim(),
    taxId: String(r.taxId || "").trim(),
    bankName: String(r.bankName || "").trim(),
    iban: String(r.iban || "").trim(),
    bic: String(r.bic || "").trim(),
    logoUrl: String(r.logoUrl || fallback.logoUrl).trim() || fallback.logoUrl,
    website: String(r.website || fallback.website).trim() || fallback.website,
  };
}

export async function getInvoiceIssuer(): Promise<InvoiceIssuer> {
  const contact = await getFooterContactConfig();
  const fallback = defaultsFromContact(contact);
  const DATA_FILE = await issuerPath();
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as IssuerFile;
    return normalize(parsed, fallback);
  } catch {
    await ensureDataDir("invoices");
    await writeFile(
      DATA_FILE,
      JSON.stringify({ ...fallback, updatedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    return fallback;
  }
}

export async function saveInvoiceIssuer(
  patch: Partial<InvoiceIssuer>,
): Promise<InvoiceIssuer> {
  const current = await getInvoiceIssuer();
  const next = normalize({ ...current, ...patch }, current);
  const DATA_FILE = await issuerPath();
  await ensureDataDir("invoices");
  await writeFile(
    DATA_FILE,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
  return next;
}
