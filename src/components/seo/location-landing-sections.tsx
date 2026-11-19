import Link from "next/link";
import { SiteImage } from "@/components/ui/site-image";
import type { LocationFaq } from "@/lib/seo/location-page-sections";
import { locationRouteLines, locationSectionCopy } from "@/lib/seo/location-page-sections";

const PAGE_BOTTOM = "pb-32 md:pb-14";

export function locationPageBottomClass(): string {
  return PAGE_BOTTOM;
}

export function LocationBenefits({ locale }: { locale: string }) {
  const copy = locationSectionCopy(locale);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.benefitsTitle}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
        {copy.benefits.map((item) => (
          <li key={item.strong} className="break-words">
            <strong className="font-semibold text-slate-900">{item.strong}</strong> {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LocationDriveNotes({
  locale,
  kind,
  routeCode,
  cityName,
}: {
  locale: string;
  kind: "airport" | "city";
  routeCode?: string;
  cityName?: string;
}) {
  const copy = locationSectionCopy(locale);
  const notes = kind === "airport" ? copy.airportNotes : copy.cityNotes;
  const routes = routeCode ? locationRouteLines(routeCode, locale, cityName) : [];
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.notesTitle}</h2>
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
        {notes.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>
      {routes.length ? (
        <div className="mt-5">
          <h2 className="text-base font-bold text-[#0b1f4b]">{copy.routesTitle}</h2>
          <ul className="mt-3 space-y-3">
            {routes.map((route) => (
              <li key={route.title} className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{route.title}</h3>
                <p className="text-sm leading-6 text-slate-600">{route.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function LocationCarPreview({
  locale,
  cars,
}: {
  locale: string;
  cars: Array<{ id: string; name: string; priceEur: number; image?: string | null; path: string }>;
}) {
  if (!cars.length) return null;
  const copy = locationSectionCopy(locale);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.carsTitle}</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cars.slice(0, 4).map((car) => (
          <li key={car.id} className="min-w-0">
            <Link
              href={car.path}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-2 hover:bg-sky-50"
            >
              {car.image ? (
                <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <SiteImage src={car.image} alt="" fill sizes="80px" className="object-cover" />
                </span>
              ) : null}
              <span className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-[#0b1f4b]">{car.name}</h3>
                {car.priceEur > 0 ? (
                  <span className="text-sm text-slate-600">
                    €{Math.round(car.priceEur)} {copy.perDay}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LocationFaqSection({
  locale,
  kind,
}: {
  locale: string;
  kind: "airport" | "city";
}) {
  const copy = locationSectionCopy(locale);
  const faqs = kind === "airport" ? copy.airportFaqs : copy.cityFaqs;
  return (
    <section className="mt-10 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-bold text-[#0b1f4b]">{copy.faqTitle}</h2>
      <div className="mt-3 space-y-2">
        {faqs.map((faq) => (
          <details key={faq.question} className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 pe-14 text-sm font-semibold text-[#0b1f4b] marker:content-none sm:pe-4 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-semibold leading-snug sm:text-base">{faq.question}</h3>
            </summary>
            <p className="px-4 pb-4 text-sm leading-6 text-slate-700">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function faqsForSchema(locale: string, kind: "airport" | "city"): LocationFaq[] {
  const copy = locationSectionCopy(locale);
  return kind === "airport" ? copy.airportFaqs : copy.cityFaqs;
}
