"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import {
  insuranceExpiryReasonLabel,
  isInsuranceDateExpired,
  isInsuranceExpiryReason,
} from "@/lib/cars/insurance-expiry-reason";
import { ListingModerationActions } from "@/components/admin/listing-moderation-actions";
import { ModerationProfilesPanel } from "@/components/admin/moderation-profiles-panel";
import { PartnersManager } from "@/components/admin/partners-manager";
import { cn } from "@/lib/utils";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

export type ModerationCarView = {
  id: string;
  status: string;
  make: string;
  model: string;
  year: number;
  hiddenReason: string | null;
  partnerName: string;
  photos: Array<{ id: string; url: string }>;
  passportFrontUrl: string | null;
  passportBackUrl: string | null;
  insuranceUrl: string | null;
  insuranceExpiresAt: string | null;
  country: string;
  bodyType: string;
};

export type ModerationReviewView = {
  id: string;
  vehicleQuality: number;
  hostCommunication: number;
  deliveryServiceQuality: number;
  averageRating: number;
  comment: string;
  status: string;
  partnerName: string;
  authorName: string;
  carLabel: string;
};

export type ModerationProfileView = {
  id: string;
  companyName: string;
  status: string;
  partnerCode: string | null;
  email: string;
  phone: string;
  unreadCount: number;
  summary: string;
  changedAt: string | null;
  changes: Array<{ field: string; from: string; to: string }>;
};

export type ModerationPartnerRow = {
  id: string;
  displayName: string;
  kind: "COMPANY" | "PRIVATE";
  status: string;
  statusLabel: string;
  sequentialNumber: number | null;
  partnerCode: string | null;
  personalId: string;
  fleetSize: number;
  carCount: number;
  email: string;
  phone: string;
  country?: string;
  hasUser: boolean;
  unreadReapplyCount: number;
  unreadForAdmin: number;
  updatedAt: string;
  source?: "db" | "file";
};

type Labels = {
  title: string;
  body: string;
  primaryTab: string;
  primaryTitle: string;
  primaryBody: string;
  listingsTab: string;
  reviewsTab: string;
  profilesTab: string;
  listingsTitle: string;
  listingsBody: string;
  reviewsTitle: string;
  reviewsBody: string;
  profilesTitle: string;
  profilesBody: string;
  noListings: string;
  noReviews: string;
  noProfiles: string;
  openPartner: string;
  rejectProfile: string;
  dbOfflineHint: string;
};

type Props = {
  partners: ModerationPartnerRow[];
  partnersError: string;
  partnersDbOffline: boolean;
  cars: ModerationCarView[];
  reviews: ModerationReviewView[];
  reviewsBadgeCount?: number;
  profiles: ModerationProfileView[];
  listingsError: string;
  reviewsError: string;
  profilesError: string;
  listingsDbOffline: boolean;
  reviewsDbOffline: boolean;
  profilesDbOffline: boolean;
};

type TabId = "primary" | "listings" | "reviews" | "profiles";

const PRIMARY_STATUSES = new Set(["PENDING", "INVITED", "PENDING_FINAL", "NEEDS_CORRECTION"]);

function partnerAttention(p: ModerationPartnerRow) {
  const unread = Number(p.unreadForAdmin) || Number(p.unreadReapplyCount) || 0;
  if (unread > 0) return unread;
  if (
    p.status === "PENDING" ||
    p.status === "PENDING_FINAL" ||
    p.status === "NEEDS_CORRECTION" ||
    p.status === "PENDING_REMODERATION"
  ) {
    return 1;
  }
  return 0;
}

