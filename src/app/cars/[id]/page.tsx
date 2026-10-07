import type { Metadata } from "next";
import { cache } from "react";
import { CarBookingClient } from "@/components/cars/car-booking-client";
import { JsonLd } from "@/components/seo/json-ld";
import { readPreferences } from "@/lib/server/preferences";
import { absoluteUrl } from "@/lib/seo/config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildProductVehicleJsonLd } from "@/lib/seo/json-ld";
import { carDetailSeo } from "@/lib/seo/pages";
import { toNumber } from "@/lib/utils";
import { isPubliclyVisibleListing } from "@/lib/cars/listing-visibility";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadCarSeo = cache(async (id: string) => {
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
        hiddenReason: true,
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
});

function firstParam(value: string | string[] | undefined) {
  return String(Array.isArray(value) ? value[0] : value || "").slice(0, 10);
}

async function loadInitialCar(id: string, startDate: string, endDate: string) {
  try {
    const { loadPublicCarPayload } = await import("@/lib/server/public-car-payload");
    return await loadPublicCarPayload(id, { rangeFrom: startDate, rangeTo: endDate || startDate });
  } catch (error) {
    console.warn("[cars/[id]] initial car", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await readPreferences();
  const car = await loadCarSeo(id);
  if (!car || !isPubliclyVisibleListing(car)) {
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

export default async function CarBookingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const startDate = firstParam(query.startDate);
  const endDate = firstParam(query.endDate) || startDate;
  const [car, initialCar] = await Promise.all([
    loadCarSeo(id),
    loadInitialCar(id, startDate, endDate),
  ]);
  const path = `/cars/${encodeURIComponent(id)}`;
  const url = absoluteUrl(path);

  const schemas =
    car && isPubliclyVisibleListing(car)
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
      <CarBookingClient
        params={params}
        initialCar={initialCar ? JSON.parse(JSON.stringify(initialCar)) : null}
        initialRange={`${startDate}|${endDate}`}
      />
    </>
  );
}
