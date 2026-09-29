import { PartnerCreateCarForm } from "@/components/partner/partner-create-car-form";
import { requirePartner } from "@/lib/auth/guards";
import { LOCAL_PARTNER_ID } from "@/lib/auth/local-partner-store";
import { prisma } from "@/lib/prisma";
import { listPartnerScopedDeliveryLocations } from "@/lib/server/delivery-locations";
import { listExtraServices } from "@/lib/server/extras-store";
import { readPartnerExtraPrefs } from "@/lib/server/partner-extras-prefs-store";
import { isMandatoryFreeExtra, type ExtraServicePricing } from "@/lib/extras/pricing";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePartner();
  let initialDeliveryCatalog: DeliveryLocationView[] = [];
  let initialExtrasCatalog: ExtraServicePricing[] = [];

  try {
    let partnerId = LOCAL_PARTNER_ID;
    try {
      const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
      if (partner?.id) partnerId = partner.id;
      else if (session.user.id === LOCAL_PARTNER_ID) partnerId = LOCAL_PARTNER_ID;
      else partnerId = session.user.id;
    } catch {
      partnerId =
        session.user.id === LOCAL_PARTNER_ID ? LOCAL_PARTNER_ID : session.user.id || LOCAL_PARTNER_ID;
    }
    const [delivery, extras, prefs] = await Promise.all([
      listPartnerScopedDeliveryLocations(partnerId),
      listExtraServices({ activeOnly: true }),
      readPartnerExtraPrefs(partnerId),
    ]);
    initialDeliveryCatalog = delivery;
    const enabledIds = new Set(
      prefs.filter((p) => p.enabled || p.forbidden).map((p) => p.extraServiceId),
    );
    const hasPrefs = prefs.length > 0;
    initialExtrasCatalog = extras.filter((service) => {
      if (isMandatoryFreeExtra(service)) return true;
      if (!hasPrefs) return false;
      return enabledIds.has(service.id);
    });
  } catch {
    initialDeliveryCatalog = [];
    try {
      const extras = await listExtraServices({ activeOnly: true });
      initialExtrasCatalog = extras.filter((s) => isMandatoryFreeExtra(s));
    } catch {
      initialExtrasCatalog = [];
    }
  }

  return (
    <PartnerCreateCarForm
      carId={id}
      initialDeliveryCatalog={initialDeliveryCatalog}
      initialExtrasCatalog={initialExtrasCatalog}
    />
  );
}
