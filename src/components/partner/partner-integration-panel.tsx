"use client";

import { useEffect, useState } from "react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";

type CarRow = {
  id: string;
  label: string;
  registrationNumber: string;
  channelUrl: string;
};

type Payload = {
  website: { pageUrl: string; embedHtml: string };
  cars: CarRow[];
};

type Method = "channel" | "site";

const copy = {
  ka: {
    title: "ინტეგრაციის მეთოდები",
    hint: "დააკოპირეთ კოდი და გააზიარეთ მენეჯერის არხში სადაც გინდათ, ან ჩასვით თქვენს საიტზე.",
    channel: "მენეჯერის არხი",
    site: "ჩემი საიტი",
    channelHint:
      "თითო მანქანის ბმული ჩასვით ნებისმიერ მენეჯერ არხში — Google Calendar, Localrent, TakeCars ან სხვა. ჯავშანი იქაც დაიბლოკება.",
    siteHint: "ეს კოდი ჩასვით საიტის HTML-ში. სტუმარი დაინახავს თქვენს მანქანებს და გადავა დაჯავშნაზე.",
    pageLink: "საიტის ბმული",
    embed: "ჩასასმელი კოდი",
    copy: "კოპირება",
    copied: "დაკოპირდა",
    empty: "ავტოპარკში მანქანა ჯერ არ არის.",
    loading: "იტვირთება…",
    error: "ინტეგრაციის კოდები ვერ ჩაიტვირთა.",
  },
  en: {
    title: "Integration methods",
    hint: "Copy a code and share it in any channel manager, or place it on your website.",
    channel: "Channel manager",
    site: "My website",
    channelHint:
      "Paste each car link into any channel manager — Google Calendar, Localrent, TakeCars, or another. A booking here blocks those dates there too.",
    siteHint: "Paste this code into your site HTML. Guests see your cars and continue to booking.",
    pageLink: "Page link",
    embed: "Embed code",
    copy: "Copy",
    copied: "Copied",
    empty: "No cars in your fleet yet.",
    loading: "Loading…",
    error: "Could not load integration codes.",
  },
  ru: {
    title: "Методы интеграции",
    hint: "Скопируйте код и вставьте его в канал менеджера, где нужно, или на свой сайт.",
    channel: "Канал менеджера",
    site: "Мой сайт",
    channelHint:
      "Вставьте ссылку каждой машины в любой канал менеджера — Google Calendar, Localrent, TakeCars или другой. Бронь заблокирует эти даты и там.",
    siteHint: "Вставьте этот код в HTML сайта. Гость увидит ваши авто и перейдёт к бронированию.",
    pageLink: "Ссылка на страницу",
    embed: "Код для вставки",
    copy: "Копировать",
    copied: "Скопировано",
    empty: "В автопарке пока нет машин.",
    loading: "Загрузка…",
    error: "Не удалось загрузить коды интеграции.",
  },
  zh: {
    title: "集成方式",
    hint: "复制代码，分享到任意渠道管理器，或放到您的网站上。",
    channel: "渠道管理器",
    site: "我的网站",
    channelHint: "把每辆车的链接粘贴到任意渠道管理器 — Google Calendar、Localrent、TakeCars 或其他。这里的预订也会占住那些日期。",
    siteHint: "把这段代码粘贴到网站 HTML。客人会看到您的车辆并继续预订。",
    pageLink: "页面链接",
    embed: "嵌入代码",
    copy: "复制",
    copied: "已复制",
    empty: "车队里还没有车。",
    loading: "加载中…",
    error: "无法加载集成代码。",
  },
  tr: {
    title: "Entegrasyon yöntemleri",
    hint: "Kodu kopyalayıp herhangi bir kanal yöneticisinde paylaşın veya sitenize yerleştirin.",
    channel: "Kanal yöneticisi",
    site: "Web sitem",
    channelHint: "Her araç bağlantısını bir kanal yöneticisine yapıştırın — Google Calendar, Localrent, TakeCars veya başka. Buradaki rezervasyon o tarihleri orada da kapatır.",
    siteHint: "Bu kodu sitenizin HTML'ine yapıştırın. Misafirler araçlarınızı görür ve rezervasyona geçer.",
    pageLink: "Sayfa bağlantısı",
    embed: "Gömme kodu",
    copy: "Kopyala",
    copied: "Kopyalandı",
    empty: "Filoda henüz araç yok.",
    loading: "Yükleniyor…",
    error: "Entegrasyon kodları yüklenemedi.",
  },
  de: {
    title: "Integrationsmethoden",
    hint: "Kopieren Sie einen Code und teilen Sie ihn in einem Kanalmanager oder auf Ihrer Website.",
    channel: "Kanalmanager",
    site: "Meine Website",
    channelHint: "Fügen Sie jeden Autolink in einen Kanalmanager ein — Google Calendar, Localrent, TakeCars oder einen anderen. Eine Buchung sperrt die Daten auch dort.",
    siteHint: "Fügen Sie diesen Code in das HTML Ihrer Seite ein. Gäste sehen Ihre Autos und buchen weiter.",
    pageLink: "Seitenlink",
    embed: "Einbettungscode",
    copy: "Kopieren",
    copied: "Kopiert",
    empty: "Noch keine Autos in der Flotte.",
    loading: "Laden…",
    error: "Integrationscodes konnten nicht geladen werden.",
  },
  es: {
    title: "Métodos de integración",
    hint: "Copie un código y compártalo en un gestor de canales o en su web.",
    channel: "Gestor de canales",
    site: "Mi web",
    channelHint: "Pegue el enlace de cada coche en cualquier gestor — Google Calendar, Localrent, TakeCars u otro. Una reserva bloquea esas fechas también allí.",
    siteHint: "Pegue este código en el HTML de su web. Los huéspedes ven sus coches y siguen a la reserva.",
    pageLink: "Enlace de la página",
    embed: "Código para insertar",
    copy: "Copiar",
    copied: "Copiado",
    empty: "Aún no hay coches en la flota.",
    loading: "Cargando…",
    error: "No se pudieron cargar los códigos.",
  },
  fr: {
    title: "Méthodes d'intégration",
    hint: "Copiez un code et partagez-le dans un channel manager ou sur votre site.",
    channel: "Channel manager",
    site: "Mon site",
    channelHint: "Collez le lien de chaque voiture dans un channel manager — Google Calendar, Localrent, TakeCars ou un autre. Une réservation bloque aussi ces dates là-bas.",
    siteHint: "Collez ce code dans le HTML du site. Les visiteurs voient vos voitures et passent à la réservation.",
    pageLink: "Lien de la page",
    embed: "Code d'intégration",
    copy: "Copier",
    copied: "Copié",
    empty: "Aucune voiture dans la flotte.",
    loading: "Chargement…",
    error: "Impossible de charger les codes.",
  },
  it: {
    title: "Metodi di integrazione",
    hint: "Copia un codice e condividilo in un channel manager o sul sito.",
    channel: "Channel manager",
    site: "Il mio sito",
    channelHint: "Incolla il link di ogni auto in un channel manager. Una prenotazione blocca quelle date anche lì.",
    siteHint: "Incolla questo codice nell'HTML del sito. Gli ospiti vedono le auto e proseguono alla prenotazione.",
    pageLink: "Link della pagina",
    embed: "Codice da incorporare",
    copy: "Copia",
    copied: "Copiato",
    empty: "Nessuna auto nella flotta.",
    loading: "Caricamento…",
    error: "Impossibile caricare i codici.",
  },
  nl: {
    title: "Integratiemethoden",
    hint: "Kopieer een code en deel die in een channel manager of op je site.",
    channel: "Channel manager",
    site: "Mijn website",
    channelHint: "Plak elke autolink in een channel manager. Een boeking blokkeert die data ook daar.",
    siteHint: "Plak deze code in de HTML van je site. Gasten zien je auto's en gaan door naar boeken.",
    pageLink: "Paginlink",
    embed: "Insluitcode",
    copy: "Kopiëren",
    copied: "Gekopieerd",
    empty: "Nog geen auto's in de vloot.",
    loading: "Laden…",
    error: "Integratiecodes konden niet worden geladen.",
  },
  pl: {
    title: "Metody integracji",
    hint: "Skopiuj kod i udostępnij go w menedżerze kanałów lub na stronie.",
    channel: "Menedżer kanałów",
    site: "Moja strona",
    channelHint: "Wklej link każdego auta do menedżera kanałów. Rezerwacja zablokuje te daty także tam.",
    siteHint: "Wklej ten kod do HTML strony. Goście zobaczą auta i przejdą do rezerwacji.",
    pageLink: "Link strony",
    embed: "Kod osadzenia",
    copy: "Kopiuj",
    copied: "Skopiowano",
    empty: "We flocie nie ma jeszcze aut.",
    loading: "Ładowanie…",
    error: "Nie udało się wczytać kodów.",
  },
  ar: {
    title: "طرق الدمج",
    hint: "انسخ الرمز وشاركه في مدير القنوات أو ضعه في موقعك.",
    channel: "مدير القنوات",
    site: "موقعي",
    channelHint: "الصق رابط كل سيارة في أي مدير قنوات. الحجز هنا يحجز التواريخ هناك أيضًا.",
    siteHint: "الصق هذا الرمز في HTML الموقع. يرى الضيف سياراتك ويتابع الحجز.",
    pageLink: "رابط الصفحة",
    embed: "رمز التضمين",
    copy: "نسخ",
    copied: "تم النسخ",
    empty: "لا سيارات في الأسطول بعد.",
    loading: "جارٍ التحميل…",
    error: "تعذر تحميل رموز الدمج.",
  },
  ko: {
    title: "연동 방법",
    hint: "코드를 복사해 채널 관리자에 공유하거나 웹사이트에 넣으세요.",
    channel: "채널 관리자",
    site: "내 웹사이트",
    channelHint: "각 차량 링크를 채널 관리자에 붙여 넣으세요. 여기서 예약하면 그 날짜도 막힙니다.",
    siteHint: "이 코드를 사이트 HTML에 붙여 넣으세요. 손님이 차량을 보고 예약으로 이동합니다.",
    pageLink: "페이지 링크",
    embed: "삽입 코드",
    copy: "복사",
    copied: "복사됨",
    empty: "차량이 아직 없습니다.",
    loading: "불러오는 중…",
    error: "연동 코드를 불러오지 못했습니다.",
  },
  th: {
    title: "วิธีเชื่อมต่อ",
    hint: "คัดลอกรหัสแล้วแชร์ในตัวจัดการช่องทาง หรือวางบนเว็บไซต์",
    channel: "ตัวจัดการช่องทาง",
    site: "เว็บไซต์ของฉัน",
    channelHint: "วางลิงก์รถแต่ละคันในตัวจัดการช่องทาง การจองที่นี่จะบล็อกวันนั้นที่นั่นด้วย",
    siteHint: "วางรหัสนี้ใน HTML ของเว็บ แขกจะเห็นรถและไปจองต่อ",
    pageLink: "ลิงก์หน้า",
    embed: "รหัสฝัง",
    copy: "คัดลอก",
    copied: "คัดลอกแล้ว",
    empty: "ยังไม่มีรถในกองรถ",
    loading: "กำลังโหลด…",
    error: "โหลดรหัสเชื่อมต่อไม่ได้",
  },
} as const;

