"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CarsSearchTripEditor } from "@/components/cars/cars-search-trip-editor";
import { SEARCH_EXTRA } from "@/components/cars/cars-search-locale-copy";
import type { SearchAirportOption } from "@/components/search/airport-search";
import {
  Calendar,
  Check,
  Leaf,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Star,
  Users,
  Briefcase,
  Car,
  X,
} from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { useBusinessPartnerReferralDiscount } from "@/components/business/use-business-partner-referral-discount";
import { parseCarDetails } from "@/lib/cars/car-details";
import { listingDailyWithDeliveryEur, rentalDayCount } from "@/lib/cars/reserve-pricing";
import { findSearchPlace, isCityLocationCode } from "@/lib/catalog/search-places";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import {
  countListingsForBrand,
  countListingsForCategory,
  countListingsForDeposit,
  countListingsForDrive,
  countListingsForExtra,
  countListingsForFuel,
  countListingsForRentPayment,
  countListingsForSeats,
  countListingsForTransmission,
  filterListings,
  newCarsMinYear,
  resolveEffectiveCategorySlug,
  resolveListingDrive,
  uniqueListingBrands,
  type DepositFilterOption,
  type DriveFilterOption,
  type ListingFilterState,
  type RentPaymentFilterOption,
} from "@/lib/cars/listing-filter-match";
import { cn, toNumber } from "@/lib/utils";

export type SearchResultCar = {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  seats: number;
  doors: number;
  transmission: string;
  fuelType: string;
  dailyRateEur: number;
  discountPercent: number;
  description: string;
  categorySlug: string | null;
  categoryLabel: string | null;
  photos: string[];
  partnerName: string;
  deliveryFeeEur: number;
  pickupDeliveryFeeEur?: number;
  dropoffDeliveryFeeEur?: number;
  depositEur: number | null;
  cardRequired?: boolean;
  depositMethods?: string[];
  rentPaymentMethods?: string[];
  noDepositPaidService?: boolean;
  extraServiceIds?: string[];
  minDriverAge?: number;
  minLicenseYears?: number;
};

export type SearchFilterCategory = {
  slug: string;
  name: string;
  imageUrl: string;
  mappedModels?: MappedCarModel[];
};

export type SearchFilterExtra = {
  id: string;
  slug: string;
  name: string;
};

type QuickFilter = "new2020" | "noDeposit";

type DraftFilters = {
  categories: Set<string>;
  transmission: Set<"AUTOMATIC" | "MANUAL">;
  fuel: Set<string>;
  depositOptions: Set<DepositFilterOption>;
  rentPaymentOptions: Set<RentPaymentFilterOption>;
  driveOptions: Set<DriveFilterOption>;
  extraOptions: Set<string>;
  brand: string;
  seatOptions: Set<string>;
  driverAge: string;
  licenseYears: string;
  yearFrom: string;
  priceMin: string;
  priceMax: string;
};

const COPY: Record<
  string,
  {
    carsAvailable: string;
    searchPlaceholder: string;
    allYears: string;
    newCars: string;
    familySuv: string;
    noDeposit: string;
    awd: string;
    premium: string;
    allBrands: string;
    priceLowHigh: string;
    priceHighLow: string;
    filters: string;
    dailyPrice: string;
    totalPrice: string;
    delivery: string;
    includesDelivery: string;
    pickupDelivery: string;
    dropoffDelivery: string;
    bookNow: string;
    view: string;
    totalForDays: string;
    payOnSite: string;
    showDetails: string;
    days: string;
    daysWord: string;
    perDay: string;
    exclusiveDeal: string;
    pickup: string;
    dropoff: string;
    automatic: string;
    manual: string;
    hybrid: string;
    petrol: string;
    diesel: string;
    electric: string;
    seats: string;
    luggageSmall: string;
    luggageMedium: string;
    luggageLarge: string;
    lowDeposit: string;
    siteDiscount: string;
    freeDelivery: string;
    unlimitedMileage: string;
    freeInsurance: string;
    freeDeliveryShort: string;
    freeDeliveryCity: string;
    freeCancellation: string;
    minProtectionFree: string;
    carCategory: string;
    transmission: string;
    fuel: string;
    seatsLabel: string;
    seatOption: string;
    resetSeats: string;
    driveType: string;
    drive2wd: string;
    drive4x4: string;
    any: string;
    pricePerDay: string;
    yearFrom: string;
    resetFilters: string;
    showCars: string;
    deposit: string;
    noDepositPaid: string;
    depositCash: string;
    depositCreditCard: string;
    rentPayment: string;
    rentPayCash: string;
    rentPayCard: string;
    driverAgeLabel: string;
    licenseYearsLabel: string;
    licenseYearsPlus: string;
    extrasLabel: string;
    crossBorderLabel: string;
    crossBorderOption: string;
    min: string;
    max: string;
    close: string;
  }
