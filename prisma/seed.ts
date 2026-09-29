import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG_AIRPORTS } from "../src/lib/catalog/airports";
import { hashSecret } from "../src/lib/crypto";
import { DEFAULT_GOOGLE_MAPS_URL, SITE_NAME } from "../src/lib/brand";

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

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  await prisma.platformSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      depositPercent: 15,
      telegramBotSiteName: SITE_NAME,
      googleMapsUrl: DEFAULT_GOOGLE_MAPS_URL,
    },
    update: {},
  });

  await prisma.extraService.upsert({
    where: { slug: "tpl" },
    create: {
      slug: "tpl",
      isTpl: true,
      defaultPriceEur: 0,
      minPriceEur: 0,
      maxPriceEur: 0,
      sortOrder: 0,
      name: { en: "TPL — Third Party Liability" },
      description: { en: "Included free by default on every rental." },
    },
    update: { isTpl: true, defaultPriceEur: 0, minPriceEur: 0, maxPriceEur: 0 },
  });

  const defaultExtras = [
    {
      slug: "baby-seat",
      name: { en: "Baby Seat" },
      description: { en: "Child safety seat, daily rate." },
      minPriceEur: 5,
      maxPriceEur: 15,
      defaultPriceEur: 8,
      sortOrder: 10,
    },
    {
      slug: "gps",
      name: { en: "GPS Navigation" },
      description: { en: "Portable GPS unit, daily rate." },
      minPriceEur: 3,
      maxPriceEur: 12,
      defaultPriceEur: 6,
      sortOrder: 20,
    },
    {
      slug: "additional-driver",
      name: { en: "Additional Driver" },
      description: { en: "Extra authorized driver, daily rate." },
      minPriceEur: 5,
      maxPriceEur: 20,
      defaultPriceEur: 10,
      sortOrder: 30,
    },
  ] as const;

  for (const extra of defaultExtras) {
    await prisma.extraService.upsert({
      where: { slug: extra.slug },
      create: {
        slug: extra.slug,
        name: extra.name,
        description: extra.description,
        minPriceEur: extra.minPriceEur,
        maxPriceEur: extra.maxPriceEur,
        defaultPriceEur: extra.defaultPriceEur,
        sortOrder: extra.sortOrder,
        isActive: true,
      },
      update: {
        name: extra.name,
        description: extra.description,
        minPriceEur: extra.minPriceEur,
        maxPriceEur: extra.maxPriceEur,
        defaultPriceEur: extra.defaultPriceEur,
        sortOrder: extra.sortOrder,
        isActive: true,
      },
    });
  }

  for (const airport of CATALOG_AIRPORTS) {
    const country = await prisma.country.upsert({
      where: { iso2: airport.countryIso2 },
      create: { iso2: airport.countryIso2, name: airport.countryName, sortOrder: airport.isHub ? 0 : 50 },
      update: { name: airport.countryName },
    });
    const city = await prisma.city.upsert({
      where: { countryId_slug: { countryId: country.id, slug: airport.citySlug } },
      create: { countryId: country.id, slug: airport.citySlug, name: airport.cityName },
      update: { name: airport.cityName },
    });
    await prisma.airport.upsert({
      where: { iata: airport.iata },
      create: {
        iata: airport.iata,
        icao: airport.icao,
        cityId: city.id,
        name: airport.name,
        latitude: airport.latitude,
        longitude: airport.longitude,
        timezone: airport.timezone,
        isHub: airport.isHub,
        isActive: true,
        sortOrder: airport.isHub ? 0 : 50,
      },
      update: {
        name: airport.name,
        isHub: airport.isHub,
        isActive: true,
      },
    });
  }

  const previousLogins = ["aaaaaaaaaa", "admin@rentairportcars.com", "aaaaa@gmail.com"];
  const adminLogin = "bugarent22@gmail.com";
  const adminPassword = "lilelizi2020";
  const adminHash = hashSecret(adminPassword);

  const existing =
    (await prisma.user.findUnique({ where: { email: adminLogin } })) ??
    (await prisma.user.findFirst({ where: { email: { in: previousLogins } } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" } }));

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: adminLogin,
        passwordHash: adminHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        firstName: "Platform",
        lastName: "Admin",
        email: adminLogin,
        phone: "+995555000000",
        countryOfResidence: "GE",
        preferredMessenger: "TELEGRAM",
        passwordHash: adminHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  }

  const partnerLogin = "zzzzz@gmail.com";
  const partnerPassword = "55555";
  const partnerHash = hashSecret(partnerPassword);
  const existingPartnerUser = await prisma.user.findUnique({ where: { email: partnerLogin } });

  const partnerUser = existingPartnerUser
    ? await prisma.user.update({
        where: { id: existingPartnerUser.id },
        data: {
          passwordHash: partnerHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          firstName: "Test",
          lastName: "Partner",
          email: partnerLogin,
          phone: "+995555000001",
          countryOfResidence: "GE",
          preferredMessenger: "WHATSAPP",
          passwordHash: partnerHash,
          role: "VENDOR",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });

  const partnerProfile = await prisma.partner.findUnique({ where: { userId: partnerUser.id } });
  if (!partnerProfile) {
    await prisma.partner.create({
        data: {
          userId: partnerUser.id,
          companyName: "Test Fleet Partner",
          contactName: "Test Partner",
          email: partnerLogin,
          phone: "+995555000001",
          messenger: "WHATSAPP",
          fleetSize: 5,
          kind: "COMPANY",
          personalId: "00000000000",
          sequentialNumber: 1000,
          status: "APPROVED",
          approvedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
    });
  } else if (partnerProfile.status !== "APPROVED" || (partnerProfile.sequentialNumber ?? 0) < 1000) {
    await prisma.partner.update({
      where: { id: partnerProfile.id },
      data: {
        status: "APPROVED",
        approvedAt: partnerProfile.approvedAt ?? new Date(),
        sequentialNumber: partnerProfile.sequentialNumber && partnerProfile.sequentialNumber >= 1000
          ? partnerProfile.sequentialNumber
          : 1000,
      },
    });
  }

  const partnerMax = await prisma.partner.aggregate({ _max: { sequentialNumber: true } });
  const lastPartner = Math.max(partnerMax._max.sequentialNumber ?? 999, 999);
  await prisma.idSequence.upsert({
    where: { key: "partner" },
    create: { key: "partner", value: lastPartner },
    update: { value: lastPartner },
  });
  const customerMax = await prisma.user.aggregate({
    where: { role: "CUSTOMER" },
    _max: { customerNumber: true },
  });
  const lastCustomer = Math.max(customerMax._max.customerNumber ?? 999, 999);
  await prisma.idSequence.upsert({
    where: { key: "customer" },
    create: { key: "customer", value: lastCustomer },
    update: { value: lastCustomer },
  });

  return prisma;
}

main()
  .then(async (prisma) => {
    if (prisma && typeof prisma.$disconnect === "function") await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
