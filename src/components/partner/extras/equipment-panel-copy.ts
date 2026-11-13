import { knownText } from "@/lib/i18n/known-record-text";
import { EQUIPMENT_PANEL_I18N } from "@/components/partner/extras/equipment-panel-i18n";

function baseCopy(locale: string) {
  if (locale === "ka") {
    return {
      colService: "მომსახურება და აღჭურვილობა",
      colPrice: "ფასი დღეში",
      colMin: "მინ. არჩევისას",
      colMax: "მაქს. გამოყენებისას",
      dailyHint: "ერთი დღის ფასი. ჯამი ითვლება არჩეული დღეების რაოდენობით.",
      minHint: "სერვისის არჩევისას ჯამი ამაზე ნაკლები არ იქნება.",
      maxHint: "რამდენი დღეც არ უნდა იყოს, ჯამი ამას არ გადააჭარბებს.",
      boundsError: "მინიმუმი მაქსიმუმზე მეტი არ უნდა იყოს.",
      colCars: "მანქანები",
      edit: "რედაქტირება",
      add: "+ დამატება",
      save: "შენახვა",
      saving: "ინახება…",
      saved: "შენახულია",
      back: "უკან",
      settings: "პარამეტრები",
      cars: "მანქანები",
      selectAll: "ყველას მონიშვნა",
      reset: "გაუქმება",
      free: "უფასო",
      status: "სტატუსი",
      on: "ჩართულია",
      forbidden: "აკრძალულია",
      off: "გამორთულია",
      done: "მზადაა",
      insuranceGroup: "დაზღვევა",
      name: "დასახელება",
      description: "აღწერა",
      delete: "წაშლა",
      deleteConfirm: "ნამდვილად გსურთ ამ სერვისის წაშლა? ის აღარ გამოჩნდება თქვენს მანქანებზე.",
      deleteFailed: "სერვისის წაშლა ვერ მოხერხდა.",
      breadcrumb: "დამატებითი მომსახურეობა",
      empty: "მომსახურება ჯერ არ არის.",
      carsCount: "{n} მანქანა",
      help: "მიუთითეთ დღის ფასი, მინიმუმი არჩევისას და მაქსიმუმი გამოყენებისას. ჯამი = დღის ფასი × დღეები, შემდეგ მინიმუმამდე აწევა და მაქსიმუმამდე შეზღუდვა. დღიური 0 → ცხრილში €0 და მინ/მაქს ტირეები.",
      maxCapNotice: "ამ სერვისის მაქსიმალური ღირებულება არის €{n}",
      dailyRangeNotice:
        "დღიური ფასი €{min}-დან €{max}-მდე შეიძლება. სხვა რიცხვი ავტომატურად ამ ფარგლებში ჩაიწერება.",
      maxPeriodCapNotice: "მაქს. გამოყენებისას ადმინის ჭერია €{n}. მეტი ავტომატურად ჩაიწერება €{n}-ად.",
      freeLocked: "უფასო სერვისი — დღიური ფასის დაწესება შეუძლებელია",
      periodFreeHint: "ადმინმა მაქს. პერიოდი €0 მიუთითა — სერვისი უფასოა. შეგიძლიათ ჩართოთ ან გამორთოთ.",
      dailyZeroHint: "დღიური 0: ცხრილში ჩანს €0, მინ/მაქს — ტირეები (უფუნქციო).",
      adminCap: "ადმინის მაქს. €{n}",
      adminDailyCap: "ადმინის ზღვარი €{min}–€{max}",
      adminDailyMaxOnly: "ადმინის მაქს. €{n}",
      adminNoCap: "ზღვარი არ არის",
      mandatoryFree: "უფასო · სავალდებულო შეთავაზება",
      mandatoryPriced: "სავალდებულო შეთავაზება",
      mandatoryBadge: "სავალდებულო",
      setPrice: "ფასის დაწესება",
      mandatoryLockedTitle: "ადმინისტრატორმა სერვისი სავალდებულოდ მონიშნა — გამორთვა ან შეცვლა შეუძლებელია",
      mandatoryPricedHint:
        "ადმინის მიერ სავალდებულოა — სერვისი ყოველთვის ჩართულია. 0 = მომხმარებლისთვის უფასო, ან დააწესეთ ფასი ლიმიტამდე.",
      nameRequired: "ჩაწერეთ სახელი",
      carsRequired: "აირჩიეთ მინიმუმ ერთი მანქანა",
      activeTitle: "თქვენი მომსახურებები",
      inactiveTitle: "არააქტიური მომსახურებები",
      inactiveHint:
        "დააჭირეთ „დამატება“ — მომსახურება გამოჩნდება თქვენს სიაში, მანქანის განცხადებაში და მომხმარებლისთვის.",
      addOne: "დამატება",
      allAdded: "ყველა მომსახურება უკვე დამატებულია.",
      createNew: "+ ახალი მომსახურების შექმნა",
      remove: "სიიდან ამოღება",
      removeConfirm: "ამოვიღოთ ეს მომსახურება სიიდან? ის აღარ გამოჩნდება თქვენს მანქანებზე.",
      close: "დახურვა",
    };
  }
  if (locale === "ru") {
    return {
      colService: "Оборудование и услуги",
      colPrice: "Цена в день",
      colMin: "Мин. при выборе",
      colMax: "Макс. за аренду",
      dailyHint: "Цена за один день. Сумма считается по числу выбранных дней.",
      minHint: "При выборе услуги сумма не будет ниже этого.",
      maxHint: "Сколько бы дней ни было, сумма не превысит это.",
      boundsError: "Минимум не может быть больше максимума.",
      colCars: "Автомобили",
      edit: "Изменить",
      add: "+ Добавить",
      save: "Сохранить",
      saving: "Сохранение…",
      saved: "Сохранено",
      back: "Назад",
      settings: "Настройки",
      cars: "Автомобили",
      selectAll: "Выбрать все",
      reset: "Сбросить",
      free: "Бесплатно",
      status: "Статус",
      on: "Включено",
      forbidden: "Запрещено",
      off: "Выключено",
      done: "Готово",
      insuranceGroup: "Страховка",
      name: "Название",
      description: "Описание",
      delete: "Удалить",
      deleteConfirm: "Удалить эту услугу? Она больше не будет показываться на ваших машинах.",
      deleteFailed: "Не удалось удалить услугу.",
      breadcrumb: "Доп. услуги",
      empty: "Услуг пока нет.",
      carsCount: "{n} авто",
      help: "Укажите цену за день, минимум при выборе и максимум за аренду. Сумма = цена × дни, затем пол до минимума и потолок до максимума. Дневной 0 → в таблице €0, мин/макс — тире.",
      maxCapNotice: "Максимальная стоимость этой услуги — €{n}",
      dailyRangeNotice: "Дневная цена может быть от €{min} до €{max}. Другое число запишется в эти границы.",
      maxPeriodCapNotice: "Максимум администратора за аренду — €{n}. Большая сумма запишется как €{n}.",
      freeLocked: "Бесплатная услуга — дневную цену задать нельзя",
      periodFreeHint: "Админ указал макс. период €0 — услуга бесплатна. Можно включить или выключить.",
      dailyZeroHint: "Дневной 0: в таблице €0, мин/макс — тире (неактивны).",
      adminCap: "макс. админа €{n}",
      adminDailyCap: "лимит админа €{min}–€{max}",
      adminDailyMaxOnly: "макс. админа €{n}",
      adminNoCap: "лимита нет",
      mandatoryFree: "Бесплатно · обязательное предложение",
      mandatoryPriced: "Обязательное предложение",
      mandatoryBadge: "Обязательно",
      setPrice: "Указать цену",
      mandatoryLockedTitle: "Администратор сделал услугу обязательной — отключить или изменить нельзя",
      mandatoryPricedHint:
        "Обязательно по решению админа — услуга всегда включена. 0 = бесплатно для клиента, или задайте цену до лимита.",
      nameRequired: "Укажите название",
      carsRequired: "Выберите хотя бы один автомобиль",
      activeTitle: "Ваши услуги",
      inactiveTitle: "Неактивные услуги",
      inactiveHint: "Нажмите «Добавить» — услуга появится в вашем списке, в объявлении авто и для клиента.",
      addOne: "Добавить",
      allAdded: "Все услуги уже добавлены.",
      createNew: "+ Создать новую услугу",
      remove: "Убрать из списка",
      removeConfirm: "Убрать эту услугу из списка? Она больше не будет показываться на ваших машинах.",
      close: "Закрыть",
    };
  }
  return {
    colService: "Equipment and services",
    colPrice: "Price per day",
    colMin: "Min when selected",
    colMax: "Max for the rental",
    dailyHint: "Price for one day. The total is this price times the number of days.",
    minHint: "When the service is selected, the total will not go below this.",
    maxHint: "However many days are chosen, the total will not go above this.",
    boundsError: "The minimum cannot be higher than the maximum.",
    colCars: "Cars",
    edit: "Edit",
    add: "+ Add",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    back: "Back",
    settings: "Settings",
    cars: "Cars",
    selectAll: "Select all",
    reset: "Reset",
    free: "Free",
    status: "Status",
    on: "On",
    forbidden: "Forbidden",
    off: "Off",
    done: "Done",
    insuranceGroup: "Insurance",
    name: "Name",
    description: "Description",
    delete: "Delete",
    deleteConfirm: "Delete this service? It will no longer show on your cars.",
    deleteFailed: "Could not delete the service.",
    breadcrumb: "Additional equipment and services",
    empty: "No services yet.",
    carsCount: "{n} cars",
    help: "Set the daily price, a minimum when selected, and a maximum for the rental. Total = daily × days, then raise to the minimum and cap at the maximum. Daily 0 → table shows €0 and dashes for min/max.",
    maxCapNotice: "Maximum price for this service is €{n}",
    dailyRangeNotice: "Daily price can be €{min} to €{max}. Any other amount is saved inside that range.",
    maxPeriodCapNotice: "Admin maximum for the rental is €{n}. A higher amount is saved as €{n}.",
    freeLocked: "Free service — daily price is locked",
    periodFreeHint: "Admin set period max to €0 — this service is free. You can turn it on or off.",
    dailyZeroHint: "Daily 0: table shows €0; min/max show dashes (inactive).",
    adminCap: "admin max €{n}",
    adminDailyCap: "admin limit €{min}–€{max}",
    adminDailyMaxOnly: "admin max €{n}",
    adminNoCap: "no limit",
    mandatoryFree: "Free · mandatory offer",
    mandatoryPriced: "Mandatory offer",
    mandatoryBadge: "Mandatory",
    setPrice: "Set price",
    mandatoryLockedTitle: "The admin made this service mandatory — it cannot be turned off or changed",
    mandatoryPricedHint:
      "Mandatory by admin — this service is always on. 0 = free for the customer, or set a price up to the limit.",
    nameRequired: "Enter a name",
    carsRequired: "Select at least one car",
    activeTitle: "Your services",
    inactiveTitle: "Inactive services",
    inactiveHint: "Press “Add” — the service appears in your list, on your car listings and for customers.",
    addOne: "Add",
    allAdded: "Every service is already added.",
    createNew: "+ Create a new service",
    remove: "Remove from list",
    removeConfirm: "Remove this service from your list? It will no longer show on your cars.",
    close: "Close",
  };
}