> = {
  en: {
    carsAvailable: "{n} cars available",
    searchPlaceholder: "All brands",
    allYears: "All years",
    newCars: "New cars {year}+",
    familySuv: "Family SUVs",
    noDeposit: "No deposit",
    awd: "4x4 (AWD/4WD)",
    premium: "Premium cars",
    allBrands: "All brands",
    priceLowHigh: "Price: Low to High",
    priceHighLow: "Price: High to Low",
    filters: "Filters",
    dailyPrice: "Price per day:",
    totalPrice: "Total price ({n} days)",
    delivery: "Delivery / return",
    includesDelivery: "Includes delivery",
    pickupDelivery: "Pickup delivery",
    dropoffDelivery: "Return delivery",
    bookNow: "Book now",
    view: "View >",
    totalForDays: "{price} for {n} days",
    payOnSite: "Pay on site",
    showDetails: "Show details",
    days: "days",
    daysWord: "days",
    perDay: "/day",
    exclusiveDeal: "Discount",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    automatic: "Automatic",
    manual: "Manual",
    hybrid: "Hybrid",
    petrol: "Petrol",
    diesel: "Diesel",
    electric: "Electric",
    seats: "{n} seats",
    luggageSmall: "Small",
    luggageMedium: "Medium",
    luggageLarge: "Large",
    lowDeposit: "Low deposit",
    siteDiscount: "Site discount {n}%",
    freeDelivery: "Free delivery",
    unlimitedMileage: "Unlimited mileage",
    freeInsurance: "Free insurance",
    freeDeliveryShort: "Free delivery",
    freeDeliveryCity: "within the city",
    freeCancellation: "Free cancellation",
    minProtectionFree: "Min. protection free",
    carCategory: "Car category",
    transmission: "Transmission",
    fuel: "Engine",
    seatsLabel: "Number of seats",
    seatOption: "{n} seats",
    resetSeats: "Reset",
    driveType: "Drivetrain",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "Any",
    pricePerDay: "Daily price",
    yearFrom: "Year from",
    resetFilters: "Reset all filters",
    showCars: "Show {n} cars",
    deposit: "Deposit",
    noDepositPaid: "Without deposit (paid service)",
    depositCash: "Cash",
    depositCreditCard: "Credit card",
    rentPayment: "Rent payment",
    rentPayCash: "Cash",
    rentPayCard: "Card",
    driverAgeLabel: "Driver's age, years",
    licenseYearsLabel: "Driving experience, years",
    licenseYearsPlus: "10+",
    extrasLabel: "Additional services",
    crossBorderLabel: "Border crossing",
    crossBorderOption: "Cars allowed to cross the border",
    min: "Min",
    max: "Max",
    close: "Close",
  },
  ka: {
    carsAvailable: "{n} მანქანები ხელმისაწვდომია",
    searchPlaceholder: "ყველა მარკა",
    allYears: "ყველა წელი",
    newCars: "ახალი მანქანები {year}+",
    familySuv: "საოჯახო SUV-ები",
    noDeposit: "დეპოზიტის გარეშე",
    awd: "4x4 (AWD/4WD)",
    premium: "პრემიუმ მანქანები",
    allBrands: "ყველა მარკა",
    priceLowHigh: "ფასი: დაბლიდან მაღლა",
    priceHighLow: "ფასი: მაღლიდან დაბლა",
    filters: "ფილტრები",
    dailyPrice: "ფასი დღეში:",
    totalPrice: "სრული ფასი ({n} დღეები)",
    delivery: "მოწოდება /დაბრუნება",
    includesDelivery: "მოიცავს მიწოდებას",
    pickupDelivery: "აღების მიწოდება",
    dropoffDelivery: "დაბრუნების მიწოდება",
    bookNow: "დაჯავშნე ახლა",
    view: "ნახვა >",
    totalForDays: "{price} · {n} დღე",
    payOnSite: "გადაიხდით ადგილზე",
    showDetails: "დეტალები",
    days: "დღე",
    daysWord: "დღეები",
    perDay: "/დღე",
    exclusiveDeal: "ფასდაკლება",
    pickup: "აღება",
    dropoff: "დაბრუნება",
    automatic: "ავტომატური",
    manual: "მექანიკა",
    hybrid: "ჰიბრიდი",
    petrol: "ბენზინი",
    diesel: "დიზელი",
    electric: "ელექტრო",
    seats: "{n} ადგილები",
    luggageSmall: "პატარა",
    luggageMedium: "საშუალო",
    luggageLarge: "დიდი",
    lowDeposit: "დაბალი დეპოზიტი",
    siteDiscount: "საიტის ფასდაკლება {n}%",
    freeDelivery: "უფასო მიწოდება",
    unlimitedMileage: "ულიმიტო გარბენი",
    freeInsurance: "უფასო დაზღვევა",
    freeDeliveryShort: "უფასო მიწოდება",
    freeDeliveryCity: "ქალაქში",
    freeCancellation: "უფასო გაუქმება",
    minProtectionFree: "მინ. დაცვა უფასოდ",
    carCategory: "მანქანის კატეგორია",
    transmission: "გადაცემათა კოლოფი",
    fuel: "ძრავა",
    seatsLabel: "ადგილების რაოდენობა",
    seatOption: "{n} ადგილი",
    resetSeats: "გადატვირთვა",
    driveType: "მანქანით მგზავრობა",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "ნებისმიერი",
    pricePerDay: "დღიური ღირებულება",
    yearFrom: "წარმოების წელი",
    resetFilters: "ყველა ფილტრის გადაყენება",
    showCars: "{n} მანქანის ნახვა",
    deposit: "დეპოზიტი",
    noDepositPaid: "დეპოზიტის გარეშე (ფასიანი მომსახურება)",
    depositCash: "ნაღდი ფული",
    depositCreditCard: "საკრედიტო ბარათი",
    rentPayment: "ქირის გადახდა",
    rentPayCash: "ნაღდი ფული",
    rentPayCard: "ბარათი",
    driverAgeLabel: "მძღოლის ასაკი, წლები",
    licenseYearsLabel: "მართვის გამოცდილება, წლები",
    licenseYearsPlus: "10+",
    extrasLabel: "დამატებითი მომსახურება",
    crossBorderLabel: "საზღვრის გადაკვეთა",
    crossBorderOption: "საზღვრის გადაკვეთის ნებართვის მქონე მანქანები",
    min: "მინ",
    max: "მაქს",
    close: "დახურვა",
  },
  ru: {
    carsAvailable: "{n} авто доступно",
    searchPlaceholder: "Все марки",
    allYears: "Все годы",
    newCars: "Новые {year}+",
    familySuv: "Семейные SUV",
    noDeposit: "Без депозита",
    awd: "4x4 (AWD/4WD)",
    premium: "Премиум",
    allBrands: "Все марки",
    priceLowHigh: "Цена: по возрастанию",
    priceHighLow: "Цена: по убыванию",
    filters: "Фильтры",
    dailyPrice: "Цена за день:",
    totalPrice: "Итого ({n} дн.)",
    delivery: "Доставка / возврат",
    includesDelivery: "Включает доставку",
    pickupDelivery: "Доставка при получении",
    dropoffDelivery: "Доставка при возврате",
    bookNow: "Забронировать",
    view: "Смотреть >",
    totalForDays: "{price} за {n} дн.",
    payOnSite: "Оплата на месте",
    showDetails: "Подробнее",
    days: "дн.",
    daysWord: "дней",
    perDay: "/день",
    exclusiveDeal: "Скидка",
    pickup: "Получение",
    dropoff: "Возврат",
    automatic: "Автомат",
    manual: "Механика",
    hybrid: "Гибрид",
    petrol: "Бензин",
    diesel: "Дизель",
    electric: "Электро",
    seats: "{n} мест",
    luggageSmall: "Малый",
    luggageMedium: "Средний",
    luggageLarge: "Большой",
    lowDeposit: "Низкий депозит",
    siteDiscount: "Скидка сайта {n}%",
    freeDelivery: "Бесплатная доставка",
    unlimitedMileage: "Пробег без ограничений",
    freeInsurance: "Бесплатная страховка",
    freeDeliveryShort: "Бесплатная доставка",
    freeDeliveryCity: "по городу",
    freeCancellation: "Бесплатная отмена",
    minProtectionFree: "Мин. защита бесплатно",
    carCategory: "Категория автомобиля",
    transmission: "КПП",
    fuel: "Двигатель",
    seatsLabel: "Количество мест",
    seatOption: "{n} мест",
    resetSeats: "Сбросить",
    driveType: "Привод",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "Любой",
    pricePerDay: "Цена за день",
    yearFrom: "Год от",
    resetFilters: "Сбросить все фильтры",
    showCars: "Показать {n} авто",
    deposit: "Депозит",
    noDepositPaid: "Без депозита (платная услуга)",
    depositCash: "Наличные",
    depositCreditCard: "Кредитная карта",
    rentPayment: "Оплата аренды",
    rentPayCash: "Наличные",
    rentPayCard: "Карта",
    driverAgeLabel: "Возраст водителя, лет",
    licenseYearsLabel: "Водительский стаж, лет",
    licenseYearsPlus: "10+",
    extrasLabel: "Дополнительные услуги",
    crossBorderLabel: "Пересечение границы",
    crossBorderOption: "Авто с разрешением на выезд за границу",
    min: "Мин",
    max: "Макс",
    close: "Закрыть",
  },
  fr: {
    carsAvailable: "{n} voitures disponibles",
    searchPlaceholder: "Toutes les marques",
    allYears: "Toutes les années",
    newCars: "Voitures neuves {year}+",
    familySuv: "SUV familiaux",
    noDeposit: "Sans caution",
    awd: "4x4 (AWD/4WD)",
    premium: "Voitures premium",
    allBrands: "Toutes les marques",
    priceLowHigh: "Prix : croissant",
    priceHighLow: "Prix : décroissant",
    filters: "Filtres",
    dailyPrice: "Prix par jour :",
    totalPrice: "Prix total ({n} jours)",
    delivery: "Livraison / retour",
    includesDelivery: "Livraison incluse",
    pickupDelivery: "Livraison à la prise en charge",
    dropoffDelivery: "Livraison au retour",
    bookNow: "Réserver",
    view: "Voir >",
    totalForDays: "{price} pour {n} jours",
    payOnSite: "Payer sur place",
    showDetails: "Voir les détails",
    days: "jours",
    daysWord: "jours",
    perDay: "/jour",
    exclusiveDeal: "Remise",
    pickup: "Prise en charge",
    dropoff: "Retour",
    automatic: "Automatique",
    manual: "Manuelle",
    hybrid: "Hybride",
    petrol: "Essence",
    diesel: "Diesel",
    electric: "Électrique",
    seats: "{n} places",
    luggageSmall: "Petit",
    luggageMedium: "Moyen",
    luggageLarge: "Grand",
    lowDeposit: "Caution faible",
    siteDiscount: "Remise du site {n}%",
    freeDelivery: "Livraison gratuite",
    unlimitedMileage: "Kilométrage illimité",
    freeInsurance: "Assurance gratuite",
    freeDeliveryShort: "Livraison gratuite",
    freeDeliveryCity: "en ville",
    freeCancellation: "Annulation gratuite",
    minProtectionFree: "Protection min. offerte",
    carCategory: "Catégorie de voiture",
    transmission: "Transmission",
    fuel: "Moteur",
    seatsLabel: "Nombre de places",
    seatOption: "{n} places",
    resetSeats: "Réinitialiser",
    driveType: "Transmission",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "Tous",
    pricePerDay: "Prix journalier",
    yearFrom: "Année à partir de",
    resetFilters: "Réinitialiser tous les filtres",
    showCars: "Afficher {n} voitures",
    deposit: "Caution",
    noDepositPaid: "Sans caution (service payant)",
    depositCash: "Espèces",
    depositCreditCard: "Carte de crédit",
    rentPayment: "Paiement de la location",
    rentPayCash: "Espèces",
    rentPayCard: "Carte",
    driverAgeLabel: "Âge du conducteur, ans",
    licenseYearsLabel: "Expérience de conduite, ans",
    licenseYearsPlus: "10+",
    extrasLabel: "Services supplémentaires",
    crossBorderLabel: "Passage de frontière",
    crossBorderOption: "Véhicules autorisés à passer la frontière",
    min: "Min",
    max: "Max",
    close: "Fermer",
  },
  de: {
    carsAvailable: "{n} Autos verfügbar",
    searchPlaceholder: "Alle Marken",
    allYears: "Alle Jahre",
    newCars: "Neue Autos {year}+",
    familySuv: "Familien-SUVs",
    noDeposit: "Ohne Kaution",
    awd: "4x4 (AWD/4WD)",
    premium: "Premium-Autos",
    allBrands: "Alle Marken",
    priceLowHigh: "Preis: aufsteigend",
    priceHighLow: "Preis: absteigend",
    filters: "Filter",
    dailyPrice: "Preis pro Tag:",
    totalPrice: "Gesamtpreis ({n} Tage)",
    delivery: "Lieferung / Rückgabe",
    includesDelivery: "Inklusive Lieferung",
    pickupDelivery: "Lieferung bei Abholung",
    dropoffDelivery: "Lieferung bei Rückgabe",
    bookNow: "Jetzt buchen",
    view: "Ansehen >",
    totalForDays: "{price} für {n} Tage",
    payOnSite: "Vor Ort zahlen",
    showDetails: "Details anzeigen",
    days: "Tage",
    daysWord: "Tage",
    perDay: "/Tag",
    exclusiveDeal: "Rabatt",
    pickup: "Abholung",
    dropoff: "Rückgabe",
    automatic: "Automatik",
    manual: "Schaltgetriebe",
    hybrid: "Hybrid",
    petrol: "Benzin",
    diesel: "Diesel",
    electric: "Elektro",
    seats: "{n} Sitze",
    luggageSmall: "Klein",
    luggageMedium: "Mittel",
    luggageLarge: "Groß",
    lowDeposit: "Niedrige Kaution",
    siteDiscount: "Website-Rabatt {n}%",
    freeDelivery: "Kostenlose Lieferung",
    unlimitedMileage: "Unbegrenzte Kilometer",
    freeInsurance: "Kostenlose Versicherung",
    freeDeliveryShort: "Kostenlose Lieferung",
    freeDeliveryCity: "in der Stadt",
    freeCancellation: "Kostenlose Stornierung",
    minProtectionFree: "Min. Schutz kostenlos",
    carCategory: "Fahrzeugkategorie",
    transmission: "Getriebe",
    fuel: "Motor",
    seatsLabel: "Anzahl der Sitze",
    seatOption: "{n} Sitze",
    resetSeats: "Zurücksetzen",
    driveType: "Antrieb",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "Beliebig",
    pricePerDay: "Tagespreis",
    yearFrom: "Jahr ab",
    resetFilters: "Alle Filter zurücksetzen",
    showCars: "{n} Autos anzeigen",
    deposit: "Kaution",
    noDepositPaid: "Ohne Kaution (kostenpflichtig)",
    depositCash: "Bargeld",
    depositCreditCard: "Kreditkarte",
    rentPayment: "Mietzahlung",
    rentPayCash: "Bargeld",
    rentPayCard: "Karte",
    driverAgeLabel: "Alter des Fahrers, Jahre",
    licenseYearsLabel: "Fahrerfahrung, Jahre",
    licenseYearsPlus: "10+",
    extrasLabel: "Zusätzliche Leistungen",
    crossBorderLabel: "Grenzübertritt",
    crossBorderOption: "Fahrzeuge mit Grenzübertrittserlaubnis",
    min: "Min",
    max: "Max",
    close: "Schließen",
  },
  pl: {
    carsAvailable: "{n} dostępnych aut",
    searchPlaceholder: "Wszystkie marki",
    allYears: "Wszystkie lata",
    newCars: "Nowe auta {year}+",
    familySuv: "Rodzinne SUV-y",
    noDeposit: "Bez depozytu",
    awd: "4x4 (AWD/4WD)",
    premium: "Auta premium",
    allBrands: "Wszystkie marki",
    priceLowHigh: "Cena: rosnąco",
    priceHighLow: "Cena: malejąco",
    filters: "Filtry",
    dailyPrice: "Cena za dzień:",
    totalPrice: "Cena całkowita ({n} dni)",
    delivery: "Dostawa / zwrot",
    includesDelivery: "Zawiera dostawę",
    pickupDelivery: "Dostawa przy odbiorze",
    dropoffDelivery: "Dostawa przy zwrocie",
    bookNow: "Zarezerwuj",
    view: "Zobacz >",
    totalForDays: "{price} za {n} dni",
    payOnSite: "Płatność na miejscu",
    showDetails: "Pokaż szczegóły",
    days: "dni",
    daysWord: "dni",
    perDay: "/dzień",
    exclusiveDeal: "Zniżka",
    pickup: "Odbiór",
    dropoff: "Zwrot",
    automatic: "Automatyczna",
    manual: "Manualna",
    hybrid: "Hybryda",
    petrol: "Benzyna",
    diesel: "Diesel",
    electric: "Elektryczny",
    seats: "{n} miejsc",
    luggageSmall: "Mały",
    luggageMedium: "Średni",
    luggageLarge: "Duży",
    lowDeposit: "Niski depozyt",
    siteDiscount: "Rabat serwisu {n}%",
    freeDelivery: "Bezpłatna dostawa",
    unlimitedMileage: "Bez limitu kilometrów",
    freeInsurance: "Bezpłatne ubezpieczenie",
    freeDeliveryShort: "Bezpłatna dostawa",
    freeDeliveryCity: "w mieście",
    freeCancellation: "Bezpłatne anulowanie",
    minProtectionFree: "Min. ochrona gratis",
    carCategory: "Kategoria auta",
    transmission: "Skrzynia biegów",
    fuel: "Silnik",
    seatsLabel: "Liczba miejsc",
    seatOption: "{n} miejsc",
    resetSeats: "Resetuj",
    driveType: "Napęd",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "Dowolny",
    pricePerDay: "Cena dzienna",
    yearFrom: "Rok od",
    resetFilters: "Resetuj wszystkie filtry",
    showCars: "Pokaż {n} aut",
    deposit: "Depozyt",
    noDepositPaid: "Bez depozytu (usługa płatna)",
    depositCash: "Gotówka",
    depositCreditCard: "Karta kredytowa",
    rentPayment: "Płatność za wynajem",
    rentPayCash: "Gotówka",
    rentPayCard: "Karta",
    driverAgeLabel: "Wiek kierowcy, lata",
    licenseYearsLabel: "Doświadczenie jazdy, lata",
    licenseYearsPlus: "10+",
    extrasLabel: "Dodatkowe usługi",
    crossBorderLabel: "Przekraczanie granicy",
    crossBorderOption: "Samochody z pozwoleniem na przekroczenie granicy",
    min: "Min",
    max: "Max",
    close: "Zamknij",
  },
  ar: {
    carsAvailable: "{n} سيارات متاحة",
    searchPlaceholder: "جميع العلامات",
    allYears: "جميع السنوات",
    newCars: "سيارات جديدة {year}+",
    familySuv: "SUV عائلية",
    noDeposit: "بدون تأمين",
    awd: "4x4 (AWD/4WD)",
    premium: "سيارات فاخرة",
    allBrands: "جميع العلامات",
    priceLowHigh: "السعر: من الأقل للأعلى",
    priceHighLow: "السعر: من الأعلى للأقل",
    filters: "فلاتر",
    dailyPrice: "السعر لليوم:",
    totalPrice: "السعر الإجمالي ({n} أيام)",
    delivery: "التوصيل / الإرجاع",
    includesDelivery: "يشمل التوصيل",
    pickupDelivery: "توصيل الاستلام",
    dropoffDelivery: "توصيل الإرجاع",
    bookNow: "احجز الآن",
    view: "عرض >",
    totalForDays: "{price} لمدة {n} أيام",
    payOnSite: "الدفع في الموقع",
    showDetails: "عرض التفاصيل",
    days: "أيام",
    daysWord: "أيام",
    perDay: "/يوم",
    exclusiveDeal: "خصم",
    pickup: "الاستلام",
    dropoff: "الإرجاع",
    automatic: "أوتوماتيك",
    manual: "يدوي",
    hybrid: "هجين",
    petrol: "بنزين",
    diesel: "ديزل",
    electric: "كهربائي",
    seats: "{n} مقاعد",
    luggageSmall: "صغير",
    luggageMedium: "متوسط",
    luggageLarge: "كبير",
    lowDeposit: "تأمين منخفض",
    siteDiscount: "خصم الموقع {n}%",
    freeDelivery: "توصيل مجاني",
    unlimitedMileage: "كيلومترات غير محدودة",
    freeInsurance: "تأمين مجاني",
    freeDeliveryShort: "توصيل مجاني",
    freeDeliveryCity: "داخل المدينة",
    freeCancellation: "إلغاء مجاني",
    minProtectionFree: "حماية أساسية مجاناً",
    carCategory: "فئة السيارة",
    transmission: "ناقل الحركة",
    fuel: "المحرك",
    seatsLabel: "عدد المقاعد",
    seatOption: "{n} مقاعد",
    resetSeats: "إعادة تعيين",
    driveType: "نظام الدفع",
    drive2wd: "2WD",
    drive4x4: "4X4",
    any: "أي",
    pricePerDay: "السعر اليومي",
    yearFrom: "السنة من",
    resetFilters: "إعادة تعيين كل الفلاتر",
    showCars: "عرض {n} سيارات",
    deposit: "التأمين",
    noDepositPaid: "بدون تأمين (خدمة مدفوعة)",
    depositCash: "نقداً",
    depositCreditCard: "بطاقة ائتمان",
    rentPayment: "دفع الإيجار",
    rentPayCash: "نقداً",
    rentPayCard: "بطاقة",
    driverAgeLabel: "عمر السائق، سنوات",
    licenseYearsLabel: "خبرة القيادة، سنوات",
    licenseYearsPlus: "10+",
    extrasLabel: "خدمات إضافية",
    crossBorderLabel: "عبور الحدود",
    crossBorderOption: "سيارات مسموح لها بعبور الحدود",
    min: "الحد الأدنى",
    max: "الحد الأقصى",
    close: "إغلاق",
  },
};

