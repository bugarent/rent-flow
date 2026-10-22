"use client";

import { uiText } from "@/lib/i18n/ui-text";
import { airportCopySourceLocale } from "@/lib/catalog/homepage-airport-i18n";
import {
  SEO_DESCRIPTION_RANGE,
  SEO_TITLE_RANGE,
  autoSeoDescription,
  autoSeoTitle,
  seoLengthStatus,
  type LengthStatus,
} from "@/lib/catalog/airport-seo";

const STATUS_CLASS: Record<LengthStatus, string> = {
  empty: "text-slate-500",
  short: "text-amber-700",
  good: "text-emerald-700",
  long: "text-red-600",
};

function statusLabel(locale: string, status: LengthStatus): string {
  switch (status) {
    case "empty":
      return uiText(locale, "auto", "ავტომატური", "авто");
    case "short":
      return uiText(locale, "too short", "მოკლეა", "коротко");
    case "long":
      return uiText(locale, "too long", "გრძელია", "длинно");
    default:
      return uiText(locale, "good", "კარგია", "хорошо");
  }
}

function LengthCounter({
  locale,
  text,
  range,
}: {
  locale: string;
  text: string;
  range: { min: number; max: number };
}) {
  const status = seoLengthStatus(text, range);
  return (
    <span className={`text-[11px] font-semibold ${STATUS_CLASS[status]}`}>
      {text.trim().length}/{range.max} · {statusLabel(locale, status)}
    </span>
  );
}

/** Google title + description of an airport page, with counters and a result preview. */
export function AirportSeoFields({
  locale,
  title,
  iata,
  infoText,
  airportName,
  seoTitle,
  seoDescription,
  onChange,
}: {
  locale: string;
  title: string;
  iata: string;
  infoText: string;
  airportName: string;
  seoTitle: string;
  seoDescription: string;
  onChange: (patch: { seoTitle?: string; seoDescription?: string }) => void;
}) {
  const source = airportCopySourceLocale({ title, infoText });
  const code = iata.trim().toUpperCase();
  const autoTitle = title.trim() ? autoSeoTitle(title) : "";
  const autoDescription = code
    ? autoSeoDescription({ locale: source, airportName: airportName || title, code, infoText })
    : "";
  const previewTitle = seoTitle.trim() || autoTitle;
  const previewDescription = seoDescription.trim() || autoDescription;

  const t = {
    heading: uiText(locale, "Google search (SEO)", "Google-ის ძიება (SEO)", "Поиск Google (SEO)"),
    hint: uiText(
      locale,
      "How this airport page looks in Google. Put the airport name and code first. Empty fields are filled automatically from the title and description.",
      "ასე გამოჩნდება აეროპორტის გვერდი Google-ში. დასაწყისში ჩაწერეთ აეროპორტის სახელი და კოდი. ცარიელი ველები ავტომატურად ივსება სათაურიდან და აღწერიდან.",
      "Так страница аэропорта выглядит в Google. Начинайте с названия и кода аэропорта. Пустые поля заполняются автоматически из заголовка и описания.",
    ),
    seoTitle: uiText(locale, "Google title", "Google-ის სათაური", "Заголовок в Google"),
    seoTitleHelp: uiText(
      locale,
      `${SEO_TITLE_RANGE.min}–${SEO_TITLE_RANGE.max} characters`,
      `${SEO_TITLE_RANGE.min}–${SEO_TITLE_RANGE.max} სიმბოლო`,
      `${SEO_TITLE_RANGE.min}–${SEO_TITLE_RANGE.max} символов`,
    ),
    seoDescription: uiText(locale, "Google description", "Google-ის მოკლე აღწერა", "Описание в Google"),
    seoDescriptionHelp: uiText(
      locale,
      `${SEO_DESCRIPTION_RANGE.min}–${SEO_DESCRIPTION_RANGE.max} characters`,
      `${SEO_DESCRIPTION_RANGE.min}–${SEO_DESCRIPTION_RANGE.max} სიმბოლო`,
      `${SEO_DESCRIPTION_RANGE.min}–${SEO_DESCRIPTION_RANGE.max} символов`,
    ),
    autoFill: uiText(locale, "Fill automatically", "ავტომატურად შევსება", "Заполнить автоматически"),
    preview: uiText(locale, "Google preview", "როგორ გამოჩნდება Google-ში", "Как в Google"),
  };

  return (
    <fieldset className="min-w-0 space-y-2.5 rounded-lg border border-sky-200 bg-white p-2.5">
      <legend className="px-1 text-xs font-bold text-[#0b1f4b]">{t.heading}</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="min-w-0 text-[11px] text-slate-500">{t.hint}</p>
        <button
          type="button"
          disabled={!autoTitle && !autoDescription}
          onClick={() => onChange({ seoTitle: autoTitle, seoDescription: autoDescription })}
          className="min-h-10 shrink-0 rounded-lg border border-sky-300 bg-sky-50 px-3 text-xs font-bold text-sky-800 disabled:opacity-50"
        >
          {t.autoFill}
        </button>
      </div>

      <label className="block text-[11px] font-bold text-slate-600">
        <span className="flex flex-wrap items-center justify-between gap-1">
          <span>
            {t.seoTitle} <span className="font-normal text-slate-500">({t.seoTitleHelp})</span>
          </span>
          <LengthCounter locale={locale} text={seoTitle} range={SEO_TITLE_RANGE} />
        </span>
        <input
          className="mt-1 min-h-10 w-full rounded-lg border bg-white p-2 text-base font-normal sm:text-xs"
          maxLength={70}
          placeholder={autoTitle}
          value={seoTitle}
          onChange={(event) => onChange({ seoTitle: event.target.value })}
        />
      </label>

      <label className="block text-[11px] font-bold text-slate-600">
        <span className="flex flex-wrap items-center justify-between gap-1">
          <span>
            {t.seoDescription} <span className="font-normal text-slate-500">({t.seoDescriptionHelp})</span>
          </span>
          <LengthCounter locale={locale} text={seoDescription} range={SEO_DESCRIPTION_RANGE} />
        </span>
        <textarea
          className="mt-1 w-full rounded-lg border bg-white p-2 text-base font-normal sm:text-xs"
          rows={3}
          maxLength={170}
          placeholder={autoDescription}
          value={seoDescription}
          onChange={(event) => onChange({ seoDescription: event.target.value })}
        />
      </label>

      {previewTitle || previewDescription ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t.preview}</p>
          <p className="truncate text-xs text-slate-600">
            rentairportcars.com › airport › {code.toLowerCase() || "…"}
          </p>
          <p className="mt-0.5 break-words text-base leading-snug text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-700">{previewDescription}</p>
        </div>
      ) : null}
    </fieldset>
  );
}
