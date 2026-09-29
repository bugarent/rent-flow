import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashSecret } from "../src/lib/crypto";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const ADMIN_EMAIL = "aaaaa@gmail.com";
const ADMIN_PASSWORD = "55555";
const LEGACY_EMAILS = ["aaaaaaaaaa", "admin@rentairportcars.com", "aaaaa@gmail.com"];

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const passwordHash = hashSecret(ADMIN_PASSWORD);

  const existing =
    (await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })) ??
    (await prisma.user.findFirst({ where: { email: { in: LEGACY_EMAILS } } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" } }));

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Updated admin ${existing.id} -> ${ADMIN_EMAIL}`);
  } else {
    const created = await prisma.user.create({
      data: {
        firstName: "Platform",
        lastName: "Admin",
        email: ADMIN_EMAIL,
        phone: "+995555000000",
        countryOfResidence: "GE",
        preferredMessenger: "TELEGRAM",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Created admin ${created.id} -> ${ADMIN_EMAIL}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