function t(locale: string) {
  const base = COPY[locale] || COPY.en;
  const extra = SEARCH_EXTRA[locale];
  return extra ? ({ ...base, ...extra } as typeof base) : base;
}

function fuelLabel(fuel: string | null | undefined, copy: (typeof COPY)["en"]) {
  const u = String(fuel || "").toUpperCase();
  if (u.includes("HYBRID")) return copy.hybrid;
  if (u.includes("ELECTRIC") || u === "EV") return copy.electric;
  if (u.includes("DIESEL")) return copy.diesel;
  return copy.petrol;
}

function transmissionLabel(transmission: string | null | undefined, copy: (typeof COPY)["en"]) {
  return String(transmission || "").toUpperCase().includes("MANUAL") ? copy.manual : copy.automatic;
}

function luggageLabel(seats: number, copy: (typeof COPY)["en"]) {
  if (seats >= 7) return copy.luggageLarge;
  if (seats <= 2) return copy.luggageSmall;
  return copy.luggageMedium;
}

function isAwd(car: SearchResultCar) {
  return resolveListingDrive(car) === "4x4";
}

const SEAT_FILTER_OPTIONS = ["2", "4", "5", "6", "7", "8", "9"] as const;
const DRIVER_AGE_OPTIONS = Array.from({ length: 53 }, (_, i) => String(i + 18)); // 18–70
const LICENSE_YEARS_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;

