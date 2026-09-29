import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";

const EMAIL = "bugarent22@gmail.com";
const PASSWORD = "lilelizi2020";
const BCRYPT_ROUNDS = 12;

function loadEnv() {
  const envFile = resolve(process.cwd(), ".env");
  if (!existsSync(envFile)) return;
  for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add it to .env and run the script again.");
  process.exit(1);
}

function withSslNoVerify(connectionString) {
  const withoutSslMode = connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/&&+/g, "&");
  const joiner = withoutSslMode.includes("?") ? "&" : "?";
  return `${withoutSslMode}${joiner}sslmode=no-verify`;
}

const pool = new Pool({
  connectionString: withSslNoVerify(databaseUrl),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const adminData = {
  firstName: "Platform",
  lastName: "Admin",
  email: EMAIL,
  phone: "+995555000000",
  countryOfResidence: "GE",
  preferredMessenger: "TELEGRAM",
  messengers: ["TELEGRAM"],
  passwordHash: hashSync(PASSWORD, BCRYPT_ROUNDS),
  role: "ADMIN",
  status: "ACTIVE",
  emailVerifiedAt: new Date(),
};

try {
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash: adminData.passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    create: adminData,
  });

  console.log(`Admin saved: ${user.email} (${user.role}, id ${user.id})`);
} catch (error) {
  console.error("Failed to create admin:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
