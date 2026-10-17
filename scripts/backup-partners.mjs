/**
 * Full snapshot of every partner's data (DB rows + JsonStore + referenced uploads).
 *
 * Output: .backups/partners-<timestamp>/
 *   neon-full.dump         pg_dump -Fc of the whole database (restore: pg_restore --clean --no-owner)
 *   partners/<id>.json     one readable file per partner with every related row
 *   jsonstore/<key>.json   every JsonStore document as saved
 *   files/<key>            HostedFile bytes referenced by partner data
 *   manifest.json          counts + anything that could not be saved
 *
 * Usage: node --env-file=.env scripts/backup-partners.mjs [--no-dump] [--no-files]
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import pg from "pg";

const NO_DUMP = process.argv.includes("--no-dump");
const NO_FILES = process.argv.includes("--no-files");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(process.cwd(), ".backups", `partners-${stamp}`);
const problems = [];

const pool = new pg.Pool({
  connectionString: databaseUrl.replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]$/, ""),
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

function safeName(key) {
  return key.replace(/[<>:"|?*\\]/g, "_");
}

function storeFileName(key) {
  return `${safeName(key).replace(/\.json$/i, "")}.json`;
}

const PARTNER_ID_RE = /^(?:file-partner-)?c[a-z0-9]{20,}$/;

/**
 * Partners that live only in JSON stores (file-backed accounts, never written to
 * the Partner table): top-level partner-id keys of partner-* documents plus the
 * owners of file cars.
 */
function fileOnlyPartnerIds(jsonStore, knownIds) {
  const found = new Set();
  for (const row of jsonStore) {
    const name = row.key.split("/").pop() || "";
    if (!/^partner-|^car-|^telegram-partner/i.test(name)) continue;
    const payload = row.payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      for (const key of Object.keys(payload)) if (PARTNER_ID_RE.test(key)) found.add(key);
    }
    if (name.startsWith("partner-cars")) {
      for (const car of payload?.cars ?? []) if (car?.partnerId) found.add(String(car.partnerId));
    }
  }
  const out = new Set();
  for (const id of found) {
    const bare = id.replace(/^file-partner-/, "");
    if (!knownIds.has(bare)) out.add(bare);
  }
  return [...out];
}

function partnerAliases(id) {
  const bare = String(id).replace(/^file-partner-/, "");
  return [...new Set([id, bare, `file-partner-${bare}`])];
}

/** Pull out the parts of a shared store document that belong to one partner. */
function sliceForPartner(value, ids, depth = 0) {
  if (value == null || depth > 6) return undefined;
  const text = JSON.stringify(value);
  if (!ids.some((id) => text.includes(id))) return undefined;
  if (Array.isArray(value)) {
    const hits = value.filter((item) => ids.some((id) => JSON.stringify(item).includes(id)));
    return hits.length ? hits : undefined;
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (ids.includes(key)) {
        out[key] = child;
        continue;
      }
      if (child && typeof child === "object") {
        const sub = sliceForPartner(child, ids, depth + 1);
        if (sub !== undefined) out[key] = sub;
      } else if (typeof child === "string" && ids.includes(child)) {
        return value;
      }
    }
    return Object.keys(out).length ? out : value;
  }
  return value;
}

function collectUploadKeys(value, keys) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  for (const match of text.matchAll(/\/uploads\/([A-Za-z0-9._\-/]+?\.(?:jpe?g|png|webp|gif|avif|pdf|svg))/gi)) {
    keys.add(match[1]);
  }
}

