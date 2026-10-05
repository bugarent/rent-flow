import { requireAdmin } from "@/lib/auth/guards";
import {
  ensureHomepageDefaults,
  getHomepageAirports,
  getHomepageCategories,
  getPopularAirportsLayoutSetting,
} from "@/lib/server/homepage";
import { getHomepageInfoContent } from "@/lib/server/homepage-info-blocks-store";
import { getHomepageGoogleReviewsConfig } from "@/lib/server/homepage-google-reviews-store";
import { getCustomBookingChannelsConfig } from "@/lib/server/custom-booking-channels-store";
import { getFooterContactConfig } from "@/lib/server/footer-contact-store";
import { getLegalPagesConfig } from "@/lib/server/legal-pages-store";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import {
  botsForAdminUi,
  getTelegramLiveBotsConfig,
} from "@/lib/server/telegram-live-bots-store";
import { HomepageContentManager } from "@/components/admin/homepage-content-manager";
import { HomepageInfoBlocksManager } from "@/components/admin/homepage-info-blocks-manager";
import { HomepageGoogleReviewsManager } from "@/components/admin/homepage-google-reviews-manager";
import { FooterContactManager } from "@/components/admin/footer-contact-manager";
import { LegalPagesManager } from "@/components/admin/legal-pages-manager";
import { CustomBookingChannelsManager } from "@/components/admin/custom-booking-channels-manager";
import { TelegramLiveBotsManager } from "@/components/admin/telegram-live-bots-manager";
import { BookingMailManager } from "@/components/admin/booking-mail-manager";
import { readBookingMailFrom } from "@/lib/server/booking-mail-from";
import { LiveChatTelegramBotManager } from "@/components/admin/live-chat-telegram-bot-manager";
import {
  getLiveChatTelegramBot,
  liveChatBotForAdminUi,
} from "@/lib/server/live-chat-telegram-bot-store";
import { HomepageSearchCountries } from "@/components/admin/homepage-search-countries";
import { AdminPageHeading, AdminSearchCountriesHeading } from "@/components/admin/admin-page-heading";

export default async function AdminOperationsHomePage() {
  await requireAdmin();
  try {
    await ensureHomepageDefaults();
  } catch {
    /* database may be offline */
  }
  const [
    categories,
    airports,
    airportsLayout,
    infoContent,
    googleReviews,
    bookingChannels,
    telegramLiveBots,
    bookingMailFrom,
    liveChatBot,
    footerContact,
    legalPages,
    searchLocations,
  ] = await Promise.all([
    getHomepageCategories(),
    getHomepageAirports(),
    getPopularAirportsLayoutSetting(),
    getHomepageInfoContent(),
    getHomepageGoogleReviewsConfig(),
    getCustomBookingChannelsConfig(),
    getTelegramLiveBotsConfig().then(botsForAdminUi),
    readBookingMailFrom(),
    getLiveChatTelegramBot().then(liveChatBotForAdminUi),
    getFooterContactConfig(),
    getLegalPagesConfig(),
    listDeliveryLocations(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6">
      <AdminPageHeading page="homepage" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 space-y-3">
          <TelegramLiveBotsManager initial={telegramLiveBots} />
          <BookingMailManager initialFromEmail={bookingMailFrom} />
          <LiveChatTelegramBotManager initial={liveChatBot} />
        </div>
        <div className="min-w-0">
          <HomepageGoogleReviewsManager initial={googleReviews} />
        </div>
        <div className="min-w-0">
          <FooterContactManager initial={footerContact} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <LegalPagesManager initial={legalPages} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <CustomBookingChannelsManager initial={bookingChannels} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <AdminSearchCountriesHeading />
            <HomepageSearchCountries initialLocations={searchLocations} compact />
          </section>
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <HomepageInfoBlocksManager initial={infoContent} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <HomepageContentManager
            initialCategories={categories}
            initialAirports={airports}
            initialAirportsLayout={airportsLayout}
          />
        </div>
      </div>
    </div>
  );
}