export function ModerationHub({
  partners,
  partnersError,
  partnersDbOffline,
  cars,
  reviews,
  reviewsBadgeCount,
  profiles,
  listingsError,
  reviewsError,
  profilesError,
  listingsDbOffline,
  reviewsDbOffline,
  profilesDbOffline,
}: Props) {
  const L = useBpLabels();
  const { locale, dictionary } = useAdminLocale();
  const labels = useMemo<Labels>(() => {
    const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
    return {
      title: dictionary.pages.moderation.title,
      body: phrase(
        "Choose a section: primary moderation, car listings, profiles, or reviews.",
        "აირჩიეთ ქვეფანჯარა: პირველადი მოდერაცია, განცხადებები, პროფილები ან შეფასებები.",
        "Выберите раздел: первичная модерация, объявления, профили или отзывы.",
      ),
      primaryTab: phrase("Primary moderation", "პირველადი მოდერაცია", "Первичная модерация"),
      primaryTitle: phrase("Primary moderation", "პირველადი მოდერაცია", "Первичная модерация"),
      primaryBody: phrase(
        "New partner applications waiting for a first review.",
        "ახალი პარტნიორის განაცხადები, რომლებიც პირველ გადამოწმებას ელოდება.",
        "Новые заявки партнёров, которые ждут первой проверки.",
      ),
      listingsTab: phrase("Listings", "განცხადებები", "Объявления"),
      reviewsTab: dictionary.nav.reviews,
      profilesTab: phrase("Profiles", "პროფილები", "Профили"),
      listingsTitle: phrase("Listing moderation", "განცხადებების მოდერაცია", "Модерация объявлений"),
      listingsBody: phrase(
        "Approve or reject car listings waiting for review.",
        "დაამტკიცეთ ან უარყავით მანქანების განცხადებები.",
        "Одобрение или отклонение автомобилей.",
      ),
      reviewsTitle: dictionary.pages.reviews.title,
      reviewsBody: dictionary.pages.reviews.body,
      profilesTitle: phrase(
        "Partner profile moderation",
        "პარტნიორის პროფილის მოდერაცია",
        "Модерация профилей партнёров",
      ),
      profilesBody: phrase(
        "Personal-info changes awaiting review — open the partner review page.",
        "პირადი ინფოს ცვლილებები — გახსენით განხილვის გვერდი უნიკალური კოდით.",
        "Изменения личной информации — откройте страницу проверки.",
      ),
      noListings: phrase(
        "No listings awaiting moderation.",
        "მოდერაციის მოლოდინში განცხადება არ არის.",
        "Нет объявлений на модерации.",
      ),
      noReviews: phrase("No reviews yet.", "შეფასებები ჯერ არ არის.", "Отзывов пока нет."),
      noProfiles: phrase(
        "No profile changes awaiting review.",
        "პროფილის ცვლილებები ჯერ არ არის.",
        "Изменений профиля пока нет.",
      ),
      openPartner: phrase("Open review", "განხილვის გახსნა", "Открыть проверку"),
      rejectProfile: phrase("Reject", "უარყოფა", "Отклонить"),
      dbOfflineHint: phrase(
        "No data while the database is offline.",
        "ბაზა მიუწვდომელია — მონაცემები არ ჩანს.",
        "База недоступна — данных нет.",
      ),
    };
  }, [locale, dictionary]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab: TabId = useMemo(() => {
    const raw = searchParams.get("tab");
    const partnerTab = searchParams.get("partnerTab")?.trim().toLowerCase();
    if (raw === "reviews") return "reviews";
    if (raw === "profiles") return "profiles";
    if (raw === "listings") return "listings";
    if (raw === "primary" || partnerTab === "primary" || !raw) return "primary";
    return "primary";
  }, [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "primary") params.delete("tab");
      else params.set("tab", next);
      params.delete("partnerTab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [removedCarIds, setRemovedCarIds] = useState<string[]>([]);
  const visibleCars = cars.filter((car) => !removedCarIds.includes(car.id));

  const primaryPartners = partners.filter((p) => PRIMARY_STATUSES.has(p.status));

  const tabCounts = {
    primary: primaryPartners.length,
    listings: visibleCars.length,
    profiles: profiles.length,
    reviews: reviews.length,
  } as const;

  const tabPending = {
    primary: primaryPartners.reduce((sum, p) => sum + partnerAttention(p), 0),
    listings: visibleCars.length,
    profiles: profiles.length,
    reviews: reviewsBadgeCount ?? reviews.filter((r) => r.status === "PENDING").length,
  } as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-extrabold text-[#0b1f4b]">{labels.title}</h1>
      <p className="mb-5 text-sm text-slate-600">{labels.body}</p>

      <div
        className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm lg:grid-cols-4"
        role="tablist"
        aria-label={labels.title}
      >
        {(
          [
            ["primary", labels.primaryTab],
            ["listings", labels.listingsTab],
            ["profiles", labels.profilesTab],
            ["reviews", labels.reviewsTab],
          ] as const
        ).map(([id, label]) => {
          const count = tabCounts[id];
          const hasPending = tabPending[id] > 0;
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-2 py-2.5 text-center text-sm font-bold leading-snug transition sm:px-3",
                selected && !hasPending && "bg-[#0b1f4b] text-white",
                selected && hasPending && "bg-amber-400 text-amber-950 ring-2 ring-amber-500",
                !selected && !hasPending && "text-slate-600 hover:bg-slate-50",
                !selected &&
                  hasPending &&
                  "bg-amber-100 text-amber-950 ring-1 ring-amber-300 hover:bg-amber-200",
              )}
            >
              {label}
              <span
                className={cn(
                  "ms-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold sm:ms-2",
                  hasPending
                    ? selected
                      ? "bg-amber-950 text-amber-100"
                      : "bg-amber-500 text-white"
                    : selected
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "primary" ? (
        <section role="tabpanel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.primaryTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">{labels.primaryBody}</p>
          {(partnersDbOffline || partnersError) && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-semibold">
                {partnersDbOffline
                  ? "Partner list could not be loaded from the online database"
                  : "Could not load partners"}
              </p>
              <p className="mt-1 leading-relaxed">{partnersError}</p>
            </div>
          )}
          <PartnersManager initialPartners={partners} mode="primary" />
        </section>
      ) : null}

      {tab === "listings" ? (
        <section role="tabpanel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.listingsTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{labels.listingsBody}</p>

          {(listingsDbOffline || listingsError) && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-semibold">
                {listingsDbOffline ? "Database offline — connection refused" : "Could not load listings"}
              </p>
              <p className="mt-1 leading-relaxed">{listingsError}</p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {visibleCars.map((car) => (
              <article
                key={car.id}
                className="flex flex-col gap-3 rounded-xl border-2 border-amber-400 bg-amber-50/80 p-3 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-red-200">
                  {car.photos[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={car.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                      {car.status}
                    </p>
                    {car.status === "PENDING" ? (
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {L.newListing}
                      </span>
                    ) : car.status === "PENDING_REMODERATION" ? (
                      <>
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
                          {L.correction}
                        </span>
                        {isInsuranceExpiryReason(car.hiddenReason) ||
                        isInsuranceDateExpired(car.insuranceExpiresAt) ? (
                          <span className="text-[11px] font-extrabold text-red-700">
                            {insuranceExpiryReasonLabel(locale)}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <p className="truncate text-base font-extrabold text-[#0b1f4b]">
                    {car.make} {car.model}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {car.year} · {car.country} · {car.bodyType}
                  </p>
                  {car.insuranceExpiresAt ? (
                    <p className="mt-0.5 text-xs font-semibold text-amber-900">
                      {L.insuranceUntil} {car.insuranceExpiresAt}
                    </p>
                  ) : null}
                  <p className="truncate text-xs text-slate-500">{car.partnerName}</p>
                </div>
                <div className="relative z-10 shrink-0 sm:ms-auto">
                  <ListingModerationActions
                    carId={car.id}
                    onDone={() => setRemovedCarIds((prev) => (prev.includes(car.id) ? prev : [...prev, car.id]))}
                  />
                </div>
              </article>
            ))}
            {visibleCars.length === 0 ? (
              <p className="text-slate-500">
                {listingsDbOffline ? labels.dbOfflineHint : labels.noListings}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "profiles" ? (
        <ModerationProfilesPanel
          profiles={profiles}
          profilesError={profilesError}
          profilesDbOffline={profilesDbOffline}
          labels={{
            profilesTitle: labels.profilesTitle,
            profilesBody: labels.profilesBody,
            openPartner: labels.openPartner,
            rejectProfile: labels.rejectProfile,
            noProfiles: labels.noProfiles,
            dbOfflineHint: labels.dbOfflineHint,
          }}
        />
      ) : null}

      {tab === "reviews" ? (
        <section role="tabpanel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.reviewsTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{labels.reviewsBody}</p>

          {(reviewsDbOffline || reviewsError) && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-semibold">
                {reviewsDbOffline ? "Database offline — connection refused" : "Could not load reviews"}
              </p>
              <p className="mt-1 leading-relaxed">{reviewsError}</p>
            </div>
          )}

          <ResponsiveDataList
            className="mt-5"
            desktop={
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Partner</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Car</th>
                      <th className="p-3">Scores</th>
                      <th className="p-3">Avg</th>
                      <th className="p-3">Comment</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          {reviewsDbOffline ? labels.dbOfflineHint : labels.noReviews}
                        </td>
                      </tr>
                    ) : (
                      reviews.map((r, i) => (
                        <tr key={r.id} className="border-t align-top">
                          <td className="p-3 font-bold">#{i + 1}</td>
                          <td className="p-3">{r.partnerName}</td>
                          <td className="p-3">{r.authorName}</td>
                          <td className="p-3">{r.carLabel}</td>
                          <td className="p-3">
                            V{r.vehicleQuality} / H{r.hostCommunication} / D{r.deliveryServiceQuality}
                          </td>
                          <td className="p-3">{r.averageRating.toFixed(1)}</td>
                          <td className="max-w-xs p-3">{r.comment}</td>
                          <td className="p-3">{r.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              reviews.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  {reviewsDbOffline ? labels.dbOfflineHint : labels.noReviews}
                </p>
              ) : (
                reviews.map((r, i) => (
                  <MobileDataCard key={r.id}>
                    <MobileDataRow label="#">#{i + 1}</MobileDataRow>
                    <MobileDataRow label="Partner">{r.partnerName}</MobileDataRow>
                    <MobileDataRow label="Author">{r.authorName}</MobileDataRow>
                    <MobileDataRow label="Car">{r.carLabel}</MobileDataRow>
                    <MobileDataRow label="Scores">
                      V{r.vehicleQuality} / H{r.hostCommunication} / D{r.deliveryServiceQuality}
                    </MobileDataRow>
                    <MobileDataRow label="Avg">{r.averageRating.toFixed(1)}</MobileDataRow>
                    <MobileDataRow label="Comment">
                      <span className="whitespace-pre-wrap text-end">{r.comment || "—"}</span>
                    </MobileDataRow>
                    <MobileDataRow label="Status">{r.status}</MobileDataRow>
                  </MobileDataCard>
                ))
              )
            }
          />
        </section>
      ) : null}
    </div>
  );
}
