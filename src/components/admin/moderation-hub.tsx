"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { ListingModerationActions } from "@/components/admin/listing-moderation-actions";
import { ModerationProfilesPanel } from "@/components/admin/moderation-profiles-panel";
import { PartnersManager } from "@/components/admin/partners-manager";
import { displayImageUrl } from "@/lib/media/display-image";
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
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  photos: Array<{ id: string; url: string }>;
  passportFrontUrl: string | null;
  passportBackUrl: string | null;
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
  openUser: string;
  openPersonalInfo: string;
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

type TabId = "listings" | "reviews" | "profiles";

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
        "Choose a section: profiles, car listings, or reviews.",
        "აირჩიეთ ქვეფანჯარა: პროფილი, განცხადებები ან შეფასებები.",
        "Выберите раздел: профиль, объявления или отзывы.",
      ),
      primaryBody: phrase(
        "New partner applications and personal-info changes waiting for review.",
        "ახალი პარტნიორის განაცხადები და პირადი ინფოს ცვლილებები, რომლებიც გადამოწმებას ელოდება.",
        "Новые заявки партнёров и изменения личных данных, которые ждут проверки.",
      ),
      listingsTab: phrase("Listings", "განცხადებები", "Объявления"),
      reviewsTab: dictionary.nav.reviews,
      profilesTab: phrase("Profile", "პროფილი", "Профиль"),
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
      openUser: phrase("User", "მომხმარებელი", "Пользователь"),
      openPersonalInfo: phrase(
        "Open personal info",
        "პირადი ინფოს გახსნა",
        "Открыть личные данные",
      ),
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
    if (raw === "reviews") return "reviews";
    if (raw === "listings") return "listings";
    return "profiles";
  }, [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "profiles") params.delete("tab");
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

  const profileIds = new Set([
    ...primaryPartners.map((p) => p.id),
    ...profiles.map((p) => p.id),
  ]);
  const tabCounts = {
    listings: visibleCars.length,
    profiles: profileIds.size,
    reviews: reviews.length,
  } as const;

  const tabPending = {
    listings: visibleCars.length,
    profiles:
      primaryPartners.reduce((sum, p) => sum + partnerAttention(p), 0) + profiles.length,
    reviews: reviewsBadgeCount ?? reviews.filter((r) => r.status === "PENDING").length,
  } as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-extrabold text-[#0b1f4b]">{labels.title}</h1>
      <p className="mb-5 text-sm text-slate-600">{labels.body}</p>

      <div
        className="mb-6 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-3"
        role="tablist"
        aria-label={labels.title}
      >
        {(
          [
            ["profiles", labels.profilesTab],
            ["listings", labels.listingsTab],
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
                "min-h-11 rounded-lg px-2 py-2.5 text-center text-sm font-bold leading-snug transition sm:px-3",
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

      {tab === "profiles" ? (
        <section role="tabpanel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.profilesTab}</h2>
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
          <ModerationProfilesPanel
            embedded
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
                    <img
                      src={displayImageUrl(car.photos[0].url, 128)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
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
                      </>
                    ) : null}
                  </div>
                  <p className="truncate text-base font-extrabold text-[#0b1f4b]">
                    {car.make} {car.model}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {car.year} · {car.country} · {car.bodyType}
                  </p>
                  <p className="truncate text-xs text-slate-500">{car.partnerName}</p>
                  {car.partnerId ? (
                    <Link
                      href={`${ADMIN_BASE}/moderation/partners/${encodeURIComponent(car.partnerId)}?returnTab=listings`}
                      className="mt-1.5 inline-flex min-h-10 max-w-full items-center break-all rounded-lg bg-[#0b1f4b] px-3 py-2 text-left text-xs font-bold text-white hover:bg-[#16336e]"
                      aria-label={`${labels.openPersonalInfo}: ${car.partnerEmail || car.partnerName || labels.openUser}`}
                    >
                      {car.partnerEmail || labels.openUser}
                    </Link>
                  ) : null}
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
