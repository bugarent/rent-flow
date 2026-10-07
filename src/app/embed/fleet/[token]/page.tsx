import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerIdByWebsiteToken } from "@/lib/server/partner-integration-store";
import { isPublicFileCar, listFileCarsForPartner } from "@/lib/server/partner-cars-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function EmbedFleetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const partnerId = await getPartnerIdByWebsiteToken(token);
  if (!partnerId) notFound();
  const cars = (await listFileCarsForPartner({ partnerId })).filter((car) =>
    isPublicFileCar(car),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-[#0b1f4b]">RentAirportCars</h1>
      {cars.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No published cars yet.</p>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {cars.map((car) => {
          const label = `${car.make} ${car.model}`.trim() || car.title;
          const photo = car.photos?.[0] || "";
          return (
            <li key={car.id}>
              <Link
                href={`/cars/${car.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-sky-300"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-16 w-24 rounded-lg object-cover bg-slate-100" />
                ) : null}
                <span>
                  <span className="block font-bold text-[#0b1f4b]">{label}</span>
                  {car.registrationNumber ? (
                    <span className="mt-0.5 block text-sm text-slate-500">{car.registrationNumber}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
