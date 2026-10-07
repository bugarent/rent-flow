"use client";

import { useState } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { uiText } from "@/lib/i18n/ui-text";
import {
  asCardLocale,
  type AirportCardTranslations,
} from "@/lib/catalog/homepage-airport-i18n";

/** Per-language title + details for one homepage airport card. */
export function AirportCardTranslationsFields({
  value,
  onChange,
  adminLocale,
}: {
  value: AirportCardTranslations;
  onChange: (next: AirportCardTranslations) => void;
  adminLocale: string;
}) {
  const [lang, setLang] = useState<Locale>(() => asCardLocale(adminLocale));
  const row = value[lang] || {};
  const t = {
    heading: uiText(adminLocale, "Translations", "თარგმანები", "Переводы"),
    hint: uiText(
      adminLocale,
      "The preface is translated automatically into the visitor's language. Fill a language here only to replace that translation.",
      "წინასიტყვაობა ავტომატურად ითარგმნება ვიზიტორის ენაზე. აქ ენა მხოლოდ მაშინ შეავსეთ, თუ თარგმანი უნდა შეცვალოთ.",
      "Предисловие переводится на язык посетителя автоматически. Заполняйте язык здесь только чтобы заменить перевод.",
    ),
    language: uiText(adminLocale, "Language", "ენა", "Язык"),
    title: uiText(adminLocale, "Title in this language", "სათაური ამ ენაზე", "Заголовок на этом языке"),
    info: uiText(adminLocale, "Details in this language", "დეტალები ამ ენაზე", "Описание на этом языке"),
  };

  const update = (patch: { title?: string; infoText?: string }) => {
    const nextRow = { ...row, ...patch };
    const next = { ...value };
    if (!nextRow.title?.trim() && !nextRow.infoText?.trim()) delete next[lang];
    else next[lang] = nextRow;
    onChange(next);
  };

  return (
    <fieldset className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <legend className="px-1 text-xs font-bold text-[#0b1f4b]">{t.heading}</legend>
      <p className="text-[11px] text-slate-500">{t.hint}</p>
      <label className="block text-[11px] font-bold text-slate-600">
        {t.language}
        <select
          className="mt-1 block min-h-10 w-full rounded-lg border bg-white p-2 text-base font-normal sm:text-xs"
          value={lang}
          onChange={(event) => setLang(event.target.value as Locale)}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
              {value[code]?.title || value[code]?.infoText ? " ✓" : ""}
            </option>
          ))}
        </select>
      </label>
      <input
        className="w-full rounded-lg border p-2 text-base sm:text-xs"
        placeholder={t.title}
        maxLength={120}
        value={row.title || ""}
        onChange={(event) => update({ title: event.target.value })}
      />
      <textarea
        className="w-full rounded-lg border p-2 text-base sm:text-xs"
        rows={4}
        placeholder={t.info}
        maxLength={8000}
        value={row.infoText || ""}
        onChange={(event) => update({ infoText: event.target.value })}
      />
    </fieldset>
  );
}
