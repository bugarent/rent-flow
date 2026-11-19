import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const dataFile = join(process.cwd(), "scripts", "_tmp-netlify-data.json");
writeFileSync(dataFile, JSON.stringify({ site_id: "987a8e55-1028-4fef-acfd-63934ca1589c" }));

const ps = `
$data = Get-Content -Raw '${dataFile.replace(/'/g, "''")}'
npx netlify api listSiteDeploys --data $data
`;

const result = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

try {
  unlinkSync(dataFile);
} catch {
  /* ignore */
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "netlify failed\n");
  process.exit(result.status || 1);
}

const deploys = JSON.parse(result.stdout);
for (const d of deploys.slice(0, 5)) {
  console.log(
    JSON.stringify({
      state: d.state,
      commit: (d.commit_ref || "").slice(0, 8),
      created: d.created_at,
      error: d.error_message || null,
    }),
  );
}
