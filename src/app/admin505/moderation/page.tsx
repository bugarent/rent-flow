import { Suspense } from "react";
import { ListingStatus } from "@prisma/client";
import { prisma, reopenDbCircuit } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { dbOfflineMessage, isDbOfflineError, shortPrismaError } from "@/lib/server/db-errors";
import {
  ModerationHub,
  type ModerationCarView,
  type ModerationProfileView,
  type ModerationReviewView,
} from "@/components/admin/moderation-hub";
import { readAdminLocale } from "@/lib/server/admin-preferences";
import { getAdminDictionary } from "@/lib/i18n/admin-dictionaries";
import { formatPartnerCode } from "@/lib/ids";
import { parseProfileModeration } from "@/lib/partners/profile-moderation";
import { resolveProfileModeration } from "@/lib/server/partner-profile-moderation-store";
import { readCarInsuranceDocs } from "@/lib/server/car-insurance-store";
import { applyExpiredInsuranceRemoderation } from "@/lib/server/car-insurance-expiry";
import { listFilePendingCars } from "@/lib/server/partner-cars-store";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { bodyTypeFromCarDescription, countriesFromCarDescription } from "@/lib/cars/listing-meta";
import {
  loadAdminPartnerRows,
  filterDirectoryPartners,
} from "@/lib/server/admin-partner-rows";

