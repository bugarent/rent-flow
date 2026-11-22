import { after } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { PartnerEquipmentServicePanel } from "@/components/partner/partner-equipment-service-panel";
import { listExtraServices, scheduleExtraCopyTranslations } from "@/lib/server/extras-store";
import { scopeExtrasToPartner } from "@/lib/server/extras/partner-country-scope";
import { withTplPartnerChoice } from "@/lib/extras/tpl-partner-choice";
import { partnerMayToggleTpl } from "@/lib/server/tpl-partner-choice-store";
import { prisma } from "@/lib/prisma";

export default async function PartnerEquipmentServicePage() {
  const session = await requirePartner();
  after(() => scheduleExtraCopyTranslations());
  let catalog: Awaited<ReturnType<typeof listExtraServices>> = [];
  try {
    const [services, partner] = await Promise.all([
      listExtraServices({ activeOnly: true }),
      prisma.partner.findUnique({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
    ]);
    const partnerId = partner?.id || session.user.id;
    const [scoped, canToggleTpl] = await Promise.all([
      scopeExtrasToPartner(services, partnerId),
      partnerMayToggleTpl(partnerId),
    ]);
    catalog = withTplPartnerChoice(scoped, canToggleTpl);
  } catch {
    catalog = [];
  }
  return <PartnerEquipmentServicePanel catalog={catalog} />;
}
