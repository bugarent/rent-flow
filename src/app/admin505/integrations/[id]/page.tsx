import { requireAdmin } from "@/lib/auth/guards";
import { IntegrationDetailPanel } from "@/components/admin/integration-detail-panel";

export default async function AdminIntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  await requireAdmin();
  const resolved = await Promise.resolve(params);
  return <IntegrationDetailPanel integrationId={decodeURIComponent(resolved.id)} />;
}
