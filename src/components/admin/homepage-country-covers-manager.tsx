"use client";

import { useMemo, useRef, useState } from "react";
import { ImageUp, RotateCcw } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { CountryFlag } from "@/components/ui/country-flag";
import { uiText } from "@/lib/i18n/ui-text";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { compressImageForUpload } from "@/lib/files/compress-image";
import {
  BUILT_IN_COUNTRY_COVERS,
  type CountryCoverMap,
} from "@/lib/catalog/country-covers";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";

const FOCUS_OPTIONS = [
  { value: 0.25, en: "Left", ka: "მარცხნივ", ru: "Слева" },
  { value: 0.5, en: "Center", ka: "ცენტრში", ru: "По центру" },
  { value: 0.75, en: "Right", ka: "მარჯვნივ", ru: "Справа" },
] as const;

/** Landmark cover per search country; uploads are converted to AVIF/WebP on the server. */
export function HomepageCountryCoversManager({
  initialUploaded,
  locations,
}: {
  initialUploaded: CountryCoverMap;
  locations: DeliveryLocationView[];
}) {
  const { locale } = useAdminLocale();
  const tx = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [uploaded, setUploaded] = useState<CountryCoverMap>(initialUploaded);
  const [busy, setBusy] = useState("");
  const [focus, setFocus] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<{ iso: string; ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingIso = useRef("");

  const countries = useMemo(() => {
    const names = new Map<string, string>();
    for (const loc of locations) {
      const iso = loc.countryIso2?.toUpperCase();
      if (iso && loc.isActive && !names.has(iso)) names.set(iso, loc.country || worldCountryName(iso));
    }
    for (const iso of Object.keys(uploaded)) if (!names.has(iso)) names.set(iso, worldCountryName(iso));
    return [...names.entries()]
      .map(([iso, name]) => ({ iso, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [locations, uploaded]);

  const pick = (iso: string) => {
    pendingIso.current = iso;
    fileRef.current?.click();
  };

  const upload = async (file: File) => {
    const iso = pendingIso.current;
    if (!iso) return;
    const focalX = focus[iso] ?? uploaded[iso]?.focalX ?? BUILT_IN_COUNTRY_COVERS[iso]?.focalX ?? 0.5;
    setBusy(iso);
    setNotice(null);
    try {
      // Phone photos can exceed the host's request limit; the server re-encodes anyway.
      const small = await compressImageForUpload(file, { maxEdge: 2400, targetBytes: 1_600_000 });
      const body = new FormData();
      body.set("iso2", iso);
      body.set("focalX", String(focalX));
      body.set("file", small);
      const res = await fetch("/api/admin/homepage/country-covers", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { uploaded?: CountryCoverMap; error?: string };
      if (!res.ok || !data.uploaded) throw new Error(data.error || "upload failed");
      setUploaded(data.uploaded);
      setNotice({ iso, ok: true, text: tx("Saved — live on the homepage", "შენახულია — უკვე ჩანს მთავარ გვერდზე", "Сохранено — уже на главной") });
    } catch (error) {
      setNotice({
        iso,
        ok: false,
        text: `${tx("Upload failed", "ატვირთვა ვერ მოხერხდა", "Не удалось загрузить")}: ${error instanceof Error ? error.message : ""}`,
      });
    } finally {
      setBusy("");
    }
  };

  const revert = async (iso: string) => {
    const message = BUILT_IN_COUNTRY_COVERS[iso]
      ? tx("Remove the uploaded photo and show the built-in cover?", "წავშალოთ ატვირთული ფოტო და დავაბრუნოთ ჩაშენებული ყდა?", "Удалить загруженное фото и вернуть встроенную обложку?")
      : tx("Remove this country's cover photo?", "წავშალოთ ამ ქვეყნის ყდის ფოტო?", "Удалить обложку этой страны?");
    if (!window.confirm(message)) return;
    setBusy(iso);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/homepage/country-covers?iso2=${encodeURIComponent(iso)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { uploaded?: CountryCoverMap };
      if (!res.ok || !data.uploaded) throw new Error();
      setUploaded(data.uploaded);
    } catch {
      setNotice({ iso, ok: false, text: tx("Could not save", "შენახვა ვერ მოხერხდა", "Не удалось сохранить") });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">
          {tx("Homepage cover per country", "მთავარი გვერდის ყდა ქვეყნების მიხედვით", "Обложка главной по странам")}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {tx(
            "When a visitor picks a country, its landmark photo appears behind the search. Upload any photo — it is converted to AVIF/WebP, sized for desktop and phones, and remembered for that country.",
            "ვიზიტორის მიერ ქვეყნის არჩევისას ძებნის უკან გამოჩნდება მისი ღირსშესანიშნაობის ფოტო. ატვირთეთ ნებისმიერი ფოტო — ავტომატურად გადაკეთდება AVIF/WebP-ად, კომპიუტერისა და ტელეფონის ზომებით, და ამ ქვეყნისთვის დაიმახსოვრება.",
            "Когда посетитель выбирает страну, за поиском появляется фото её достопримечательности. Загрузите любое фото — оно будет сжато в AVIF/WebP для компьютера и телефона и закреплено за страной.",
          )}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map(({ iso, name }) => {
          const own = uploaded[iso];
          const cover = own ?? BUILT_IN_COUNTRY_COVERS[iso];
          const working = busy === iso;
          const focalX = focus[iso] ?? cover?.focalX ?? 0.5;
          return (
            <li key={iso} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <div className="relative aspect-[16/9] bg-slate-200">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.webp}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${Math.round(cover.focalX * 100)}% 50%` }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-500">
                    {tx("No cover yet", "ყდა ჯერ არ არის", "Обложки пока нет")}
                  </div>
                )}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    own ? "bg-emerald-600 text-white" : cover ? "bg-white/90 text-slate-700" : "bg-amber-500 text-white"
                  }`}
                >
                  {own
                    ? tx("Uploaded", "ატვირთული", "Загружена")
                    : cover
                      ? tx("Built-in", "ჩაშენებული", "Встроенная")
                      : tx("Default photo", "ძირითადი ფოტო", "Общее фото")}
                </span>
              </div>
              <div className="space-y-2 p-2.5">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#0b1f4b]">
                  <CountryFlag iso2={iso} className="h-3.5 w-5 shrink-0 rounded-sm" />
                  <span className="truncate">{name}</span>
                </p>
                <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>{tx("Landmark on phones", "ღირსშესანიშნაობა ტელეფონზე", "Объект на телефоне")}</span>
                  <select
                    value={focalX <= 0.35 ? 0.25 : focalX >= 0.65 ? 0.75 : 0.5}
                    onChange={(e) => setFocus((prev) => ({ ...prev, [iso]: Number(e.target.value) }))}
                    className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-base sm:text-xs"
                  >
                    {FOCUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {uiText(locale, o.en, o.ka, o.ru)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => pick(iso)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0b1f4b] px-3 text-xs font-bold text-white hover:bg-[#16336e] disabled:opacity-50"
                  >
                    <ImageUp className="h-4 w-4" aria-hidden />
                    {working
                      ? tx("Processing…", "მუშავდება…", "Обработка…")
                      : cover
                        ? tx("Replace photo", "ფოტოს შეცვლა", "Заменить фото")
                        : tx("Upload photo", "ფოტოს ატვირთვა", "Загрузить фото")}
                  </button>
                  {own ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void revert(iso)}
                      title={tx("Remove upload", "ატვირთულის წაშლა", "Удалить загрузку")}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      {tx("Remove", "წაშლა", "Удалить")}
                    </button>
                  ) : null}
                </div>
                {notice?.iso === iso ? (
                  <p className={`text-xs font-semibold ${notice.ok ? "text-emerald-700" : "text-red-700"}`}>{notice.text}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
