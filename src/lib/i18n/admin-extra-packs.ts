import type { AdminExtra } from "@/lib/i18n/admin-dictionary-partial";
import { arAdminExtra } from "@/lib/i18n/admin-extras/ar";
import { deAdminExtra } from "@/lib/i18n/admin-extras/de";
import { esAdminExtra } from "@/lib/i18n/admin-extras/es";
import { frAdminExtra } from "@/lib/i18n/admin-extras/fr";
import { itAdminExtra } from "@/lib/i18n/admin-extras/it";
import { koAdminExtra } from "@/lib/i18n/admin-extras/ko";
import { nlAdminExtra } from "@/lib/i18n/admin-extras/nl";
import { plAdminExtra } from "@/lib/i18n/admin-extras/pl";
import { thAdminExtra } from "@/lib/i18n/admin-extras/th";
import { trAdminExtra } from "@/lib/i18n/admin-extras/tr";
import { zhAdminExtra } from "@/lib/i18n/admin-extras/zh";

export const adminExtraPacks: Record<string, AdminExtra> = {
  ar: arAdminExtra,
  de: deAdminExtra,
  es: esAdminExtra,
  fr: frAdminExtra,
  it: itAdminExtra,
  ko: koAdminExtra,
  nl: nlAdminExtra,
  pl: plAdminExtra,
  th: thAdminExtra,
  tr: trAdminExtra,
  zh: zhAdminExtra,
};
