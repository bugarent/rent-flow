import type { IntegrationMappingKind, IntegrationMappingRecord } from "@/lib/integrations/types";

export function findMapping(
  mappings: IntegrationMappingRecord[],
  kind: IntegrationMappingKind,
  externalId: string,
): IntegrationMappingRecord | undefined {
  return mappings.find((m) => m.kind === kind && m.externalId === externalId);
}

export function findMappingByInternal(
  mappings: IntegrationMappingRecord[],
  kind: IntegrationMappingKind,
  internalId: string,
): IntegrationMappingRecord | undefined {
  return mappings.find((m) => m.kind === kind && m.internalId === internalId);
}

export function upsertMappingList(
  mappings: IntegrationMappingRecord[],
  next: IntegrationMappingRecord,
): IntegrationMappingRecord[] {
  const idx = mappings.findIndex(
    (m) => m.integrationId === next.integrationId && m.kind === next.kind && m.externalId === next.externalId,
  );
  if (idx >= 0) {
    const copy = [...mappings];
    copy[idx] = next;
    return copy;
  }
  return [...mappings, next];
}
