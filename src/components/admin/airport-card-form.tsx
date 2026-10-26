"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { ImageCropUpload } from "@/components/admin/image-crop-upload";
import { AirportCardTranslationsFields } from "@/components/admin/airport-card-translations-fields";
import { AirportSeoFields } from "@/components/admin/airport-seo-fields";
import { CountryAirportSelect } from "@/components/admin/homepage-airports-country";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { findSearchPlace } from "@/lib/catalog/search-places";
import { placeLabel } from "@/lib/i18n/place-label";
import { uiText } from "@/lib/i18n/ui-text";
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";

export type AirportFormValue = {
  title: string;
  iata: string;
  imageUrl: string;
  infoText: string;
  seoTitle: string;
  seoDescription: string;
  translations: AirportCardTranslations;
};

export function blankAirportForm(): AirportFormValue {
  return {
    title: "",
    iata: "",
    imageUrl: "",
    infoText: "",
    seoTitle: "",
    seoDescription: "",
    translations: {},
  };
}

/** Google ranks pages with a few hundred words of unique text better. */
const GOOD_WORD_COUNT = 150;

function Step({ n, title, help, children }: { n: number; title: string; help?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="flex items-center gap-2 text-xs font-bold text-[#0b1f4b]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] text-white">
          {n}
        </span>
        {title}
      </p>
      {help ? <p className="text-[11px] text-slate-500">{help}</p> : null}
      {children}
    </div>
  );
}

/** Add / edit form for one popular-airport card, in the order an admin fills it. */
export function AirportCardForm({
  value,
  editingId,
  country,
  saving,
  onChange,
  onSubmit,
  onCancel,
  onError,
}: {
  value: AirportFormValue;
  editingId: string | null;
  country: string;
  saving: boolean;
  onChange: (patch: Partial<AirportFormValue>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const { dictionary, locale } = useAdminLocale();
  const e = dictionary.editor;
  const ui = dictionary.common;
  const suggestedTitle = useRef("");
  const airportName = useMemo(() => {
    const place = findSearchPlace(value.iata);
    if (!place) return "";
    const label = placeLabel(locale, place.label);
    if (place.kind === "city") return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
    return label;
  }, [locale, value.iata]);
  const words = value.infoText.trim() ? value.infoText.trim().split(/\s+/).length : 0;

  const t = {
    airportHelp: uiText(
      locale,
      "The card links to its own airport page that Google indexes.",
      "ბარათი იხსნება აეროპორტის ცალკე გვერდზე, რომელსაც Google ინდექსირებს.",
      "Карточка ведёт на отдельную страницу аэропорта, которую индексирует Google.",
    ),
    title: uiText(locale, "Card title (page heading)", "ბარათის სათაური (გვერდის სათაური)", "Заголовок карточки (страницы)"),
    titleHelp: uiText(
      locale,
      "Include the airport or city name, e.g. “Car rental at Tbilisi Airport (TBS)”.",
      "ჩაწერეთ აეროპორტის ან ქალაქის სახელი, მაგ.: „მანქანის ქირაობა თბილისის აეროპორტში (TBS)“.",
      "Укажите аэропорт или город, напр. «Аренда авто в аэропорту Тбилиси (TBS)».",
    ),
    photo: uiText(locale, "Photo", "ფოტო", "Фото"),
    description: uiText(locale, "Page text", "გვერდის ტექსტი", "Текст страницы"),
    descriptionHelp: uiText(
      locale,
      "Unique text about renting a car at this airport: where to meet, distances to the city, tips. One idea per paragraph.",
      "უნიკალური ტექსტი ამ აეროპორტში მანქანის ქირაობაზე: სად ხდება შეხვედრა, მანძილი ქალაქამდე, რჩევები. თითო აზრი ცალკე აბზაცში.",
      "Уникальный текст об аренде в этом аэропорту: где встреча, расстояние до города, советы. Одна мысль в абзаце.",
    ),
    words: uiText(locale, "words", "სიტყვა", "слов"),
    wordsGoal: uiText(
      locale,
      `${GOOD_WORD_COUNT}+ recommended for Google`,
      `Google-ისთვის რეკომენდებულია ${GOOD_WORD_COUNT}+`,
      `для Google рекомендуется ${GOOD_WORD_COUNT}+`,
    ),
  };

  const inputClass = "min-h-10 w-full rounded-lg border bg-white p-2 text-base font-normal sm:text-xs";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 min-w-0 space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5"
    >
      <h3 className="text-sm font-bold">{editingId ? e.updateAirportCard : e.addAirportCard}</h3>

      <Step n={1} title={uiText(locale, "Airport or place", "აეროპორტი ან ადგილი", "Аэропорт или место")} help={t.airportHelp}>
        <CountryAirportSelect
          country={country}
          locale={locale}
          value={value.iata}
          onChange={(code, label) => {
            const typed = value.title.trim();
            const replace = !editingId && (!typed || typed === suggestedTitle.current);
            if (replace) suggestedTitle.current = label;
            onChange(replace ? { iata: code, title: label } : { iata: code });
          }}
        />
      </Step>

      <Step n={2} title={t.title} help={t.titleHelp}>
        <input
          className={inputClass}
          placeholder={e.airportTitlePh}
          required
          maxLength={120}
          value={value.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </Step>

      <Step n={3} title={t.photo}>
        <input
          className={inputClass}
          placeholder={e.imageUrl}
          required
          value={value.imageUrl}
          onChange={(event) => onChange({ imageUrl: event.target.value })}
        />
        <ImageCropUpload
          aspect={16 / 9}
          label={e.orUploadImage}
          onUploaded={(url) => onChange({ imageUrl: url })}
          onError={onError}
        />
        {value.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.imageUrl} alt="" className="h-16 w-full max-w-xs rounded-lg object-cover" />
        ) : null}
      </Step>

      <Step n={4} title={t.description} help={t.descriptionHelp}>
        <textarea
          className={inputClass}
          rows={6}
          placeholder={e.airportInfoPh}
          maxLength={8000}
          value={value.infoText}
          onChange={(event) => onChange({ infoText: event.target.value })}
        />
        <p
          className={`text-[11px] font-semibold ${
            words >= GOOD_WORD_COUNT ? "text-emerald-700" : words ? "text-amber-700" : "text-slate-500"
          }`}
        >
          {words} {t.words} · {t.wordsGoal}
        </p>
      </Step>

      <Step n={5} title={uiText(locale, "Google search", "Google-ის ძიება", "Поиск Google")}>
        <AirportSeoFields
          locale={locale}
          title={value.title}
          iata={value.iata}
          infoText={value.infoText}
          airportName={airportName}
          seoTitle={value.seoTitle}
          seoDescription={value.seoDescription}
          onChange={onChange}
        />
      </Step>

      <Step n={6} title={uiText(locale, "Other languages (optional)", "სხვა ენები (არასავალდებულო)", "Другие языки (необязательно)")}>
        <AirportCardTranslationsFields
          key={editingId || "new"}
          adminLocale={locale}
          value={value.translations}
          onChange={(translations) => onChange({ translations })}
        />
      </Step>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-10 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white disabled:bg-slate-400"
        >
          {saving ? ui.saving : editingId ? e.saveChanges : e.addAirport}
        </button>
        {editingId ? (
          <button type="button" className="min-h-10 rounded-lg border px-4 text-xs font-semibold" onClick={onCancel}>
            {ui.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
