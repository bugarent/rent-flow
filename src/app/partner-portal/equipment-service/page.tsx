import { requirePartner } from "@/lib/auth/guards";
import { PartnerEquipmentServicePanel } from "@/components/partner/partner-equipment-service-panel";
import { listExtraServices } from "@/lib/server/extras-store";
import { scopeExtrasToPartner } from "@/lib/server/extras/partner-country-scope";
import { prisma } from "@/lib/prisma";

export default async function PartnerEquipmentServicePage() {
  const session = await requirePartner();
  let catalog: Awaited<ReturnType<typeof listExtraServices>> = [];
  try {
    const [services, partner] = await Promise.all([
      listExtraServices({ activeOnly: true }),
      prisma.partner.findUnique({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
    ]);
    catalog = await scopeExtrasToPartner(services, partner?.id || session.user.id);
  } catch {
    catalog = [];
  }
  return <PartnerEquipmentServicePanel catalog={catalog} />;
}