async function loadCars(): Promise<{
  cars: ModerationCarView[];
  dbOffline: boolean;
  queryError: string;
}> {
  try {
    await applyExpiredInsuranceRemoderation().catch((error) => {
      console.warn("[admin/moderation] insurance expiry", error);
    });

    const rows = await prisma.car.findMany({
      where: {
        status: {
          in: [ListingStatus.PENDING, ListingStatus.PENDING_REMODERATION],
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const carIds = rows.map((c) => c.id);
    const partnerIds = [...new Set(rows.map((c) => c.partnerId).filter(Boolean))];

    const [photos, passports, partners] = await Promise.all([
      carIds.length
        ? prisma.carPhoto.findMany({
            where: { carId: { in: carIds } },
            orderBy: { sortOrder: "asc" },
            select: { id: true, carId: true, url: true },
          })
        : Promise.resolve([]),
      carIds.length
        ? prisma.carPassport.findMany({
            where: { carId: { in: carIds } },
            select: { carId: true, frontUrl: true, backUrl: true },
          })
        : Promise.resolve([]),
      partnerIds.length
        ? prisma.partner.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, companyName: true },
          })
        : Promise.resolve([]),
    ]);
    const insuranceByCar = await readCarInsuranceDocs(carIds);
    const locations = await listDeliveryLocations({ activeOnly: false });
    const isoByLocationId = new Map(locations.map((loc) => [loc.id, loc.countryIso2]));

    const photosByCar = new Map<string, Array<{ id: string; url: string }>>();
    for (const photo of photos) {
      const list = photosByCar.get(photo.carId) ?? [];
      list.push({ id: photo.id, url: photo.url });
      photosByCar.set(photo.carId, list);
    }
    const passportByCar = new Map(passports.map((p) => [p.carId, p]));
    const partnerById = new Map(partners.map((p) => [p.id, p]));

    const prismaCars: ModerationCarView[] = rows.map((car) => {
      const passport = passportByCar.get(car.id);
      const insurance = insuranceByCar.get(car.id);
      return {
        id: car.id,
        status: car.status,
        make: car.make,
        model: car.model,
        year: car.year,
        hiddenReason: car.hiddenReason,
        partnerName: partnerById.get(car.partnerId)?.companyName ?? "—",
        photos: photosByCar.get(car.id) ?? [],
        passportFrontUrl: passport?.frontUrl ?? null,
        passportBackUrl: passport?.backUrl ?? null,
        insuranceUrl: insurance?.insuranceUrl ?? null,
        insuranceExpiresAt: insurance?.insuranceExpiresAt ?? null,
        country: countriesFromCarDescription(car.description),
        bodyType: bodyTypeFromCarDescription(car.description),
      };
    });
    const seen = new Set(prismaCars.map((c) => c.id));
    const fileCars = await listFilePendingCars();
    const extraIds = fileCars.filter((c) => !seen.has(c.id)).map((c) => c.id);
    const fileInsurance = extraIds.length ? await readCarInsuranceDocs(extraIds) : new Map();
    const merged = [
      ...prismaCars,
      ...fileCars
        .filter((car) => !seen.has(car.id))
        .map((car) => {
          const insurance = fileInsurance.get(car.id);
          return {
            id: car.id,
            status: car.status,
            make: car.make,
            model: car.model,
            year: car.year,
            hiddenReason: car.hiddenReason ?? null,
            partnerName: car.partnerName ?? "—",
            photos: car.photos.map((url, index) => ({ id: `${car.id}-photo-${index}`, url })),
            passportFrontUrl: car.passportFrontUrl ?? null,
            passportBackUrl: car.passportBackUrl ?? null,
            insuranceUrl: insurance?.insuranceUrl ?? null,
            insuranceExpiresAt: insurance?.insuranceExpiresAt ?? null,
            country: countriesFromCarDescription(
              car.description,
              (car.deliveryPrices || []).map((row) => isoByLocationId.get(row.deliveryLocationId) || ""),
            ),
            bodyType: bodyTypeFromCarDescription(car.description),
          };
        }),
    ];

    return {
      cars: merged,
      dbOffline: false,
      queryError: "",
    };
  } catch (error) {
    console.error("[admin/moderation listings]", error);
    const dbOffline = isDbOfflineError(error);
    const fileCars = await listFilePendingCars();
    const fileIds = fileCars.map((c) => c.id);
    const fileInsurance = fileIds.length ? await readCarInsuranceDocs(fileIds) : new Map();
    let isoByLocationId = new Map<string, string>();
    try {
      const locations = await listDeliveryLocations({ activeOnly: false });
      isoByLocationId = new Map(locations.map((loc) => [loc.id, loc.countryIso2]));
    } catch {
      isoByLocationId = new Map();
    }
    return {
      cars: fileCars.map((car) => {
        const insurance = fileInsurance.get(car.id);
        return {
          id: car.id,
          status: car.status,
          make: car.make,
          model: car.model,
          year: car.year,
          hiddenReason: car.hiddenReason ?? null,
          partnerName: car.partnerName ?? "—",
          photos: car.photos.map((url, index) => ({ id: `${car.id}-photo-${index}`, url })),
          passportFrontUrl: car.passportFrontUrl ?? null,
          passportBackUrl: car.passportBackUrl ?? null,
          insuranceUrl: insurance?.insuranceUrl ?? null,
          insuranceExpiresAt: insurance?.insuranceExpiresAt ?? null,
          country: countriesFromCarDescription(
            car.description,
            (car.deliveryPrices || []).map((row) => isoByLocationId.get(row.deliveryLocationId) || ""),
          ),
          bodyType: bodyTypeFromCarDescription(car.description),
        };
      }),
      dbOffline,
      queryError: dbOffline ? dbOfflineMessage("Car moderation") : shortPrismaError(error),
    };
  }
}

async function loadReviews(): Promise<{
  reviews: ModerationReviewView[];
  dbOffline: boolean;
  queryError: string;
}> {
  try {
    const rows = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });

    const authorIds = [...new Set(rows.map((r) => r.authorId).filter(Boolean))];
    const partnerIds = [...new Set(rows.map((r) => r.partnerId).filter(Boolean))];
    const carIds = [...new Set(rows.map((r) => r.carId).filter(Boolean))];

    const [authors, partners, cars] = await Promise.all([
      authorIds.length
        ? prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      partnerIds.length
        ? prisma.partner.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, companyName: true },
          })
        : Promise.resolve([]),
      carIds.length
        ? prisma.car.findMany({
            where: { id: { in: carIds } },
            select: { id: true, make: true, model: true },
          })
        : Promise.resolve([]),
    ]);

    const authorById = new Map(authors.map((a) => [a.id, a]));
    const partnerById = new Map(partners.map((p) => [p.id, p]));
    const carById = new Map(cars.map((c) => [c.id, c]));

    return {
      reviews: rows.map((r) => {
        const author = authorById.get(r.authorId);
        const partner = partnerById.get(r.partnerId);
        const car = carById.get(r.carId);
        return {
          id: r.id,
          vehicleQuality: r.vehicleQuality,
          hostCommunication: r.hostCommunication,
          deliveryServiceQuality: r.deliveryServiceQuality,
          averageRating: r.averageRating,
          comment: r.comment,
          status: r.status,
          partnerName: partner?.companyName ?? "—",
          authorName: author ? `${author.firstName} ${author.lastName}`.trim() : "—",
          carLabel: car ? `${car.make} ${car.model}`.trim() : "—",
        };
      }),
      dbOffline: false,
      queryError: "",
    };
  } catch (error) {
    console.error("[admin/moderation reviews]", error);
    const dbOffline = isDbOfflineError(error);
    return {
      reviews: [],
      dbOffline,
      queryError: dbOffline ? dbOfflineMessage("Review") : shortPrismaError(error),
    };
  }
}

