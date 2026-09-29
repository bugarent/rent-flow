"use client";

import { RefundChangeDetailsView } from "@/components/admin/refund-change-details-view";
import type { BookingInvoiceDocument } from "@/lib/invoices/types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(
      locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}

function money(n: number) {
  return `€${Number(n).toFixed(2)}`;
}

function copy(locale: string) {
  if (locale === "ka") {
    return {
      invoice: "ინვოისი",
      creditNotes: "კრედიტ-ნოტები / დაბრუნებები",
      billTo: "მიმღები",
      from: "გამცემი",
      service: "სერვისი",
      period: "პერიოდი",
      pickup: "აღება",
      dropoff: "დაბრუნება",
      days: "დღეები",
      description: "აღწერა",
      qty: "რაოდ.",
      unit: "ერთეული",
      amount: "თანხა",
      subtotal: "საერთო ჯამი",
      siteFee: "საიტის საკომისიო",
      cardFee: "ბარათის საკომისიო",
      total: "სულ გადასახდელი",
      paid: "ონლაინ გადახდილი",
      balance: "მანქანის აღებისას გადახდილია",
      payments: "გადახდის დეტალები",
      method: "მეთოდი",
      taxId: "საიდენტიფიკაციო / VAT",
      bank: "ბანკი",
      iban: "IBAN",
      bic: "BIC/SWIFT",
      pending: "მოლოდინში",
      refunded: "დაბრუნებული",
      creditTotal: "დასაბრუნებელი სულ",
      creditPending: "მოლოდინში დაბრუნება",
      creditDone: "უკვე დაბრუნებული",
      booking: "ჯავშანი",
      issued: "გაცემის თარიღი",
      status: "სტატუსი",
      shareHint: "კლიენტის ლინკი",
      paymentOriginal: "საწყისი გადახდა (ბარათი)",
      netAfterCredit: "კრედიტ-ნოტების შემდეგ",
    };
  }
  if (locale === "ru") {
    return {
      invoice: "Инвойс",
      creditNotes: "Кредит-ноты / возвраты",
      billTo: "Получатель",
      from: "Отправитель",
      service: "Услуга",
      period: "Период",
      pickup: "Получение",
      dropoff: "Возврат",
      days: "Дни",
      description: "Описание",
      qty: "Кол-во",
      unit: "Цена",
      amount: "Сумма",
      subtotal: "Итого",
      siteFee: "Комиссия сайта",
      cardFee: "Комиссия карты",
      total: "К оплате",
      paid: "Оплачено онлайн",
      balance: "К оплате на месте",
      payments: "Платежи",
      method: "Метод",
      taxId: "ИНН / VAT",
      bank: "Банк",
      iban: "IBAN",
      bic: "BIC/SWIFT",
      pending: "Ожидает",
      refunded: "Возвращено",
      creditTotal: "Всего к возврату",
      creditPending: "Ожидает возврата",
      creditDone: "Уже возвращено",
      booking: "Бронь",
      issued: "Дата",
      status: "Статус",
      shareHint: "Ссылка для клиента",
      paymentOriginal: "Исходный платёж (карта)",
      netAfterCredit: "После кредит-нот",
    };
  }
  return {
    invoice: "Invoice",
    creditNotes: "Credit notes / refunds",
    billTo: "Recipient",
    from: "Issued by",
    service: "Service",
    period: "Period",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    days: "Days",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    amount: "Amount",
    subtotal: "Subtotal",
    siteFee: "Site fee",
    cardFee: "Card surcharge",
    total: "Total due",
    paid: "Paid online",
    balance: "Balance at pick-up",
    payments: "Payment details",
    method: "Method",
    taxId: "Tax / VAT ID",
    bank: "Bank",
    iban: "IBAN",
    bic: "BIC/SWIFT",
    pending: "Pending",
    refunded: "Refunded",
    creditTotal: "Total credit",
    creditPending: "Pending refund",
    creditDone: "Already refunded",
    booking: "Booking",
    issued: "Issued",
    status: "Status",
    shareHint: "Client link",
    paymentOriginal: "Original payment (card)",
    netAfterCredit: "After credit notes",
  };
}

