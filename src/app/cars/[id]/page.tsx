import type { Metadata } from "next";
import { CarBookingClient } from "@/components/cars/car-booking-client";
import { JsonLd } from "@/components/seo/json-ld";
import { readPreferences } from "@/lib/server/preferences";
import { absoluteUrl } from "@/lib/seo/config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildProductVehicleJsonLd } from "@/lib/seo/json-ld";
import { carDetailSeo } from "@/lib/seo/pages";
import { toNumber } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

async function loadCarSeo(id: string) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const car = await prisma.car.findUnique({
      where: { id },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        title: true,
        description: true,
        dailyRateEur: true,
        status: true,
        photos: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });
    return car;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await readPreferences();
  const car = await loadCarSeo(id);
  if (!car || car.status !== "APPROVED") {
    return buildPageMetadata({
      title: "Car rental | RentAirportCars",
      description: "Book airport car rental in Georgia — Kutaisi, Tbilisi and Batumi.",
      path: `/cars/${encodeURIComponent(id)}`,
      locale,
      noIndex: true,
    });
  }

  const copy = carDetailSeo({
    make: car.make,
    model: car.model,
    year: car.year,
    airportLabel: "Kutaisi Airport",
    locale,
  });

  return buildPageMetadata({
    title: copy.title,
    description: copy.description,
    path: `/cars/${encodeURIComponent(id)}`,
    locale,
    image: car.photos[0]?.url || undefined,
    imageAlt: `${car.make} ${car.model} airport car rental`,
  });
}

export default async function CarBookingPage({ params }: Props) {
  const { id } = await params;
  const car = await loadCarSeo(id);
  const path = `/cars/${encodeURIComponent(id)}`;
  const url = absoluteUrl(path);

  const schemas =
    car && car.status === "APPROVED"
      ? [
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Cars", path: "/cars" },
            { name: `${car.make} ${car.model}`, path },
          ]),
          buildProductVehicleJsonLd({
            id: car.id,
            name: car.title || `${car.make} ${car.model}`,
            description:
              car.description?.trim() ||
              `${car.make} ${car.model} ${car.year} for airport car rental in Georgia.`,
            image: car.photos[0]?.url,
            priceEur: toNumber(car.dailyRateEur),
            brand: car.make,
            model: car.model,
            url,
          }),
        ]
      : [];

  return (
    <>
      {schemas.length ? <JsonLd data={schemas} /> : null}
      <CarBookingClient params={params} />
    </>
  );
}
