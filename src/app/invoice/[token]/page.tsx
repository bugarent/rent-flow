import { PublicInvoicePage } from "@/components/invoices/public-invoice-page";

export const dynamic = "force-dynamic";

export default async function InvoiceSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const locale = sp.locale === "ka" || sp.locale === "ru" ? sp.locale : "en";
  return <PublicInvoicePage token={token} locale={locale} />;
}
