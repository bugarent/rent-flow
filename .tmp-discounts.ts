import "dotenv/config";

async function main() {
  const { readFile } = await import("./src/lib/server/durable-fs");
  const { dataRoot } = await import("./src/lib/persistent-paths");
  const { join } = await import("node:path");
  const raw = await readFile(join(dataRoot(), "partner-period-discounts.json"), "utf8").catch(() => "");
  const parsed = raw ? JSON.parse(raw) : { items: [] };
  for (const item of parsed.items || []) {
    console.log(JSON.stringify({ partnerId: item.partnerId, title: item.title, kind: item.kind, percent: item.percent, from: item.from, to: item.to, cars: item.carIds?.length, updatedAt: item.updatedAt }));
  }
  process.exit(0);
}

void main();
