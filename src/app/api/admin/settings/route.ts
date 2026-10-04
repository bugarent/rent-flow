import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import { europeAndAsiaCountries } from "@/lib/catalog/world-countries";
import { savePlatformSettings } from "@/lib/server/platform-settings-store";

const allowedIso2 = new Set(europeAndAsiaCountries().map((c) => c.iso2));

const schema = z
  .object({
  depositPercent: z.number().int().min(DEPOSIT_MIN_PERCENT).max(DEPOSIT_MAX_PERCENT),
  siteDiscountPercent: z.number().int().min(0).max(DEPOSIT_MAX_PERCENT).optional(),
  telegramBotSiteName: z.string().min(2).max(80),
  eurUsdRate: z.number().positive(),
  eurGbpRate: z.number().positive(),
  eurGelRate: z.number().positive(),
  eurRubRate: z.number().positive().optional(),
  googleMapsUrl: z
    .string()
    .max(2000)
    .refine((v) => !v.trim() || /^https?:\/\/.+/i.test(v.trim()), {
      message: "Enter a valid http(s) URL or leave empty",
    }),
  partnerOperatingCountryIso2s: z.array(z.string().length(2)).optional(),
  siteContractUrl: z.string().max(2000).optional(),
  adminTelegramChatId: z.string().max(64).optional(),
  telegramBotToken: z.string().max(200).optional(),
  telegramBotUsername: z.string().max(64).optional(),
  openaiApiKey: z.string().max(200).optional(),
  })
  .refine((v) => (v.siteDiscountPercent ?? 0) <= v.depositPercent, {
    path: ["siteDiscountPercent"],
    message: "Site discount cannot exceed the commission percent",
  });

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const partnerOperatingCountryIso2s = [
      ...new Set((body.partnerOperatingCountryIso2s ?? []).map((iso2) => iso2.toUpperCase())),
    ].filter((iso2) => allowedIso2.has(iso2));
    const catalogSize = allowedIso2.size;
    const storedCountries =
      partnerOperatingCountryIso2s.length === 0 || partnerOperatingCountryIso2s.length === catalogSize
        ? []
        : partnerOperatingCountryIso2s;

    const settings = await savePlatformSettings({
      depositPercent: body.depositPercent,
      ...(body.siteDiscountPercent !== undefined
        ? { siteDiscountPercent: body.siteDiscountPercent }
        : {}),
      telegramBotSiteName: body.telegramBotSiteName,
      eurUsdRate: body.eurUsdRate,
      eurGbpRate: body.eurGbpRate,
      eurGelRate: body.eurGelRate,
      ...(body.eurRubRate != null ? { eurRubRate: body.eurRubRate } : {}),
      googleMapsUrl: body.googleMapsUrl.trim(),
      partnerOperatingCountryIso2s: storedCountries,
      ...(body.siteContractUrl !== undefined
        ? { siteContractUrl: body.siteContractUrl.trim() }
        : {}),
      ...(body.adminTelegramChatId !== undefined
        ? { adminTelegramChatId: body.adminTelegramChatId.trim() }
        : {}),
      ...(body.telegramBotUsername !== undefined
        ? { telegramBotUsername: body.telegramBotUsername.trim().replace(/^@/, "") }
        : {}),
      ...(body.telegramBotToken !== undefined && body.telegramBotToken.trim()
        ? { telegramBotToken: body.telegramBotToken.trim() }
        : {}),
      ...(body.openaiApiKey !== undefined && body.openaiApiKey.trim()
        ? { openaiApiKey: body.openaiApiKey.trim() }
        : {}),
    });

    return NextResponse.json({
      ok: true,
      depositPercent: settings.depositPercent,
      siteDiscountPercent: settings.siteDiscountPercent,
      telegramBotSiteName: settings.telegramBotSiteName,
      eurUsdRate: settings.eurUsdRate,
      eurGbpRate: settings.eurGbpRate,
      eurGelRate: settings.eurGelRate,
      googleMapsUrl: settings.googleMapsUrl,
      partnerOperatingCountryIso2s: settings.partnerOperatingCountryIso2s,
      siteContractUrl: settings.siteContractUrl,
      adminTelegramChatId: settings.adminTelegramChatId,
      telegramBotUsername: settings.telegramBotUsername,
      telegramBotTokenSet: Boolean(settings.telegramBotToken.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim()),
      openaiApiKeySet: Boolean(settings.openaiApiKey.trim() || process.env.OPENAI_API_KEY?.trim()),
      fxRates: {
        eurUsd: settings.eurUsdRate,
        eurGbp: settings.eurGbpRate,
        eurGel: settings.eurGelRate,
        eurRub: settings.eurRubRate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = String(issue.path[0] || "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json(
        { error: "Invalid settings", fieldErrors },
        { status: 400 },
      );
    }
    console.error("[admin/settings PATCH]", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
