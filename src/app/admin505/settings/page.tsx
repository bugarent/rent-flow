import { AdminSettingsForm } from "@/components/admin/settings-form";
import { AdminAccountForm } from "@/components/admin/account-form";
import { requireAdmin } from "@/lib/auth/guards";
import { loadLocalAdminAsync, revealAdminPassword, saveLocalAdminAsync } from "@/lib/auth/local-admin-store";
import { AdminPageHeading, AdminPlatformTitle } from "@/components/admin/admin-page-heading";
import { ensureDailyFxRates } from "@/lib/server/fx-rates-sync";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";

export default async function AdminSettingsPage() {
  const session = await requireAdmin();

  const local = await loadLocalAdminAsync();
  let email = session.user.email ?? local?.email ?? "";
  let passwordHash = local?.passwordHash ?? "";
  await ensureDailyFxRates().catch(() => undefined);
  const settings = await getPlatformSettings();

  try {
    const { prisma } = await import("@/lib/prisma");
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, passwordHash: true },
    });
    if (admin?.email) email = admin.email;
    if (admin?.passwordHash) passwordHash = admin.passwordHash;
  } catch {
    email = local?.email ?? email;
  }

  const currentPassword = revealAdminPassword(passwordHash, local?.passwordPlain);
  if (currentPassword && local?.passwordPlain !== currentPassword) {
    try {
      await saveLocalAdminAsync({
        ...(email ? { email } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        passwordPlain: currentPassword,
      });
    } catch {
      /* Show the recovered password even if the mirror write fails. */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <section>
        <AdminPageHeading
          page="settings"
          className="mb-6"
          titleClassName="mb-2 text-3xl font-extrabold"
          bodyClassName="text-sm text-slate-600"
        />
        <AdminAccountForm email={email} currentPassword={currentPassword} />
      </section>

      <section>
        <AdminPlatformTitle />
        <AdminSettingsForm
          depositPercent={settings.depositPercent}
          siteDiscountPercent={settings.siteDiscountPercent}
          telegramBotSiteName={settings.telegramBotSiteName}
          eurUsdRate={settings.eurUsdRate}
          eurGbpRate={settings.eurGbpRate}
          eurGelRate={settings.eurGelRate}
          eurRubRate={settings.eurRubRate}
          fxRatesUpdatedAt={settings.fxRatesUpdatedAt}
          googleMapsUrl={settings.googleMapsUrl}
          partnerOperatingCountryIso2s={settings.partnerOperatingCountryIso2s}
          siteContractUrl={settings.siteContractUrl}
          adminTelegramChatId={settings.adminTelegramChatId}
          telegramBotUsername={settings.telegramBotUsername}
          telegramBotTokenSet={Boolean(
            settings.telegramBotToken.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim(),
          )}
          openaiApiKeySet={Boolean(
            settings.openaiApiKey.trim() || process.env.OPENAI_API_KEY?.trim(),
          )}
        />
      </section>
    </div>
  );
}