function statusLabel(status: string, locale: string) {
  const s = String(status || "").toUpperCase();
  if (locale === "ka") {
    if (s === "CONFIRMED" || s === "ACTIVE") return "აქტიური";
    if (s === "CANCELLED" || s === "CANCELED") return "გაუქმებული";
    if (s === "COMPLETED") return "დასრულებული";
    if (s === "PENDING") return "მოლოდინში";
  }
  if (locale === "ru") {
    if (s === "CONFIRMED" || s === "ACTIVE") return "Активна";
    if (s === "CANCELLED" || s === "CANCELED") return "Отменена";
    if (s === "COMPLETED") return "Завершена";
    if (s === "PENDING") return "Ожидает";
  }
  return status;
}

function paymentSourceLabel(source: string, locale: string, t: ReturnType<typeof copy>) {
  const raw = String(source || "").trim();
  if (!raw || raw === "original-payment") return t.paymentOriginal;
  return raw;
}

export function BookingInvoiceDocumentView({
  doc,
  locale = "en",
  className,
}: {
  doc: BookingInvoiceDocument;
  locale?: string;
  className?: string;
}) {
  const t = copy(locale);
  const issuer = doc.issuer;

  return (
    <article
      className={cn(
        "invoice-print-sheet mx-auto w-full max-w-[820px] bg-white text-[#0b1f4b]",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0b1f4b] pb-4">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={issuer.logoUrl}
            alt=""
            className="h-12 w-12 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="text-xl font-black tracking-tight">{issuer.legalName}</p>
            <p className="text-xs font-semibold text-slate-600">{issuer.tradingName}</p>
            {issuer.address ? <p className="mt-1 text-xs text-slate-600">{issuer.address}</p> : null}
            <p className="text-xs text-slate-600">
              {[issuer.email, issuer.phone].filter(Boolean).join(" · ")}
            </p>
            {issuer.website ? (
              <p className="text-xs text-slate-500">{issuer.website}</p>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {t.invoice}
          </p>
          <p className="font-mono text-lg font-black">{doc.invoiceNumber}</p>
          <p className="mt-1 text-xs text-slate-600">
            {t.booking}: <span className="font-mono font-bold">{doc.bookingRef}</span>
          </p>
          <p className="text-xs text-slate-600">
            {t.issued}: {formatWhen(doc.issuedAt, locale)}
          </p>
          <p className="text-xs text-slate-600">
            {t.status}: {statusLabel(doc.status, locale)}
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.from}</p>
          <p className="mt-1 text-sm font-extrabold">{doc.billTo.name}</p>
          {doc.billTo.email ? <p className="text-xs text-slate-600">{doc.billTo.email}</p> : null}
          {doc.billTo.phone ? <p className="text-xs text-slate-600">{doc.billTo.phone}</p> : null}
        </section>
        <section className="rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.billTo}</p>
          <p className="mt-1 text-sm font-extrabold">{doc.recipientName || issuer.legalName}</p>
          {doc.recipientCode ? (
            <p className="font-mono text-sm font-bold text-[#0b1f4b]">{doc.recipientCode}</p>
          ) : null}
          {issuer.taxId ? (
            <p className="text-xs text-slate-600">
              {t.taxId}: {issuer.taxId}
            </p>
          ) : null}
          {issuer.bankName || issuer.iban ? (
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {issuer.bankName ? (
                <p>
                  {t.bank}: {issuer.bankName}
                </p>
              ) : null}
              {issuer.iban ? (
                <p className="font-mono">
                  {t.iban}: {issuer.iban}
                </p>
              ) : null}
              {issuer.bic ? (
                <p className="font-mono">
                  {t.bic}: {issuer.bic}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.service}</p>
        <p className="mt-1 text-sm font-extrabold">{doc.service.title}</p>
        <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-500">{t.pickup}: </span>
            {doc.service.pickupPlace}
            <br />
            {formatWhen(doc.service.pickupAt, locale)}
          </p>
          <p>
            <span className="font-semibold text-slate-500">{t.dropoff}: </span>
            {doc.service.dropoffPlace}
            <br />
            {formatWhen(doc.service.dropoffAt, locale)}
          </p>
          <p>
            <span className="font-semibold text-slate-500">{t.days}: </span>
            {doc.service.days}
          </p>
        </div>
      </section>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-[#0b1f4b] text-white">
            <tr>
              <th className="px-3 py-2 font-bold">{t.description}</th>
              <th className="px-3 py-2 font-bold text-right">{t.qty}</th>
              <th className="px-3 py-2 font-bold text-right">{t.unit}</th>
              <th className="px-3 py-2 font-bold text-right">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, i) => (
              <tr key={`${line.sku || line.description}-${i}`} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-800">{line.description}</td>
                <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(line.unitPriceEur)}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{money(line.totalEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <p className="text-base font-black text-emerald-800">
          {t.subtotal}: <span className="tabular-nums">{money(doc.subtotalEur)}</span>
        </p>
        <p className="text-slate-600">
          {t.siteFee} ({doc.depositPercent}%):{" "}
          <span className="font-bold tabular-nums text-emerald-700">{money(doc.siteFeeEur)}</span>
        </p>
        {doc.cardSurchargeEur > 0 ? (
          <p className="text-slate-600">
            {t.cardFee} ({doc.cardSurchargePercent}%):{" "}
            <span className="font-bold tabular-nums text-[#0b1f4b]">{money(doc.cardSurchargeEur)}</span>
          </p>
        ) : null}
        <p className="text-slate-600">
          {t.paid}:{" "}
          <span className="font-bold tabular-nums text-emerald-700">{money(doc.onlineDueEur)}</span>
        </p>
        <p className="text-base font-black text-amber-800">
          {t.balance}: <span className="tabular-nums">{money(doc.balanceDueEur)}</span>
        </p>
        {doc.creditNotesTotalEur > 0 ? (
          <p className="text-sm font-bold text-rose-800">
            {t.creditTotal}: <span className="tabular-nums">−{money(doc.creditNotesTotalEur)}</span>
          </p>
        ) : null}
      </div>

      {doc.payments.length ? (
        <section className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.payments}</p>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2">{t.description}</th>
                  <th className="px-3 py-2">{t.method}</th>
                  <th className="px-3 py-2 text-right">{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {doc.payments.map((p, i) => (
                  <tr key={`${p.label}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold">{p.label}</td>
                    <td className="px-3 py-2 text-slate-600">{p.method}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{money(p.amountEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {doc.creditNotes.length ? (
        <section className="mt-6 border-t-2 border-rose-200 pt-4">
          <p className="text-sm font-black uppercase tracking-wide text-rose-800">{t.creditNotes}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
            <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">
              {t.creditTotal}: {money(doc.creditNotesTotalEur)}
            </span>
            {doc.pendingCreditEur > 0 ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900">
                {t.creditPending}: {money(doc.pendingCreditEur)}
              </span>
            ) : null}
            {doc.refundedCreditEur > 0 ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                {t.creditDone}: {money(doc.refundedCreditEur)}
              </span>
            ) : null}
          </div>
          <ul className="mt-3 space-y-3">
            {doc.creditNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-rose-200 bg-rose-50/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-black text-rose-900">{note.number}</p>
                    <p className="text-[11px] text-slate-600">
                      {formatWhen(note.createdAt, locale)}
                      {note.refundedAt ? ` · ${formatWhen(note.refundedAt, locale)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums text-rose-800">
                      −{money(note.amountEur)}
                    </p>
                    <p
                      className={cn(
                        "inline-flex rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase",
                        note.status === "PENDING"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {note.status === "PENDING" ? t.pending : t.refunded}
                    </p>
                  </div>
                </div>
                <div className="mt-2 rounded-md border border-white/80 bg-white/90 px-2 py-1.5">
                  <RefundChangeDetailsView
                    changes={note.changes}
                    fallbackReason={note.reason}
                    locale={locale}
                    showSiteFeeShare
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {paymentSourceLabel(note.paymentSource, locale, t)} · {note.depositPercent}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
        {issuer.legalName} · {issuer.website || issuer.tradingName}
      </footer>
    </article>
  );
}