/** English source strings of the car picker on this page. */
export const EQUIPMENT_PICKER_EN = {
  cars: "Cars",
  selectAll: "Select all",
  reset: "Reset",
  selected: "selected",
  hint: "Select cars this service should apply to.",
  other: "Other",
  noCars: "Upload car listings first — they will appear here.",
} as const;

/** Text for a locale without its own copy above: this page's translations, then the shared phrase table. */
export function equipmentText(locale: string, english: string): string {
  const saved = EQUIPMENT_PANEL_I18N[english]?.[locale as keyof (typeof EQUIPMENT_PANEL_I18N)[string]];
  if (saved?.trim()) return saved;
  return knownText(locale, english);
}

export type EquipmentPanelCopy = ReturnType<typeof baseCopy>;

export function equipmentPanelCopy(locale: string): EquipmentPanelCopy {
  const copy = baseCopy(locale);
  if (locale === "en" || locale === "ka" || locale === "ru") return copy;
  const next = { ...copy };
  for (const key of Object.keys(next) as (keyof EquipmentPanelCopy)[]) {
    next[key] = equipmentText(locale, copy[key]);
  }
  return next;
}

/** Every English string that needs a translation for the other site languages. */
export function equipmentEnglishStrings(): string[] {
  return [...new Set([...Object.values(baseCopy("en")), ...Object.values(EQUIPMENT_PICKER_EN)])];
}