async function loadProfiles(): Promise<{
  profiles: ModerationProfileView[];
  dbOffline: boolean;
  queryError: string;
}> {
  const byId = new Map<string, ModerationProfileView>();
  let dbOffline = false;
  let queryError = "";

  try {
    const rows = await prisma.partner.findMany({
      where: {
        OR: [
          { status: "PENDING_REMODERATION" },
          { unreadReapplyCount: { gt: 0 } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        companyName: true,
        status: true,
        sequentialNumber: true,
        email: true,
        phone: true,
        unreadReapplyCount: true,
        profileModeration: true,
        updatedAt: true,
      },
    });

    for (const p of rows) {
      let moderation = parseProfileModeration(p.profileModeration);
      try {
        moderation = await resolveProfileModeration(p as { id: string; profileModeration?: unknown });
      } catch {
        /* use parsed */
      }
      if (!moderation.pendingChanges.length && p.status !== "PENDING_REMODERATION") continue;
      const latest = moderation.pendingChanges[0];
      byId.set(p.id, {
        id: p.id,
        companyName: p.companyName,
        status: p.status,
        partnerCode: formatPartnerCode(p.sequentialNumber),
        email: p.email,
        phone: p.phone,
        unreadCount: moderation.unreadCount || p.unreadReapplyCount || 0,
        summary: latest?.summary || "Profile awaiting review",
        changedAt: latest?.at || p.updatedAt?.toISOString?.() || null,
        changes: latest?.changes || [],
      });
    }
  } catch (error) {
    console.error("[admin/moderation profiles]", error);
    dbOffline = isDbOfflineError(error);
    queryError = dbOffline ? dbOfflineMessage("Partner") : shortPrismaError(error);
  }

  // Always merge file-store queue (used when Postgres is offline / local partner)
  try {
    const { listAllProfileModerationFiles } = await import(
      "@/lib/server/partner-profile-moderation-store"
    );
    const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
    const { loadLocalPartner } = await import("@/lib/auth/local-partner-store");
    const fileRows = await listAllProfileModerationFiles();
    const local = loadLocalPartner();

    for (const row of fileRows) {
      if (byId.has(row.partnerId)) {
        const existing = byId.get(row.partnerId)!;
        if (!existing.changes.length && row.moderation.pendingChanges[0]) {
          const latest = row.moderation.pendingChanges[0];
          byId.set(row.partnerId, {
            ...existing,
            unreadCount: Math.max(existing.unreadCount, row.moderation.unreadCount),
            summary: latest.summary,
            changedAt: latest.at,
            changes: latest.changes,
          });
        }
        continue;
      }
      if (!row.moderation.pendingChanges.length) continue;
      const latest = row.moderation.pendingChanges[0];
      const settings = await readCompanySettingsFile(row.partnerId);
      const email = settings?.email || local?.email || "";
      const { ensureFilePartnerSequentialNumber } = await import(
        "@/lib/server/ensure-file-partner-code"
      );
      const sequentialNumber = await ensureFilePartnerSequentialNumber({
        partnerId: row.partnerId,
        email,
      });
      byId.set(row.partnerId, {
        id: row.partnerId,
        companyName:
          settings?.title ||
          settings?.legalName ||
          (row.partnerId === local?.id ? local.companyName : null) ||
          row.partnerId,
        status: "PENDING_REMODERATION",
        partnerCode: formatPartnerCode(sequentialNumber),
        email: email || "—",
        phone: settings?.primaryPhone || "—",
        unreadCount: row.moderation.unreadCount || row.moderation.pendingChanges.length,
        summary: latest.summary || "Profile awaiting review",
        changedAt: latest.at,
        changes: latest.changes || [],
      });
    }
  } catch (fileError) {
    console.warn("[admin/moderation profiles] file store", fileError);
  }

  const profiles = [...byId.values()].sort((a, b) =>
    String(b.changedAt || "").localeCompare(String(a.changedAt || "")),
  );

  return { profiles, dbOffline, queryError };
}

export default async function AdminModerationPage() {
  await requireAdmin();
  reopenDbCircuit();
  const locale = await readAdminLocale();
  const t = getAdminDictionary(locale);
  const [listings, reviewData, profileData, partnerRows] = await Promise.all([
    loadCars(),
    loadReviews(),
    loadProfiles(),
    loadAdminPartnerRows(),
  ]);
  const directoryPartners = filterDirectoryPartners(partnerRows.partners);
  const partnersAttentionCount = directoryPartners.reduce((sum, p) => {
    const unread = Number(p.unreadForAdmin) || 0;
    if (unread > 0) return sum + unread;
    if (
      p.status === "PENDING" ||
      p.status === "PENDING_FINAL" ||
      p.status === "NEEDS_CORRECTION" ||
      p.status === "PENDING_REMODERATION"
    ) {
      return sum + 1;
    }
    return sum;
  }, 0);
  const pendingReviewsCount = reviewData.reviews.filter((r) => r.status === "PENDING").length;

  const tabLabels =
    locale === "ka"
      ? {
          partnersTab: "პარტნიორები",
          partnersTitle: t.pages.partners.title,
          partnersBody: t.pages.partners.body,
          directoryTab: "დირექტორია",
          directoryTitle: "დირექტორია",
          directoryBody: "დამტკიცებული განაცხადები: სახელი, ქვეყანა, ტიპი, ფლოტი და სტატუსი.",
          primaryTab: "პირველადი მოდერაცია",
          primaryTitle: "პირველადი მოდერაცია",
          primaryBody: "ახალი პარტნიორის განაცხადები, რომლებიც პირველ გადამოწმებას ელოდება.",
          listingsTab: "განცხადებები",
          listingsTitle: "განცხადებების მოდერაცია",
          listingsBody: "დაამტკიცეთ ან უარყავით მანქანების განცხადებები.",
          profilesTab: "პროფილები",
          profilesTitle: "პარტნიორის პროფილის მოდერაცია",
          profilesBody: "პირადი ინფოს ცვლილებები — გახსენით განხილვის გვერდი უნიკალური კოდით.",
          noProfiles: "პროფილის ცვლილებები ჯერ არ არის.",
          openPartner: "განხილვის გახსნა",
          rejectProfile: "უარყოფა",
          moderationBody:
            "აირჩიეთ ქვეფანჯარა: პარტნიორები, დირექტორია, პირველადი მოდერაცია, განცხადებები, პროფილები ან შეფასებები.",
        }
      : locale === "ru"
        ? {
            partnersTab: "Партнёры",
            partnersTitle: t.pages.partners.title,
            partnersBody: t.pages.partners.body,
            directoryTab: "Каталог",
            directoryTitle: "Каталог",
            directoryBody: "Одобренные заявки: имя, страна, тип, флот и статус.",
            primaryTab: "Первичная модерация",
            primaryTitle: "Первичная модерация",
            primaryBody: "Новые заявки партнёров, которые ждут первой проверки.",
            listingsTab: "Объявления",
            listingsTitle: "Модерация объявлений",
            listingsBody: "Одобрение или отклонение автомобилей.",
            profilesTab: "Профили",
            profilesTitle: "Модерация профилей партнёров",
            profilesBody: "Изменения личной информации — откройте страницу проверки.",
            noProfiles: "Изменений профиля пока нет.",
            openPartner: "Открыть проверку",
            rejectProfile: "Отклонить",
            moderationBody:
              "Выберите раздел: партнёры, каталог, первичная модерация, объявления, профили или отзывы.",
          }
        : {
            partnersTab: "Partners",
            partnersTitle: t.pages.partners.title,
            partnersBody: t.pages.partners.body,
            directoryTab: "Directory",
            directoryTitle: "Directory",
            directoryBody: "Approved applications: name, country, type, fleet, and status.",
            primaryTab: "Primary moderation",
            primaryTitle: "Primary moderation",
            primaryBody: "New partner applications waiting for a first review.",
            listingsTab: "Listings",
            listingsTitle: "Listing moderation",
            listingsBody: "Approve or reject car listings waiting for review.",
            profilesTab: "Profiles",
            profilesTitle: "Partner profile moderation",
            profilesBody: "Personal-info changes awaiting review — open the partner review page.",
            noProfiles: "No profile changes awaiting review.",
            openPartner: "Open review",
            rejectProfile: "Reject",
            moderationBody:
              "Choose a section: partners, directory, primary moderation, car listings, profiles, or reviews.",
          };

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">{t.common.loading}</div>
      }
    >
      <ModerationHub
        partners={directoryPartners}
        partnersBadgeCount={partnersAttentionCount}
        partnersError={partnerRows.queryError}
        partnersDbOffline={partnerRows.dbOffline}
        cars={listings.cars}
        reviews={reviewData.reviews}
        reviewsBadgeCount={pendingReviewsCount}
        profiles={profileData.profiles}
        listingsError={listings.queryError}
        reviewsError={reviewData.queryError}
        profilesError={profileData.queryError}
        listingsDbOffline={listings.dbOffline}
        reviewsDbOffline={reviewData.dbOffline}
        profilesDbOffline={profileData.dbOffline}
        labels={{
          title: t.pages.moderation.title,
          body: tabLabels.moderationBody,
          partnersTab: tabLabels.partnersTab,
          partnersTitle: tabLabels.partnersTitle,
          partnersBody: tabLabels.partnersBody,
          directoryTab: tabLabels.directoryTab,
          directoryTitle: tabLabels.directoryTitle,
          directoryBody: tabLabels.directoryBody,
          primaryTab: tabLabels.primaryTab,
          primaryTitle: tabLabels.primaryTitle,
          primaryBody: tabLabels.primaryBody,
          listingsTab: tabLabels.listingsTab,
          reviewsTab: t.nav.reviews,
          profilesTab: tabLabels.profilesTab,
          listingsTitle: tabLabels.listingsTitle,
          listingsBody: tabLabels.listingsBody,
          reviewsTitle: t.pages.reviews.title,
          reviewsBody: t.pages.reviews.body,
          profilesTitle: tabLabels.profilesTitle,
          profilesBody: tabLabels.profilesBody,
          noListings: "No listings awaiting moderation.",
          noReviews: "No reviews yet.",
          noProfiles: tabLabels.noProfiles,
          openPartner: tabLabels.openPartner,
          rejectProfile: tabLabels.rejectProfile,
          dbOfflineHint: "No data while the database is offline.",
        }}
      />
    </Suspense>
  );
}