function CopyButton({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

export function PartnerIntegrationPanel() {
  const { locale } = usePartnerLocale();
  const t = (copy as unknown as Record<string, (typeof copy)["en"]>)[locale] ?? copy.en;
  const [method, setMethod] = useState<Method>("channel");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/integration", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        return (await res.json()) as Payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t.error);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t.error]);

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">{t.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-white/80">{t.hint}</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["channel", t.channel],
              ["site", t.site],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={
                method === id
                  ? "rounded-lg bg-[#1d6fe8] px-4 py-2 text-sm font-bold text-white"
                  : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-sky-300"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {loading ? <p className="text-sm text-slate-500">{t.loading}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && !error && method === "channel" ? (
            <div>
              <p className="text-sm leading-relaxed text-slate-600">{t.channelHint}</p>
              {data && data.cars.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{t.empty}</p>
              ) : null}
              <ul className="mt-4 space-y-3">
                {data?.cars.map((car) => (
                  <li key={car.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-sm font-bold text-[#0b1f4b]">
                      {car.label}
                      {car.registrationNumber ? ` · ${car.registrationNumber}` : ""}
                    </p>
                    <div className="mt-2 flex items-start gap-2">
                      <pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
                        {car.channelUrl}
                      </pre>
                      <CopyButton value={car.channelUrl} copyLabel={t.copy} copiedLabel={t.copied} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!loading && !error && method === "site" && data ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">{t.siteHint}</p>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.pageLink}</p>
                  <CopyButton value={data.website.pageUrl} copyLabel={t.copy} copiedLabel={t.copied} />
                </div>
                <pre className="overflow-auto whitespace-pre-wrap break-all rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-800">
                  {data.website.pageUrl}
                </pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.embed}</p>
                  <CopyButton value={data.website.embedHtml} copyLabel={t.copy} copiedLabel={t.copied} />
                </div>
                <pre className="overflow-auto whitespace-pre-wrap break-all rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-800">
                  {data.website.embedHtml}
                </pre>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
