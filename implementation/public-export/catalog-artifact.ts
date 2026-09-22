import { canonicalBytes, snapshotId } from './canonical';
import { PublicBusinessExportV1 } from './builder';
import { CATALOG_CONTRACT_VERSION, PublicCatalogExportV1 } from './catalog-builder';
import { CatalogMedia, mediaPath } from './media';
import { SignedEnvelope, VerificationKeyProvider, verifyEnvelope } from './signing';

export const CATALOG_FILE = 'public-catalog.v1.json';
export const CATALOG_CAP = 2_000_000;
function fail(code: string): never { throw new Error(code); }
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function exact(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === keys.sort().join(',');
}
function time(value: unknown): number {
  if (typeof value !== 'string') fail('CATALOG_TIMESTAMP');
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail('CATALOG_TIMESTAMP');
  return parsed;
}
export async function verifyCatalogArtifact(raw: Buffer, provider: VerificationKeyProvider,
  business: PublicBusinessExportV1, now: Date, maxAgeMs = 120_000): Promise<PublicCatalogExportV1> {
  if (raw.length > CATALOG_CAP) fail('CATALOG_ARTIFACT_SIZE');
  let root: unknown;
  try { root = JSON.parse(raw.toString('utf8')); } catch { fail('CATALOG_ARTIFACT_SHAPE'); }
  const value = object(root);
  if (!value || !exact(value, ['contract_version', 'generated_at', 'snapshot_id', 'signature', 'records']) ||
      value.contract_version !== CATALOG_CONTRACT_VERSION || !Array.isArray(value.records)) fail('CATALOG_ARTIFACT_SHAPE');
  try { if (!canonicalBytes(value).equals(raw)) fail('CATALOG_ARTIFACT_CANONICAL'); }
  catch { fail('CATALOG_ARTIFACT_CANONICAL'); }
  const generated = time(value.generated_at);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0 ||
      generated > now.getTime() + 30_000 || generated < now.getTime() - maxAgeMs) fail('CATALOG_ARTIFACT_FRESHNESS');
  if (value.generated_at !== business.generated_at ||
      value.snapshot_id !== snapshotId(CATALOG_CONTRACT_VERSION, value.records)) fail('CATALOG_ARTIFACT_BINDING');
  const signature = object(value.signature);
  if (!signature || !exact(signature, ['algorithm', 'key_id', 'value']) ||
      !(await verifyEnvelope(value as SignedEnvelope, provider, 'catalog'))) fail('CATALOG_ARTIFACT_SIGNATURE');
  const byOrg = new Map(business.records.map((record) => [record.business.organization_id, record]));
  const organizations = new Set<string>();
  for (const record of value.records) {
    const entry = object(record);
    if (!entry || !exact(entry, ['organization_id', 'business_snapshot_id', 'business_publication_id', 'items']) ||
        typeof entry.organization_id !== 'string' || organizations.has(entry.organization_id) || !Array.isArray(entry.items)) fail('CATALOG_ARTIFACT_SHAPE');
    organizations.add(entry.organization_id);
    const bound = byOrg.get(entry.organization_id);
    if (!bound || entry.business_snapshot_id !== business.snapshot_id ||
        entry.business_publication_id !== bound.business.publication_id) fail('CATALOG_ARTIFACT_BINDING');
    const visibleOffers = new Set(bound.offers.map((offer) => offer.offer_version_id));
    for (const item of entry.items) {
      const source = object(item);
      if (!source || !Array.isArray(source.media) || !Array.isArray(source.offer_version_links) ||
          source.offer_version_links.some((id: unknown) => typeof id !== 'string' || !visibleOffers.has(id))) fail('CATALOG_ARTIFACT_SHAPE');
      for (const media of source.media) {
        const meta = object(media);
        if (!meta || typeof meta.path !== 'string' || typeof meta.sha256 !== 'string' || typeof meta.media_type !== 'string' ||
            !Number.isInteger(meta.byte_size) || !Number.isInteger(meta.width) || !Number.isInteger(meta.height)) fail('CATALOG_MEDIA_METADATA');
        mediaPath(meta as CatalogMedia);
      }
    }
  }
  return value as PublicCatalogExportV1;
}
