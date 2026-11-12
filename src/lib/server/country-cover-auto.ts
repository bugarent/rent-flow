import "server-only";

import {
  BUILT_IN_COUNTRY_COVERS,
  normalizeCoverIso,
  type CountryCoverCredit,
} from "@/lib/catalog/country-covers";
import { buildCountryCoverFromBytes } from "@/lib/server/country-cover-images";
import {
  getCountryCoverAutoAttempts,
  getUploadedCountryCovers,
  markCountryCoverAutoAttempt,
  saveCountryCover,
} from "@/lib/server/country-covers-store";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

const USER_AGENT = "RentAirportCarsBot/1.0 (https://rentairportcars.com; info@rentairportcars.com)";
const RETRY_FAILED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
/** Keeps one background run inside the function time limit. */
const MAX_COUNTRIES_PER_RUN = 1;
const inFlight = new Set<string>();

type Candidate = { file: string; label: string };
type CommonsImage = { url: string; credit: CountryCoverCredit };

async function fetchJson<T>(url: string, accept = "application/json"): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 80)}`);
  return (await res.json()) as T;
}

async function sparql(query: string): Promise<Candidate[]> {
  type Row = { img: { value: string }; siteLabel?: { value: string } };
  const json = await fetchJson<{ results: { bindings: Row[] } }>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    "application/sparql-results+json",
  );
  return json.results.bindings.map((row) => ({
    file: decodeURIComponent(row.img.value.split("/").pop() || ""),
    label: row.siteLabel?.value || "",
  }));
}

/** Best-known landmarks first: World Heritage sites, then tourist attractions, then the capital. */
async function landmarkCandidates(iso: string): Promise<Candidate[]> {
  const label = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }';
  const queries = [
    `SELECT ?siteLabel ?img WHERE { ?c wdt:P297 "${iso}". ?site wdt:P17 ?c; wdt:P1435 wd:Q9259; wdt:P18 ?img; wikibase:sitelinks ?n. ${label} } ORDER BY DESC(?n) LIMIT 8`,
    `SELECT ?siteLabel ?img WHERE { ?c wdt:P297 "${iso}". ?site wdt:P17 ?c; wdt:P31/wdt:P279? wd:Q570116; wdt:P18 ?img; wikibase:sitelinks ?n. FILTER(?n >= 5) ${label} } ORDER BY DESC(?n) LIMIT 8`,
    `SELECT ?siteLabel ?img WHERE { ?c wdt:P297 "${iso}"; wdt:P36 ?site. ?site wdt:P18 ?img. ${label} } LIMIT 3`,
  ];
  const out: Candidate[] = [];
  for (const query of queries) {
    try {
      for (const row of await sparql(query)) {
        if (row.file && !out.some((c) => c.file === row.file)) out.push(row);
      }
    } catch (error) {
      console.warn("[country-cover-auto] wikidata", iso, error);
    }
    if (out.length >= 6) break;
  }
  return out;
}

function plainText(html: string | undefined): string {
  return String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Landscape JPEG photos with a stated license only (maps, logos and portrait shots are skipped). */
async function commonsImage(file: string): Promise<CommonsImage | null> {
  type Info = {
    thumburl?: string;
    width: number;
    height: number;
    mime: string;
    descriptionurl: string;
    extmetadata?: Record<string, { value?: string }>;
  };
  const json = await fetchJson<{ query?: { pages?: Record<string, { imageinfo?: Info[] }> } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1920&titles=${encodeURIComponent(`File:${file}`)}`,
  );
  const info = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.thumburl || info.mime !== "image/jpeg") return null;
  if (info.width < 1200 || info.width / info.height < 1.25) return null;
  const meta = info.extmetadata ?? {};
  const license = plainText(meta.LicenseShortName?.value);
  if (!license) return null;
  return {
    url: info.thumburl,
    credit: {
      author: plainText(meta.Artist?.value).slice(0, 120) || "Wikimedia Commons",
      license,
      url: info.descriptionurl,
    },
  };
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Finds, converts and saves one country's landmark photo. Returns true when a cover was saved. */
export async function findCountryCover(iso: string, skipSourceUrl = ""): Promise<boolean> {
  const code = normalizeCoverIso(iso);
  if (!code) return false;
  for (const candidate of await landmarkCandidates(code)) {
    try {
      const image = await commonsImage(candidate.file);
      if (!image || image.credit.url === skipSourceUrl) continue;
      const cover = await buildCountryCoverFromBytes(await download(image.url), code, 0.5);
      await saveCountryCover(code, { ...cover, source: "auto", credit: image.credit });
      return true;
    } catch (error) {
      console.warn("[country-cover-auto] candidate", code, candidate.file, error);
    }
  }
  return false;
}

function due(attempt: string | undefined): boolean {
  if (!attempt) return true;
  if (attempt.startsWith("ok:")) return false;
  const at = Date.parse(attempt.replace(/^none:/, ""));
  return !Number.isFinite(at) || Date.now() - at > RETRY_FAILED_AFTER_MS;
}

/**
 * Background step: countries in the search without a built-in, uploaded or earlier automatic
 * cover get one from Wikimedia Commons. Each country is searched once and the result remembered.
 */
export async function ensureCountryCovers(isoCodes: string[]): Promise<void> {
  const wanted = [...new Set(isoCodes.map(normalizeCoverIso).filter(Boolean))].filter(
    (iso) => !BUILT_IN_COUNTRY_COVERS[iso] && !inFlight.has(iso),
  );
  if (!wanted.length) return;
  const [covers, attempts] = await Promise.all([getUploadedCountryCovers(), getCountryCoverAutoAttempts()]);
  const todo = wanted.filter((iso) => !covers[iso] && due(attempts[iso])).slice(0, MAX_COUNTRIES_PER_RUN);
  if (!todo.length) return;
  let saved = false;
  for (const iso of todo) {
    inFlight.add(iso);
    try {
      const found = await findCountryCover(iso);
      await markCountryCoverAutoAttempt(iso, found);
      saved ||= found;
    } catch (error) {
      console.warn("[country-cover-auto]", iso, error);
    } finally {
      inFlight.delete(iso);
    }
  }
  if (saved) revalidatePublishedContent();
}
