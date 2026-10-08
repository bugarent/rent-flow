import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requirePartner } from "@/lib/auth/guards";
import { PARTNER_BASE } from "@/lib/routes";
import { readPartnerLocale } from "@/lib/server/partner-preferences";
import { getPartnerDictionary } from "@/lib/i18n/partner-dictionaries";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { readCarRejectionNotices } from "@/lib/server/car-rejection-store";
import { PartnerFleetCarCard } from "@/components/partner/partner-fleet-car-card";

export default async function PartnerCarsPage() {
  const session = await requirePartner();
  const locale = await readPartnerLocale();
  const t = getPartnerDictionary(locale).fleetPage;

  let cars: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    title: string;
    dailyRateEur: number;
    status: string;
    hiddenReason?: string | null;
  }> = [];

  try {
    const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
    cars = partner
      ? (
          await prisma.car.findMany({
            where: { partnerId: partner.id },
            include: { photos: { take: 1 } },
          })
        ).map((c) => ({
          id: c.id,
          make: c.make,
          model: c.model,
          year: c.year,
          title: c.title,
          dailyRateEur: toNumber(c.dailyRateEur),
          status: c.status,
          hiddenReason: c.hiddenReason,
        }))
      : [];
  } catch {
    cars = [];
  }

  const fileCars = await listFileCarsForPartner({
    userId: session.user.id,
    email: session.user.email,
  });
  const seen = new Set(cars.map((c) => c.id));
  for (const fileCar of fileCars) {
    if (seen.has(fileCar.id)) continue;
    cars.push({
      id: fileCar.id,
      make: fileCar.make,
      model: fileCar.model,
      year: fileCar.year,
      title: fileCar.title,
      dailyRateEur: fileCar.dailyRateEur,
      status: fileCar.status,
      hiddenReason: fileCar.hiddenReason ?? null,
    });
  }

  const notices = await readCarRejectionNotices(cars.map((c) => c.id));

  const copy =
    locale === "ka"
      ? { rejectionTitle: "ადმინის კომენტარი (უარყოფა)", ack: "გავეცანი" }
      : locale === "ru"
        ? { rejectionTitle: "Комментарий админа (отклонение)", ack: "Ознакомлен" }
        : { rejectionTitle: "Admin comment (rejection)", ack: "Got it" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-sm">{t.title}</h1>
        <div className="flex gap-3">
          <Link
            href={`${PARTNER_BASE}/bookings`}
            className="rounded-lg border border-white/40 bg-white/90 px-4 py-2.5 font-semibold backdrop-blur-sm"
          >
            {t.bookings}
          </Link>
          <Link
            href={`${PARTNER_BASE}/cars/new`}
            className="rounded-lg bg-sky-600 px-6 py-2.5 font-bold text-white hover:bg-sky-500"
          >
            {t.addCar}
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cars.map((car) => {
          const notice = notices.get(car.id);
          return (
            <PartnerFleetCarCard
              key={car.id}
              car={{
                ...car,
                hiddenReason: notice?.note || car.hiddenReason,
                rejectionUnread: Boolean(notice?.unread),
              }}
              perDay={t.perDay}
              editLabel={t.edit}
              ackLabel={copy.ack}
              rejectionTitle={copy.rejectionTitle}
              locale={locale}
            />
          );
        })}
      </div>
      {cars.length === 0 ? (
        <div className="rounded-xl border border-white/50 bg-white/95 py-12 text-center shadow-[0_12px_40px_rgba(11,31,75,0.14)] backdrop-blur-sm">
          <p className="mb-4 text-slate-500">{t.empty}</p>
          <Link href={`${PARTNER_BASE}/cars/new`} className="font-semibold text-sky-700 hover:underline">
            {t.addFirst}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
