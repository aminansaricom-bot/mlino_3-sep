import { PrismaClient } from '@prisma/client';
import { canonicalBytes, snapshotId, utcTimestamp } from './canonical';
import { PublicBusinessExportV1 } from './builder';
import { CatalogMedia, readVerifiedMedia } from './media';
import { SignedEnvelope, SigningKeyProvider, signEnvelope } from './signing';

export const CATALOG_CONTRACT_VERSION = 'mlino.v2.public-catalog.v1' as const;
const SNAPSHOT_VERSION = 'core-publication-snapshot-v1';
const MAX_ARTIFACT_BYTES = 2_000_000;
type Item = {
  catalog_item_id: string; item_key: string; name: string; short_description: string | null;
  price_amount: string | null; price_currency: string | null; on_request: boolean;
  grouping_label: string | null; display_order: number; available_from: string | null;
  available_until: string | null; offer_version_links: string[]; media: CatalogMedia[];
  published_at: string; publication_id: string; source_revision: number;
};
export type PublicCatalogRecordV1 = {
  organization_id: string; business_snapshot_id: string; business_publication_id: string; items: Item[];
};
export type PublicCatalogExportV1 = {
  contract_version: typeof CATALOG_CONTRACT_VERSION; generated_at: string; snapshot_id: string;
  signature: { algorithm: 'Ed25519'; key_id: string; value: string }; records: PublicCatalogRecordV1[];
};
export type CatalogBuildIssue = { code: string; organization_id?: string; publication_id?: string };
export type CatalogBuildOptions = {
  asOf: Date | string; keyId: string; signingKeyProvider: SigningKeyProvider;
  businessArtifact: PublicBusinessExportV1; mediaStoreDir?: string;
  onIssue?: (issue: CatalogBuildIssue) => void;
};
type Event = {
  id: string; organizationId: string; catalogItemId: string | null;
  eventKind: 'PUBLISHED' | 'WITHDRAWN'; publishedContent: unknown;
  contentRevision: number | null; occurredAt: Date;
};
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function compare(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left.normalize('NFC')), Buffer.from(right.normalize('NFC')));
}
function nullableString(value: unknown): value is string | null { return value === null || typeof value === 'string'; }
function optionalTime(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function parseMedia(value: unknown): CatalogMedia[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const result: CatalogMedia[] = [];
  for (const entry of value) {
    const media = object(entry);
    if (!media || !Number.isInteger(media.position) || typeof media.path !== 'string' || typeof media.sha256 !== 'string' ||
        !['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(String(media.media_type)) ||
        !Number.isInteger(media.byte_size) || !Number.isInteger(media.width) || !Number.isInteger(media.height) ||
        typeof media.alt_text !== 'string' || !media.alt_text.trim() || media.alt_text.length > 300) return null;
    const placeholder = media.placeholder;
    const parsed = placeholder === null ? null : object(placeholder);
    if (placeholder !== null && (!parsed || parsed.schema_version !== 'mlino.blurhash.v1' || typeof parsed.value !== 'string' || !parsed.value.trim() || parsed.value.length > 256)) return null;
    result.push({ position: media.position as number, path: media.path, sha256: media.sha256, media_type: media.media_type as CatalogMedia['media_type'], byte_size: media.byte_size as number, width: media.width as number, height: media.height as number, alt_text: media.alt_text, placeholder: parsed ? { schema_version: parsed.schema_version as string, value: parsed.value as string } : null });
  }
  if (new Set(result.map((m) => m.position)).size !== result.length || result.reduce((sum, m) => sum + m.byte_size, 0) > 8_000_000) return null;
  return result.sort((a, b) => a.position - b.position || compare(a.sha256, b.sha256));
}
function parseItem(event: Event, asOf: Date, visibleOffers: Set<string>): Item | null {
  const envelope = object(event.publishedContent);
  const content = envelope?.snapshot_version === SNAPSHOT_VERSION ? object(envelope.content) : null;
  if (!content || !event.catalogItemId || event.contentRevision === null ||
      typeof content.item_key !== 'string' || !content.item_key.trim() ||
      typeof content.name !== 'string' || !content.name.trim() || !nullableString(content.short_description) ||
      !nullableString(content.price_amount) || !nullableString(content.price_currency) ||
      typeof content.on_request !== 'boolean' || !nullableString(content.grouping_label) ||
      !Number.isSafeInteger(content.display_order) || (content.display_order as number) < 0 ||
      !optionalTime(content.available_from) || !optionalTime(content.available_until) ||
      !Array.isArray(content.offer_version_links) || !content.offer_version_links.every((id) => typeof id === 'string')) return null;
  const from = content.available_from as string | null;
  const until = content.available_until as string | null;
  if ((from && new Date(from) > asOf) || (until && new Date(until) <= asOf)) return null;
  const media = parseMedia(content.media);
  if (!media) return null;
  return {
    catalog_item_id: event.catalogItemId, item_key: content.item_key, name: content.name,
    short_description: content.short_description, price_amount: content.price_amount,
    price_currency: content.price_currency, on_request: content.on_request,
    grouping_label: content.grouping_label, display_order: content.display_order as number,
    available_from: from, available_until: until,
    offer_version_links: [...new Set((content.offer_version_links as string[]).filter((id) => visibleOffers.has(id)))].sort(),
    media, published_at: utcTimestamp(event.occurredAt), publication_id: event.id,
    source_revision: event.contentRevision,
  };
}
export async function buildPublicCatalogExport(db: PrismaClient, options: CatalogBuildOptions): Promise<{ artifact: PublicCatalogExportV1; bytes: Buffer }> {
  const asOf = new Date(utcTimestamp(options.asOf));
  if (options.businessArtifact.contract_version !== 'mlino.v2.public-business.v1' || options.businessArtifact.generated_at !== asOf.toISOString()) throw new Error('CATALOG_BUSINESS_BINDING');
  const emit = (code: string, organization_id?: string, publication_id?: string) => {
    const issue: CatalogBuildIssue = { code };
    if (organization_id !== undefined) issue.organization_id = organization_id;
    if (publication_id !== undefined) issue.publication_id = publication_id;
    options.onIssue?.(issue);
  };
  const records = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const [events, items, organizations] = await Promise.all([
      tx.publication.findMany({ where: { occurredAt: { lte: asOf }, catalogItemId: { not: null } }, select: { id: true, organizationId: true, catalogItemId: true, eventKind: true, publishedContent: true, contentRevision: true, occurredAt: true } }),
      tx.catalogItem.findMany({ select: { id: true, organizationId: true, lifecycleStatus: true } }),
      tx.organization.findMany({ select: { id: true, lifecycleStatus: true } }),
    ]);
    const live = new Map(items.map((row) => [row.id, row]));
    const activeOrganizations = new Set(organizations.filter((row) => row.lifecycleStatus === 'ACTIVE').map((row) => row.id));
    const latest = new Map<string, Event>();
    for (const row of events as Event[]) {
      if (!row.catalogItemId) continue;
      const key = `${row.organizationId}:${row.catalogItemId}`;
      const previous = latest.get(key);
      if (!previous || row.occurredAt > previous.occurredAt || (row.occurredAt.getTime() === previous.occurredAt.getTime() && row.id > previous.id)) latest.set(key, row);
    }
    const result: PublicCatalogRecordV1[] = [];
    for (const business of options.businessArtifact.records) {
      const org = business.business.organization_id;
      if (!activeOrganizations.has(org)) continue;
      const visibleOffers = new Set(business.offers.map((offer) => offer.offer_version_id));
      const entry: Item[] = [];
      for (const event of latest.values()) {
        if (event.organizationId !== org || event.eventKind !== 'PUBLISHED') continue;
        const liveItem = live.get(event.catalogItemId!);
        if (!liveItem || liveItem.organizationId !== org || liveItem.lifecycleStatus !== 'ACTIVE') continue;
        const parsed = parseItem(event, asOf, visibleOffers);
        if (!parsed) { emit('CATALOG_INVALID_SNAPSHOT', org, event.id); continue; }
        try {
          if (parsed.media.length && !options.mediaStoreDir) throw new Error('CATALOG_MEDIA_STORE');
          for (const media of parsed.media) await readVerifiedMedia(options.mediaStoreDir!, media);
        } catch (error) {
          emit(error instanceof Error && /^CATALOG_[A-Z_]+$/.test(error.message) ? error.message : 'CATALOG_MEDIA_INVALID', org, event.id);
          continue;
        }
        entry.push(parsed);
      }
      if (!entry.length) continue;
      entry.sort((a, b) => a.display_order - b.display_order || compare(a.item_key, b.item_key) || compare(a.catalog_item_id, b.catalog_item_id));
      result.push({ organization_id: org, business_snapshot_id: options.businessArtifact.snapshot_id,
        business_publication_id: business.business.publication_id, items: entry });
    }
    return result;
  }, { isolationLevel: 'RepeatableRead' });
  const unsigned = { contract_version: CATALOG_CONTRACT_VERSION, generated_at: utcTimestamp(asOf), snapshot_id: snapshotId(CATALOG_CONTRACT_VERSION, records), records };
  if (canonicalBytes(unsigned).length > MAX_ARTIFACT_BYTES) throw new Error('CATALOG_ARTIFACT_SIZE');
  const artifact = await signEnvelope(unsigned, options.keyId, options.signingKeyProvider, 'catalog') as PublicCatalogExportV1 & SignedEnvelope;
  const bytes = canonicalBytes(artifact);
  if (bytes.length > MAX_ARTIFACT_BYTES) throw new Error('CATALOG_ARTIFACT_SIZE');
  return { artifact, bytes };
}