function emptyDraft(): DraftFilters {
  return {
    categories: new Set(),
    transmission: new Set(),
    fuel: new Set(),
    depositOptions: new Set(),
    rentPaymentOptions: new Set(),
    driveOptions: new Set(),
    extraOptions: new Set(),
    brand: "",
    seatOptions: new Set(),
    driverAge: "",
    licenseYears: "",
    yearFrom: "",
    priceMin: "",
    priceMax: "",
  };
}

function cloneDraft(d: DraftFilters): DraftFilters {
  return {
    categories: new Set(d.categories),
    transmission: new Set(d.transmission),
    fuel: new Set(d.fuel),
    depositOptions: new Set(d.depositOptions),
    rentPaymentOptions: new Set(d.rentPaymentOptions),
    driveOptions: new Set(d.driveOptions),
    extraOptions: new Set(d.extraOptions),
    brand: d.brand,
    seatOptions: new Set(d.seatOptions),
    driverAge: d.driverAge,
    licenseYears: d.licenseYears,
    yearFrom: d.yearFrom,
    priceMin: d.priceMin,
    priceMax: d.priceMax,
  };
}

function toListingFilterState(
  draft: DraftFilters,
  query: string,
  brand: string,
  quick: Set<QuickFilter>,
  preferDraftBrand = false,
): ListingFilterState {
  const depositOptions = new Set(draft.depositOptions);
  if (quick.has("noDeposit")) depositOptions.add("none");
  const driveOptions = new Set(draft.driveOptions);
  const resolvedBrand = preferDraftBrand
    ? draft.brand || brand || undefined
    : brand || draft.brand || undefined;
  return {
    query,
    brand: resolvedBrand || undefined,
    categories: draft.categories,
    transmission: draft.transmission,
    fuel: draft.fuel,
    depositOptions,
    rentPaymentOptions: draft.rentPaymentOptions,
    driveOptions,
    seatOptions: draft.seatOptions,
    extraOptions: draft.extraOptions,
    driverAge: draft.driverAge || undefined,
    licenseYears: draft.licenseYears || undefined,
    yearFrom: draft.yearFrom || undefined,
    priceMin: draft.priceMin || undefined,
    priceMax: draft.priceMax || undefined,
    new2020: quick.has("new2020"),
    familySuv: false,
    awd: false,
    premium: false,
  };
}