function runPgDump() {
  // pg_dump must be at least the server's major version (Neon is on 18).
  const exe = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";
  const candidates = [
    process.env.PG_DUMP_PATH || "",
    join(process.cwd(), ".tmp", "pgbin18", "pgsql", "bin", exe),
    join(process.cwd(), ".tmp", "pgbin", "pgsql", "bin", exe),
    "pg_dump",
  ].filter(Boolean);
  const bin = candidates.find((c) => c === "pg_dump" || existsSync(c));
  // pg_dump needs the direct host; the -pooler endpoint runs in transaction mode.
  const direct = databaseUrl.replace("-pooler.", ".");
  const dest = join(outDir, "neon-full.dump");
  const result = spawnSync(bin, ["--format=custom", "--no-owner", "--no-acl", `--file=${dest}`, `--dbname=${direct}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    problems.push({ step: "pg_dump", error: (result.stderr || result.error?.message || "failed").trim().slice(0, 2000) });
    return null;
  }
  return dest;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log("Backup folder:", outDir);

  const dumpPath = NO_DUMP ? null : runPgDump();
  console.log(dumpPath ? "Full database dump saved." : "Full database dump skipped/failed (see manifest).");

  const partners = await q(`SELECT * FROM "Partner" ORDER BY "sequentialNumber" NULLS LAST, "createdAt"`);
  const jsonStore = await q(`SELECT "key", "payload", "updatedAt" FROM "JsonStore" ORDER BY "key"`);
  for (const row of jsonStore) {
    await writeJson(join(outDir, "jsonstore", storeFileName(row.key)), row);
  }

  const uploadKeys = new Set();
  const summary = [];

  for (const partner of partners) {
    const ids = partnerAliases(partner.id);
    const user = partner.userId ? (await q(`SELECT * FROM "User" WHERE "id" = $1`, [partner.userId]))[0] ?? null : null;
    const locations = await q(`SELECT * FROM "PartnerAirport" WHERE "partnerId" = $1`, [partner.id]);
    const cars = await q(`SELECT * FROM "Car" WHERE "partnerId" = $1 ORDER BY "createdAt"`, [partner.id]);
    const carIds = cars.map((c) => c.id);

    const byCar = async (table, order = `"id"`) =>
      carIds.length ? q(`SELECT * FROM "${table}" WHERE "carId" = ANY($1) ORDER BY ${order}`, [carIds]) : [];
    const photos = await byCar("CarPhoto", `"carId", "sortOrder"`);
    const passports = await byCar("CarPassport");
    const extras = await byCar("CarExtra");
    const deliveryPrices = await byCar("CarDeliveryPrice");
    const bookings = await byCar("Booking", `"createdAt"`);
    const bookingIds = bookings.map((b) => b.id);
    const bookingExtras = bookingIds.length
      ? await q(`SELECT * FROM "BookingExtra" WHERE "bookingId" = ANY($1)`, [bookingIds])
      : [];
    const reviews = await q(`SELECT * FROM "Review" WHERE "partnerId" = $1`, [partner.id]);
    const integrations = await q(`SELECT * FROM "PartnerIntegration" WHERE "partnerId" = $1`, [partner.id]);
    const integrationIds = integrations.map((i) => i.id);
    const mappings = integrationIds.length
      ? await q(`SELECT * FROM "IntegrationMapping" WHERE "integrationId" = ANY($1)`, [integrationIds])
      : [];

    const stores = {};
    for (const row of jsonStore) {
      const slice = sliceForPartner(row.payload, [...ids, ...carIds]);
      if (slice !== undefined) stores[row.key] = slice;
    }

    const record = {
      backedUpAt: new Date().toISOString(),
      partner,
      user,
      locations,
      cars: cars.map((car) => ({
        ...car,
        photos: photos.filter((p) => p.carId === car.id),
        passport: passports.find((p) => p.carId === car.id) ?? null,
        extras: extras.filter((e) => e.carId === car.id),
        deliveryPrices: deliveryPrices.filter((d) => d.carId === car.id),
      })),
      bookings: bookings.map((b) => ({ ...b, extras: bookingExtras.filter((e) => e.bookingId === b.id) })),
      reviews,
      integrations: integrations.map((i) => ({ ...i, mappings: mappings.filter((m) => m.integrationId === i.id) })),
      jsonStores: stores,
    };
    collectUploadKeys(record, uploadKeys);
    await writeJson(join(outDir, "partners", `${safeName(partner.id)}.json`), record);

    summary.push({
      id: partner.id,
      number: partner.sequentialNumber,
      company: partner.companyName,
      email: partner.email,
      status: partner.status,
      cars: cars.length,
      photos: photos.length,
      deliveryPrices: deliveryPrices.length,
      extras: extras.length,
      bookings: bookings.length,
      jsonStoreKeys: Object.keys(stores),
    });
    console.log(`  ${partner.sequentialNumber ?? "-"} ${partner.companyName}: ${cars.length} cars, ${photos.length} photos`);
  }

  const fileOnly = fileOnlyPartnerIds(jsonStore, new Set(partners.map((p) => p.id)));
  const fileCarsDoc = jsonStore.find((row) => /(^|\/)partner-cars\.json$/i.test(row.key));
  for (const id of fileOnly) {
    const ids = partnerAliases(id);
    const cars = (fileCarsDoc?.payload?.cars ?? []).filter((car) => ids.includes(String(car?.partnerId || "")));
    const stores = {};
    for (const row of jsonStore) {
      const slice = sliceForPartner(row.payload, [...ids, ...cars.map((c) => c.id)]);
      if (slice !== undefined) stores[row.key] = slice;
    }
    const pick = (doc) => stores[jsonStore.find((r) => r.key.endsWith(doc))?.key ?? ""];
    const settings = pick("partner-company-settings.json")?.[id] ?? pick("partner-company-settings.json")?.[`file-partner-${id}`];
    const credentials = pick("partner-credentials.json")?.[id];
    const record = { backedUpAt: new Date().toISOString(), fileOnlyPartner: true, partnerId: id, cars, jsonStores: stores };
    collectUploadKeys(record, uploadKeys);
    await writeJson(join(outDir, "partners", "_file-only", `${safeName(id)}.json`), record);
    summary.push({
      id,
      number: null,
      company: settings?.title || settings?.legalName || "",
      email: settings?.email || credentials?.email || "",
      status: "FILE_ONLY",
      cars: cars.length,
      photos: cars.reduce((n, c) => n + (c.photos?.length || 0), 0),
      deliveryPrices: cars.reduce((n, c) => n + (c.deliveryPrices?.length || 0), 0),
      extras: cars.reduce((n, c) => n + (c.extras?.length || 0), 0),
      bookings: 0,
      jsonStoreKeys: Object.keys(stores),
    });
    console.log(`  (file-only) ${settings?.title || id}: ${cars.length} cars`);
  }

  for (const row of jsonStore) {
    if (/partner|car|deliver|company|insurance|passport/i.test(row.key)) collectUploadKeys(row.payload, uploadKeys);
  }

  let filesSaved = 0;
  const filesMissing = [];
  if (!NO_FILES && uploadKeys.size) {
    for (const key of uploadKeys) {
      const rows = await q(`SELECT "bytes" FROM "HostedFile" WHERE "key" = $1 LIMIT 1`, [key]);
      if (!rows[0]) {
        filesMissing.push(key);
        continue;
      }
      const dest = join(outDir, "files", ...key.split("/").filter(Boolean));
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, rows[0].bytes);
      filesSaved += 1;
    }
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    database: databaseUrl.replace(/:[^@/]+@/, ":***@").replace(/\?.*$/, ""),
    fullDump: dumpPath ? "neon-full.dump" : null,
    partners: partners.length,
    fileOnlyPartners: fileOnly.length,
    cars: summary.reduce((n, s) => n + s.cars, 0),
    photos: summary.reduce((n, s) => n + s.photos, 0),
    deliveryPrices: summary.reduce((n, s) => n + s.deliveryPrices, 0),
    jsonStoreDocuments: jsonStore.length,
    uploadFilesReferenced: uploadKeys.size,
    uploadFilesSaved: filesSaved,
    uploadFilesNotInHostedFile: filesMissing,
    problems,
    perPartner: summary,
  };
  await writeJson(join(outDir, "manifest.json"), manifest);
  await writeFile(
    join(outDir, "RESTORE.txt"),
    [
      "Full restore (whole database, overwrites current rows):",
      '  pg_restore --clean --if-exists --no-owner --no-acl --dbname="<DIRECT_DATABASE_URL>" neon-full.dump',
      "",
      "Single partner: open partners/<id>.json — it holds every row for that partner",
      "(Partner, User, cars, photos, passport, extras, delivery prices, bookings, reviews,",
      "integrations) plus the partner's slices of each JsonStore document.",
      "Partners that exist only in JSON stores are in partners/_file-only/<id>.json.",
      "Original JsonStore documents are in jsonstore/, uploaded images in files/.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(
    `Done: ${partners.length} partners (+${fileOnly.length} file-only), ${manifest.cars} cars, ${manifest.photos} photos, ` +
      `${jsonStore.length} JsonStore docs, ${filesSaved}/${uploadKeys.size} files.`,
  );
  if (problems.length) console.log("Problems:", JSON.stringify(problems, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
