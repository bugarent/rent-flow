import { requireAdmin } from "@/lib/auth/guards";
import { AdminCarsPanel } from "@/components/admin/admin-cars-panel";
import { readAdminLocale } from "@/lib/server/admin-preferences";
import { getAdminDictionary } from "@/lib/i18n/admin-dictionaries";
import { loadAdminCarRows } from "@/lib/server/load-admin-cars";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage() {
  await requireAdmin();
  const locale = await readAdminLocale();
  const t = getAdminDictionary(locale);
  const { cars, dbOffline } = await loadAdminCarRows();

  const labels =
    locale === "ka"
      ? {
          title: t.pages.cars.title,
          body: t.pages.cars.body,
          empty: "მანქანები ჯერ არ არის.",
          dbOfflineHint: "ბაზა მიუწვდომელია — ნაჩვენებია ლოკალური განცხადებები.",
          details: "დეტალები",
          delete: "წაშლა",
          deleteConfirm: "ნამდვილად გსურთ ამ განცხადების წაშლა?",
          deleteFailed: "განცხადების წაშლა ვერ მოხერხდა.",
          partner: "პარტნიორი",
          perDay: "დღე",
          searchPlatePlaceholder: "სახელმწიფო ნომერი…",
          searchPartnerPlaceholder: "პარტნიორის ნომერი (PRT-…)…",
          searchButton: "ძებნა",
          searchEmpty: "ამ ძებნით მანქანა არ მოიძებნა.",
          colPlate: "სახ. ნომერი",
          colPartnerNumber: "პარტნიორის ნომერი",
        }
      : locale === "ru"
        ? {
            title: t.pages.cars.title,
            body: t.pages.cars.body,
            empty: "Автомобилей пока нет.",
            dbOfflineHint: "База недоступна — показаны локальные объявления.",
            details: "Детали",
            delete: "Удалить",
            deleteConfirm: "Удалить это объявление?",
            deleteFailed: "Не удалось удалить объявление.",
            partner: "Партнёр",
            perDay: "день",
            searchPlatePlaceholder: "Госномер…",
            searchPartnerPlaceholder: "Номер партнёра (PRT-…)…",
            searchButton: "Поиск",
            searchEmpty: "По этому запросу автомобилей нет.",
            colPlate: "Госномер",
            colPartnerNumber: "Номер партнёра",
          }
        : {
            title: t.pages.cars.title,
            body: t.pages.cars.body,
            empty: "No cars yet.",
            dbOfflineHint: "Database offline — showing local listings.",
            details: "Details",
            delete: "Delete",
            deleteConfirm: "Delete this listing?",
            deleteFailed: "Could not delete listing.",
            partner: "Partner",
            perDay: "day",
            searchPlatePlaceholder: "License plate…",
            searchPartnerPlaceholder: "Partner number (PRT-…)…",
            searchButton: "Search",
            searchEmpty: "No cars match this search.",
            colPlate: "Plate",
            colPartnerNumber: "Partner number",
          };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminCarsPanel cars={cars} dbOffline={dbOffline} labels={labels} />
    </div>
  );
}