export function CarsSearchResults({
  cars,
  categories = [],
  extrasCatalog = [],
  crossBorderFilter = null,
  searchOptions = [],
  startDate,
  endDate,
  pickup,
  dropoff,
  pickupAddress,
  dropoffAddress,
  category = "",
  country = "",
  emptyMessage,
  siteDiscountPercent = 0,
}: {
  /** ISO2 country scope when browsing a category without a pickup location. */
  country?: string;
  cars: SearchResultCar[];
  categories?: SearchFilterCategory[];
  extrasCatalog?: SearchFilterExtra[];
  crossBorderFilter?: { id: string; name: string } | null;
  searchOptions?: SearchAirportOption[];
  startDate: string;
  endDate: string;
  pickup: string;
  dropoff: string;
  pickupAddress: string;
  dropoffAddress: string;
  category?: string;
  emptyMessage: string;
  /** Admin site discount %; the larger of this and the partner promo applies (no stacking). */
  siteDiscountPercent?: number;
}) {
  const { locale, formatPrice, dictionary } = usePreferences();
  const { discountPercent: bpReferralDiscountPercent } = useBusinessPartnerReferralDiscount();
  const referralDiscountPercent = Math.max(bpReferralDiscountPercent, siteDiscountPercent);
  const c = t(locale);
  const days = rentalDayCount(startDate, endDate);
  const newCarsFromYear = newCarsMinYear();
  const newCarsLabel = c.newCars.replace("{year}", String(newCarsFromYear));

  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [quick, setQuick] = useState<Set<QuickFilter>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [seatsMenuOpen, setSeatsMenuOpen] = useState(false);
  const [applied, setApplied] = useState<DraftFilters>(() => emptyDraft());
  const [draft, setDraft] = useState<DraftFilters>(() => emptyDraft());

  useEffect(() => {
    if (!filtersOpen) {
      setSeatsMenuOpen(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const carsWithCategory = useMemo(
    () =>
      cars.map((car) => {
        const slug = resolveEffectiveCategorySlug(car, categories);
        if (!slug) return car;
        return {
          ...car,
          categorySlug: slug,
          categoryLabel: categories.find((c) => c.slug === slug)?.name || car.categoryLabel,
        };
      }),
    [cars, categories],
  );

  /** Brands present on partner listings in this search result set. */
  const brands = useMemo(() => uniqueListingBrands(carsWithCategory), [carsWithCategory]);

  const yearOptions = useMemo(() => {
    const years = carsWithCategory.map((car) => car.year).filter((y) => y > 1900);
    const min = years.length ? Math.min(...years) : 2010;
    const max = Math.max(new Date().getFullYear() + 1, ...years, min);
    const list: number[] = [];
    for (let y = max; y >= min; y -= 1) list.push(y);
    return list;
  }, [carsWithCategory]);

  const draftFilterState = useMemo(
    () => toListingFilterState(draft, "", brand, quick, true),
    [draft, brand, quick],
  );

  const appliedFilterState = useMemo(
    () => toListingFilterState(applied, "", brand || applied.brand, quick),
    [applied, brand, quick],
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      map.set(
        cat.slug,
        countListingsForCategory(carsWithCategory, cat.slug, draftFilterState, categories, days),
      );
    }
    return map;
  }, [carsWithCategory, categories, draftFilterState, days]);

  const transmissionCounts = useMemo(
    () => ({
      AUTOMATIC: countListingsForTransmission(
        carsWithCategory,
        "AUTOMATIC",
        draftFilterState,
        categories,
        days,
      ),
      MANUAL: countListingsForTransmission(
        carsWithCategory,
        "MANUAL",
        draftFilterState,
        categories,
        days,
      ),
    }),
    [carsWithCategory, draftFilterState, categories, days],
  );

  const fuelCounts = useMemo(() => {
    const keys = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
    const map = {} as Record<(typeof keys)[number], number>;
    for (const key of keys) {
      map[key] = countListingsForFuel(carsWithCategory, key, draftFilterState, categories, days);
    }
    return map;
  }, [carsWithCategory, draftFilterState, categories, days]);

  const depositCounts = useMemo(() => {
    const keys: DepositFilterOption[] = ["none", "nonePaid", "cash", "creditCard"];
    const map = {} as Record<DepositFilterOption, number>;
    for (const key of keys) {
      map[key] = countListingsForDeposit(carsWithCategory, key, draftFilterState, categories, days);
    }
    return map;
  }, [carsWithCategory, draftFilterState, categories, days]);

  const rentPaymentCounts = useMemo(
    () => ({
      cash: countListingsForRentPayment(carsWithCategory, "cash", draftFilterState, categories, days),
      card: countListingsForRentPayment(carsWithCategory, "card", draftFilterState, categories, days),
    }),
    [carsWithCategory, draftFilterState, categories, days],
  );

  const brandCounts = useMemo(() => {
    const withoutBrand = { ...draftFilterState, brand: undefined };
    const map: Record<string, number> = {};
    for (const b of brands) {
      map[b] = countListingsForBrand(carsWithCategory, b, withoutBrand, categories, days);
    }
    return map;
  }, [brands, carsWithCategory, draftFilterState, categories, days]);

  const driveCounts = useMemo(
    () => ({
      "2wd": countListingsForDrive(carsWithCategory, "2wd", draftFilterState, categories, days),
      "4x4": countListingsForDrive(carsWithCategory, "4x4", draftFilterState, categories, days),
    }),
    [carsWithCategory, draftFilterState, categories, days],
  );

  const seatCounts = useMemo(() => {
    const withoutSeats = { ...draftFilterState, seatOptions: new Set<string>(), seats: undefined };
    const map: Record<string, number> = {};
    for (const n of SEAT_FILTER_OPTIONS) {
      map[n] = countListingsForSeats(carsWithCategory, n, withoutSeats, categories, days);
    }
    return map;
  }, [carsWithCategory, draftFilterState, categories, days]);

  const extraCounts = useMemo(() => {
    const withoutExtras = { ...draftFilterState, extraOptions: new Set<string>() };
    const map: Record<string, number> = {};
    for (const extra of extrasCatalog) {
      map[extra.id] = countListingsForExtra(
        carsWithCategory,
        extra.id,
        withoutExtras,
        categories,
        days,
      );
    }
    if (crossBorderFilter?.id) {
      map[crossBorderFilter.id] = countListingsForExtra(
        carsWithCategory,
        crossBorderFilter.id,
        withoutExtras,
        categories,
        days,
      );
    }
    return map;
  }, [extrasCatalog, crossBorderFilter, carsWithCategory, draftFilterState, categories, days]);

  const activeFilterCount =
    (brand || applied.brand ? 1 : 0) +
    quick.size +
    applied.categories.size +
    applied.transmission.size +
    applied.fuel.size +
    applied.depositOptions.size +
    applied.rentPaymentOptions.size +
    applied.driveOptions.size +
    applied.seatOptions.size +
    applied.extraOptions.size +
    (applied.driverAge ? 1 : 0) +
    (applied.licenseYears ? 1 : 0) +
    (applied.yearFrom ? 1 : 0) +
    (applied.priceMin || applied.priceMax ? 1 : 0);

  const toggleQuick = (key: QuickFilter) => {
    setQuick((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openFilters = () => {
    setDraft(cloneDraft({ ...applied, brand: brand || applied.brand }));
    setSeatsMenuOpen(false);
    setFiltersOpen(true);
  };

  const previewCount = useMemo(() => {
    return filterListings(carsWithCategory, draftFilterState, categories, days).length;
  }, [carsWithCategory, draftFilterState, categories, days]);

  const filtered = useMemo(() => {
    const list = filterListings(carsWithCategory, appliedFilterState, categories, days);

    list.sort((a, b) => {
      const da = listingDailyWithDeliveryEur({
        dailyRateEur: a.dailyRateEur,
        days,
        pickupDeliveryFeeEur: a.pickupDeliveryFeeEur,
        dropoffDeliveryFeeEur: a.dropoffDeliveryFeeEur,
        deliveryFeeEur: a.deliveryFeeEur,
        details: parseCarDetails(a.description),
        discountPercent: a.discountPercent,
        referralDiscountPercent,
      }).displayDailyEur;
      const db = listingDailyWithDeliveryEur({
        dailyRateEur: b.dailyRateEur,
        days,
        pickupDeliveryFeeEur: b.pickupDeliveryFeeEur,
        dropoffDeliveryFeeEur: b.dropoffDeliveryFeeEur,
        deliveryFeeEur: b.deliveryFeeEur,
        details: parseCarDetails(b.description),
        discountPercent: b.discountPercent,
        referralDiscountPercent,
      }).displayDailyEur;
      return sort === "asc" ? da - db : db - da;
    });
    return list;
  }, [carsWithCategory, appliedFilterState, categories, days, sort, referralDiscountPercent]);

  const bookHref = (id: string) => {
    const params = new URLSearchParams({
      startDate: startDate || "",
      endDate: endDate || "",
      pickup: pickup || "",
      dropoff: dropoff || "",
    });
    if (pickupAddress) params.set("pickupAddress", pickupAddress);
    if (dropoffAddress) params.set("dropoffAddress", dropoffAddress);
    return `/cars/${id}?${params.toString()}`;
  };

  const toggleDraftCategory = (slug: string) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      if (next.categories.has(slug)) next.categories.delete(slug);
      else next.categories.add(slug);
      return next;
    });
  };

  const toggleDraftSet = <T extends string>(
    key:
      | "transmission"
      | "fuel"
      | "depositOptions"
      | "rentPaymentOptions"
      | "driveOptions"
      | "seatOptions"
      | "extraOptions",
    value: T,
  ) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      const set = next[key] as Set<T>;
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return next;
    });
  };

  const applyDraft = () => {
    setApplied(cloneDraft(draft));
    setBrand(draft.brand || "");
    setSeatsMenuOpen(false);
    setFiltersOpen(false);
  };

  const resetDraft = () => {
    const cleared = emptyDraft();
    setDraft(cleared);
    setApplied(cleared);
    setBrand("");
    setQuick(new Set());
  };

  return (
    <div className="min-h-screen bg-[#eef2f6]">
      <div className="mx-auto max-w-[1400px] space-y-3 px-3 py-4 sm:px-4 sm:py-5">
        <h1 className="text-lg font-extrabold tracking-tight text-[#0b1f4b] sm:text-xl">
          {dictionary.home.heading}
        </h1>
        {/* Editable trip summary */}
        <CarsSearchTripEditor
          options={searchOptions}
          pickup={pickup}
          dropoff={dropoff || pickup}
          startDate={startDate}
          endDate={endDate}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          category={category}
          country={country}
          filtersSlot={
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex h-[2.125rem] items-center gap-1.5 rounded-lg border border-sky-200/80 bg-[#e8f1fb] px-2.5 text-xs font-semibold text-slate-700 hover:bg-[#dceaf8]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {c.filters}
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1d6fe8] px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          }
        />

        {/* Filter row */}
        <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0 whitespace-nowrap rounded-md bg-[#1d6fe8] px-2 py-1 text-[11px] font-bold text-white shadow-sm">
            {c.carsAvailable.replace("{n}", String(filtered.length))}
          </div>

          <label className="relative w-[9.5rem] shrink-0 sm:w-[11rem]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <select
              value={brand}
              onChange={(e) => {
                const next = e.target.value;
                setBrand(next);
                setApplied((prev) => ({ ...cloneDraft(prev), brand: next }));
              }}
              aria-label={c.allBrands}
              className="w-full appearance-none rounded-md border border-slate-200 bg-white py-1 pl-6 pr-5 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#1d6fe8]"
            >
              <option value="">{c.allBrands}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              ▾
            </span>
          </label>

          <FilterPill
            active={!quick.has("new2020")}
            onClick={() =>
              setQuick((prev) => {
                const next = new Set(prev);
                next.delete("new2020");
                return next;
              })
            }
            icon={<Calendar className="h-3 w-3" />}
            label={c.allYears}
          />
          <FilterPill
            active={quick.has("new2020")}
            onClick={() => toggleQuick("new2020")}
            icon={<Star className="h-3 w-3" />}
            label={newCarsLabel}
          />
          <FilterPill
            active={quick.has("noDeposit")}
            onClick={() => toggleQuick("noDeposit")}
            icon={<Shield className="h-3 w-3" />}
            label={c.noDeposit}
          />

          {categories.map((cat) => (
            <FilterPill
              key={cat.slug}
              active={applied.categories.has(cat.slug)}
              onClick={() => {
                setApplied((prev) => {
                  const next = cloneDraft(prev);
                  if (next.categories.has(cat.slug)) next.categories.delete(cat.slug);
                  else next.categories.add(cat.slug);
                  return next;
                });
              }}
              icon={<Car className="h-3 w-3" />}
              label={cat.name}
            />
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "asc" | "desc")}
            className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
          >
            <option value="asc">{c.priceLowHigh}</option>
            <option value="desc">{c.priceHighLow}</option>
          </select>
        </div>

        {filtersOpen ? (
          <div
            className="fixed inset-0 z-[230] flex items-center justify-center bg-black/45 p-2 sm:p-3"
            onClick={() => setFiltersOpen(false)}
            role="presentation"
          >
            <div
              className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={c.filters}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-1.5 sm:px-4">
                <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Settings2 className="h-3.5 w-3.5 text-[#1d6fe8]" />
                  {c.filters}
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label={c.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 sm:px-4">
                <FilterFrame title={c.carCategory}>
                  <div className="flex flex-nowrap items-stretch gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.length === 0 ? (
                      <p className="text-xs text-slate-500">—</p>
                    ) : (
                      categories.map((cat) => {
                        const active = draft.categories.has(cat.slug);
                        const count = categoryCounts.get(cat.slug) || 0;
                        return (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() => toggleDraftCategory(cat.slug)}
                            className={cn(
                              "relative min-w-0 flex-1 overflow-hidden rounded-md border bg-[#f4f9fd] text-left transition",
                              active
                                ? "border-[#1d6fe8] bg-[#dceaf8] ring-1 ring-[#1d6fe8]/40"
                                : "border-sky-200/80 hover:border-[#1d6fe8]/50",
                            )}
                          >
                            <div className="h-7 bg-slate-100 sm:h-8">
                              {cat.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                  <Car className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-0.5 px-1 py-0.5">
                              <span
                                className="truncate text-[9px] font-semibold leading-tight text-slate-800"
                                title={cat.name}
                              >
                                {cat.name}
                              </span>
                              <FilterCount value={count} />
                            </div>
                            {active ? (
                              <span className="absolute right-0.5 top-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#1d6fe8] text-white">
                                <Check className="h-1.5 w-1.5" />
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </FilterFrame>

                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterFrame title={c.transmission}>
                    <div className="space-y-0.5">
                      {(
                        [
                          ["AUTOMATIC", c.automatic],
                          ["MANUAL", c.manual],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={filterOptionClass}
                        >
                          <input
                            type="checkbox"
                            checked={draft.transmission.has(value)}
                            onChange={() => toggleDraftSet("transmission", value)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{label}</FilterOptionText>
                          <FilterCount value={transmissionCounts[value]} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.fuel}>
                    <div className="grid grid-cols-2 gap-0.5">
                      {(
                        [
                          ["PETROL", c.petrol],
                          ["DIESEL", c.diesel],
                          ["HYBRID", c.hybrid],
                          ["ELECTRIC", c.electric],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={filterOptionClass}
                        >
                          <input
                            type="checkbox"
                            checked={draft.fuel.has(value)}
                            onChange={() => toggleDraftSet("fuel", value)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{label}</FilterOptionText>
                          <FilterCount value={fuelCounts[value]} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.deposit}>
                    <div className="grid grid-cols-2 gap-0.5">
                      {(
                        [
                          ["none", c.noDeposit],
                          ["nonePaid", c.noDepositPaid],
                          ["cash", c.depositCash],
                          ["creditCard", c.depositCreditCard],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={filterOptionClass}
                        >
                          <input
                            type="checkbox"
                            checked={draft.depositOptions.has(value)}
                            onChange={() => toggleDraftSet("depositOptions", value)}
                            className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{label}</FilterOptionText>
                          <FilterCount value={depositCounts[value]} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.rentPayment}>
                    <div className="flex gap-0.5">
                      {(
                        [
                          ["cash", c.rentPayCash],
                          ["card", c.rentPayCard],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={cn(filterOptionClass, "min-w-0 flex-1")}
                        >
                          <input
                            type="checkbox"
                            checked={draft.rentPaymentOptions.has(value)}
                            onChange={() => toggleDraftSet("rentPaymentOptions", value)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{label}</FilterOptionText>
                          <FilterCount value={rentPaymentCounts[value]} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.driveType}>
                    <div className="flex gap-0.5">
                      {(
                        [
                          ["2wd", c.drive2wd],
                          ["4x4", c.drive4x4],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={cn(filterOptionClass, "min-w-0 flex-1")}
                        >
                          <input
                            type="checkbox"
                            checked={draft.driveOptions.has(value)}
                            onChange={() => toggleDraftSet("driveOptions", value)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{label}</FilterOptionText>
                          <FilterCount value={driveCounts[value]} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.seatsLabel}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSeatsMenuOpen((open) => !open)}
                        className="flex h-7 w-full items-center justify-between rounded-md border border-sky-200/80 bg-[#f4f9fd] px-2 text-left text-xs text-slate-700"
                      >
                        <span
                          className="truncate"
                          title={
                            draft.seatOptions.size
                              ? [...draft.seatOptions]
                                  .sort((a, b) => Number(a) - Number(b))
                                  .map((n) => c.seatOption.replace("{n}", n))
                                  .join(", ")
                              : c.any
                          }
                        >
                          {draft.seatOptions.size
                            ? [...draft.seatOptions]
                                .sort((a, b) => Number(a) - Number(b))
                                .map((n) => c.seatOption.replace("{n}", n))
                                .join(", ")
                            : c.any}
                        </span>
                        <span className="text-slate-400">▾</span>
                      </button>
                      {seatsMenuOpen ? (
                        <div className="absolute left-0 right-0 z-20 mt-0.5 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({ ...cloneDraft(prev), seatOptions: new Set() }))
                            }
                            className="mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-medium text-[#1d6fe8] hover:bg-slate-50"
                          >
                            <X className="h-3 w-3" />
                            {c.resetSeats}
                          </button>
                          <div className="max-h-40 space-y-0.5 overflow-y-auto">
                            {SEAT_FILTER_OPTIONS.map((n) => (
                              <label
                                key={n}
                                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={draft.seatOptions.has(n)}
                                  onChange={() => toggleDraftSet("seatOptions", n)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#1d6fe8]"
                                />
                                <span className="flex-1">{c.seatOption.replace("{n}", n)}</span>
                                <FilterCount value={seatCounts[n] ?? 0} />
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </FilterFrame>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
                  <FilterFrame title={c.allBrands}>
                    <select
                      value={draft.brand}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...cloneDraft(prev), brand: e.target.value }))
                      }
                      className={filterControlClass}
                    >
                      <option value="">{c.any}</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                          {brandCounts[b] != null ? ` (${brandCounts[b]})` : ""}
                        </option>
                      ))}
                    </select>
                  </FilterFrame>

                  <FilterFrame title={c.yearFrom}>
                    <select
                      value={draft.yearFrom}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...cloneDraft(prev), yearFrom: e.target.value }))
                      }
                      className={filterControlClass}
                    >
                      <option value="">{c.any}</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}+
                        </option>
                      ))}
                    </select>
                  </FilterFrame>

                  <FilterFrame title={c.pricePerDay}>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={0}
                        placeholder={c.min}
                        value={draft.priceMin}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...cloneDraft(prev), priceMin: e.target.value }))
                        }
                        className={filterControlClass}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder={c.max}
                        value={draft.priceMax}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...cloneDraft(prev), priceMax: e.target.value }))
                        }
                        className={filterControlClass}
                      />
                    </div>
                  </FilterFrame>

                  <FilterFrame title={c.driverAgeLabel}>
                    <select
                      value={draft.driverAge}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...cloneDraft(prev), driverAge: e.target.value }))
                      }
                      className={filterControlClass}
                    >
                      <option value="">{c.any}</option>
                      {DRIVER_AGE_OPTIONS.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </select>
                  </FilterFrame>

                  <FilterFrame title={c.licenseYearsLabel}>
                    <select
                      value={draft.licenseYears}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...cloneDraft(prev), licenseYears: e.target.value }))
                      }
                      className={filterControlClass}
                    >
                      <option value="">{c.any}</option>
                      {LICENSE_YEARS_OPTIONS.map((years) => (
                        <option key={years} value={years}>
                          {years === "10" ? c.licenseYearsPlus : years}
                        </option>
                      ))}
                    </select>
                  </FilterFrame>
                </div>

                {crossBorderFilter ? (
                  <FilterFrame title={c.crossBorderLabel}>
                    <label className={filterOptionClass}>
                      <input
                        type="checkbox"
                        checked={draft.extraOptions.has(crossBorderFilter.id)}
                        onChange={() => toggleDraftSet("extraOptions", crossBorderFilter.id)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[#1d6fe8]"
                      />
                      <FilterOptionText>{c.crossBorderOption}</FilterOptionText>
                      <FilterCount value={extraCounts[crossBorderFilter.id] ?? 0} />
                    </label>
                  </FilterFrame>
                ) : null}

                {extrasCatalog.length > 0 ? (
                  <FilterFrame title={c.extrasLabel}>
                    <div className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
                      {extrasCatalog.map((extra) => (
                        <label
                          key={extra.id}
                          className={filterOptionClass}
                        >
                          <input
                            type="checkbox"
                            checked={draft.extraOptions.has(extra.id)}
                            onChange={() => toggleDraftSet("extraOptions", extra.id)}
                            className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[#1d6fe8]"
                          />
                          <FilterOptionText>{knownText(locale, extra.name)}</FilterOptionText>
                          <FilterCount value={extraCounts[extra.id] ?? 0} />
                        </label>
                      ))}
                    </div>
                  </FilterFrame>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 sm:px-4">
                <button
                  type="button"
                  onClick={resetDraft}
                  className="text-xs font-semibold text-[#1d6fe8] hover:underline"
                >
                  {c.resetFilters}
                </button>
                <button
                  type="button"
                  onClick={applyDraft}
                  className="rounded-md bg-[#22c55e] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#16a34a]"
                >
                  {c.showCars.replace("{n}", String(previewCount))}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {filtered.map((car) => (
            <CarResultCard
              key={car.id}
              car={car}
              days={days}
              href={bookHref(car.id)}
              formatPrice={formatPrice}
              copy={c}
              pickup={pickup}
              dropoff={dropoff || pickup}
              referralDiscountPercent={referralDiscountPercent}
              siteDiscountPercent={siteDiscountPercent}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-slate-500">{emptyMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

function FilterFrame({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-sky-200/90 bg-[#e8f1fb] p-1.5 shadow-sm",
        className,
      )}
    >
      <h3 className="mb-1 border-b border-sky-200/70 pb-0.5 text-[11px] font-bold leading-tight text-slate-800">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FilterCount({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-sky-200/80 bg-[#f4f9fd] px-1 py-px text-[9px] font-bold tabular-nums text-slate-600">
      {value}
    </span>
  );
}

/** Truncated label with native tooltip for the full text on hover. */
function FilterOptionText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("min-w-0 flex-1 truncate leading-tight", className)} title={children}>
      {children}
    </span>
  );
}

const filterOptionClass =
  "flex items-center gap-1.5 rounded-md border border-sky-200/80 bg-[#f4f9fd] px-1.5 py-0.5 text-xs text-slate-700";

const filterControlClass =
  "h-7 w-full rounded-md border border-sky-200/80 bg-[#f4f9fd] px-1.5 text-xs text-slate-800 outline-none focus:border-[#1d6fe8]";

function FilterPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold transition",
        active
          ? "border-[#1d6fe8] bg-[#1d6fe8] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#1d6fe8]/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function isAirportSearchPlace(code: string) {
  if (!code?.trim()) return false;
  if (isCityLocationCode(code)) return false;
  const place = findSearchPlace(code);
  if (place?.kind === "airport") return true;
  if (place?.kind === "city") return false;
  // Bare IATA / catalog airport codes
  return /^[A-Za-z]{3}$/.test(code.trim());
}

function CarResultCard({
  car,
  days,
  href,
  formatPrice,
  copy,
  pickup,
  dropoff,
  referralDiscountPercent = 0,
  siteDiscountPercent = 0,
}: {
  car: SearchResultCar;
  days: number;
  href: string;
  formatPrice: (n: number) => string;
  copy: (typeof COPY)["en"];
  pickup: string;
  dropoff: string;
  referralDiscountPercent?: number;
  siteDiscountPercent?: number;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = Array.isArray(car.photos) ? car.photos.filter(Boolean) : [];
  const details = parseCarDetails(car.description);
  const priced = listingDailyWithDeliveryEur({
    dailyRateEur: toNumber(car.dailyRateEur, 0),
    days,
    pickupDeliveryFeeEur: car.pickupDeliveryFeeEur,
    dropoffDeliveryFeeEur: car.dropoffDeliveryFeeEur,
    deliveryFeeEur: car.deliveryFeeEur,
    details,
    discountPercent: toNumber(car.discountPercent, 0),
    referralDiscountPercent,
  });
  const deliveryFee = priced.deliveryFeeEur;
  const total = priced.totalEur;
  /** Hero price: (rental for days + pickup delivery + return delivery) ÷ days. */
  const displayDaily = priced.displayDailyEur;
  const depositEur = car.depositEur != null ? toNumber(car.depositEur, Number.NaN) : Number.NaN;
  const noDeposit = Number.isFinite(depositEur) && depositEur <= 0;
  const lowDeposit = Number.isFinite(depositEur) && depositEur > 0 && depositEur < 100;
  const freeDelivery = deliveryFee <= 0;
  const airportTrip = isAirportSearchPlace(pickup) || isAirportSearchPlace(dropoff);
  const category = car.categoryLabel || car.categorySlug || null;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative w-full overflow-hidden rounded-t-xl bg-slate-100 pb-[56.25%]">
        {photos[photoIndex] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photoIndex]}
            alt={`${car.make} ${car.model}${car.year ? ` ${car.year}` : ""} — airport car rental`}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Car className="h-10 w-10" />
          </div>
        )}

        {siteDiscountPercent > 0 ? (
          <span className="absolute left-0 top-0 z-[5] max-w-[85%] truncate rounded-br-md bg-orange-500 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md">
            {copy.siteDiscount.replace("{n}", String(siteDiscountPercent))}
          </span>
        ) : null}

        <div className="absolute bottom-3 right-0 z-[5] flex flex-col items-end gap-1.5">
          {noDeposit ? (
            <span className="origin-bottom-right -rotate-6 rounded-sm bg-[#39ff14] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-md">
              {copy.noDeposit}
            </span>
          ) : null}
          {lowDeposit ? (
            <span className="origin-bottom-right -rotate-6 rounded-sm bg-yellow-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-md">
              {copy.lowDeposit}
            </span>
          ) : null}
          {freeDelivery ? (
            <span
              className={`origin-bottom-right -rotate-6 rounded-sm px-2 py-1.5 text-center text-[9px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-md ${
                airportTrip ? "bg-red-600" : "bg-[#ec4899]"
              }`}
            >
              <span className="block whitespace-nowrap">{copy.freeDeliveryShort}</span>
              {!airportTrip ? (
                <span className="block whitespace-nowrap normal-case tracking-normal">
                  {copy.freeDeliveryCity}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        {photos.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 z-[6] flex -translate-x-1/2 gap-1">
            {photos.slice(0, 5).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setPhotoIndex(i)}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === photoIndex ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="text-[15px] font-extrabold leading-tight text-slate-900">
            {car.make} {car.model}
          </h2>
          {category ? (
            <span className="rounded-full bg-[#4d8ef7] px-2 py-0.5 text-[10px] font-bold text-white">
              {category}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-5 gap-1 text-[#1d6fe8]">
          <SpecStack
            icon={<Leaf className="h-4 w-4" />}
            label={fuelLabel(car.fuelType, copy)}
          />
          <SpecStack
            icon={<Settings2 className="h-4 w-4" />}
            label={transmissionLabel(car.transmission, copy)}
          />
          <SpecStack
            icon={<Users className="h-4 w-4" />}
            label={copy.seats.replace("{n}", String(car.seats || 5))}
          />
          <SpecStack
            icon={<Briefcase className="h-4 w-4" />}
            label={luggageLabel(car.seats || 5, copy)}
          />
          <SpecStack
            icon={<Car className="h-4 w-4" />}
            label={isAwd(car) ? "4x4" : "2WD"}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-[22px] font-extrabold leading-none text-[#1e293b]">
              <CardMoney amountEur={displayDaily} formatPrice={formatPrice} />
            </p>
            <p className="mt-1 truncate text-[12px] font-medium text-slate-400">
              {(() => {
                const [before, after] = copy.totalForDays
                  .replace("{n}", String(days))
                  .split("{price}");
                return (
                  <>
                    {before}
                    <CardMoney
                      amountEur={total}
                      formatPrice={formatPrice}
                      centsClassName="text-[0.85em] tracking-wide"
                    />
                    {after}
                  </>
                );
              })()}
            </p>
          </div>
          <Link
            href={href}
            className="shrink-0 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#16a34a]"
          >
            {copy.view}
          </Link>
        </div>
      </div>
    </article>
  );
}

function SpecStack({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
      <span className="text-[#1d6fe8]">{icon}</span>
      <span className="w-full truncate text-[9px] font-semibold leading-tight text-[#1d6fe8]">
        {label}
      </span>
    </div>
  );
}

/** Listing price with a clear decimal comma so 87,77 is not read as 8777. */
function CardMoney({
  amountEur,
  formatPrice,
  centsClassName = "text-[0.72em] tracking-wide",
}: {
  amountEur: number;
  formatPrice: (n: number) => string;
  centsClassName?: string;
}) {
  const formatted = formatPrice(amountEur);
  const match = formatted.match(/^(\d+)(?:[.,](\d+))?(.*)$/);
  if (!match) return <>{formatted}</>;
  const [, whole, cents, suffix] = match;
  return (
    <span className="tabular-nums">
      <span>{whole}</span>
      {cents ? (
        <>
          <span className="mx-[0.12em] inline-block translate-y-px font-black opacity-90">,</span>
          <span className={centsClassName}>{cents}</span>
        </>
      ) : null}
      <span>{suffix}</span>
    </span>
  );
}
