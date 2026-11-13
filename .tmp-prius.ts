import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCarDetails } from "./src/lib/cars/car-details";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const car = await prisma.car.findUnique({
    where: { id: "cmuyiv23s000009leypuijns3" },
    select: { make: true, model: true, dailyRateEur: true, discountPercent: true, description: true },
  });
  const details = parseCarDetails(car?.description);
  console.log(car?.make, car?.model, "daily", String(car?.dailyRateEur), "base discount", String(car?.discountPercent));
  console.log("tiers", JSON.stringify(details?.pricingTiers));
  await prisma.$disconnect();
}

void main();
