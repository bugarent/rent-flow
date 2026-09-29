import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth/guards";
import { formatCustomerId } from "@/lib/ids";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { BookingSuccessBanner } from "@/components/account/booking-success-banner";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  return buildPageMetadata({
    title: "Account | RentAirportCars",
    description: "Manage your RentAirportCars bookings and profile.",
    path: "/account",
    locale,
    noIndex: true,
  });
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string; ref?: string }>;
}) {
  const session = await requireCustomer();
  const params = await searchParams;
  const booked = params.booked === "1" || params.booked === "true";
  const refParam = typeof params.ref === "string" ? params.ref.trim() : "";

  let customerNumber: number | null = null;
  let country = "";
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { customerNumber: true, countryOfResidence: true, firstName: true, lastName: true },
    });
    customerNumber = user?.customerNumber ?? null;
    country = user?.countryOfResidence ? worldCountryName(user.countryOfResidence) : "";
  } catch {
    /* local / offline */
  }

  const displayId = formatCustomerId(customerNumber);
  const bookingRef = refParam || null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {booked ? <BookingSuccessBanner bookingRef={bookingRef} /> : null}

      <h1 className="text-3xl font-extrabold text-slate-900">{session.user.name}</h1>
      <p className="mt-2 text-slate-600">{session.user.email}</p>
      {displayId ? (
        <p className="mt-3 text-sm font-semibold text-slate-800">
          Customer ID: <span className="font-mono">{displayId}</span>
        </p>
      ) : null}
      {country ? <p className="mt-1 text-sm text-slate-500">{country}</p> : null}
    </div>
  );
}
