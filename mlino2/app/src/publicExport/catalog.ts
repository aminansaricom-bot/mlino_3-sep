import { snapshotId } from './canonical';
import { MAX_CLOCK_SKEW_MS, TTL_MS, type PublicExportConsumer } from './consumer';
import { instant, type PublicRecord } from './mapping';
import type { TrustBundle } from './trustBundle';
import { verifyArtifact } from './verify';

export const CATALOG_URL = '/public-export/public-catalog.v1.json';
export const CATALOG_CAP = 2_000_000;
export type CatalogMedia = Readonly<{
  position: number; path: string; sha256: string; media_type: 'image/avif' | 'image/webp' | 'image/jpeg' | 'image/png';
  byte_size: number; width: number; height: number; alt_text: string;
  placeholder: null | Readonly<{ schema_version: 'mlino.blurhash.v1'; value: string }>;
}>;
export type CatalogItem = Readonly<{
  catalog_item_id: string; item_key: string; name: string; short_description: string | null;
  price_amount: string | null; price_currency: string | null; on_request: boolean;
  grouping_label: string | null; display_order: number; available_from: string | null;
  available_until: string | null; offer_version_links: readonly string[]; media: readonly CatalogMedia[];
  published_at: string; publication_id: string; source_revision: number;
}>;
export type CatalogRecord = Readonly<{
  organization_id: string; business_snapshot_id: string; business_publication_id: string;
  items: readonly CatalogItem[];
}>;

function shape(): never { throw new Error('CATALOG_SHAPE'); }
function obj(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) shape();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== keys.length || Object.keys(row).some((key) => !keys.includes(key))) shape();
  return row;
}
function str(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !value.trim()) shape();
  return value as string;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) shape();
  return value as number;
}
function nullableTime(value: unknown): string | null {
  if (value === null) return null;
  instant(value);
  return value as string;
}
function parseMedia(value: unknown): CatalogMedia {
  const m = obj(value, ['position', 'path', 'sha256', 'media_type', 'byte_size', 'width', 'height', 'alt_text', 'placeholder']);
  const type = str(m.media_type) as CatalogMedia['media_type'];
  const extension: Record<CatalogMedia['media_type'], string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' };
  if (!(type in extension) || typeof m.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(m.sha256) ||
      m.path !== `media/sha256/${m.sha256.slice(0, 2)}/${m.sha256}.${extension[type]}`) shape();
  const placeholder = m.placeholder === null ? null : obj(m.placeholder, ['schema_version', 'value']);
  if (placeholder && (placeholder.schema_version !== 'mlino.blurhash.v1' ||
      typeof placeholder.value !== 'string' || !placeholder.value.trim() || placeholder.value.length > 256)) shape();
  const alt = str(m.alt_text)!;
  if (alt.length > 300) shape();
  const width = number(m.width, 320, 4096), height = number(m.height, 320, 4096);
  if (width * height > 16_000_000) shape();
  return { position: number(m.position, 0, 7), path: m.path as string, sha256: m.sha256,
    media_type: type, byte_size: number(m.byte_size, 1, 1_500_000), width, height, alt_text: alt,
    placeholder: placeholder ? { schema_version: 'mlino.blurhash.v1', value: placeholder.value as string } : null };
}
function parseItem(value: unknown): CatalogItem {
  const i = obj(value, ['catalog_item_id', 'item_key', 'name', 'short_description', 'price_amount', 'price_currency',
    'on_request', 'grouping_label', 'display_order', 'available_from', 'available_until', 'offer_version_links',
    'media', 'published_at', 'publication_id', 'source_revision']);
  if (typeof i.on_request !== 'boolean' || !Array.isArray(i.offer_version_links) ||
      !i.offer_version_links.every((v) => typeof v === 'string' && v.trim()) ||
      !Array.isArray(i.media) || i.media.length > 8) shape();
  const media = i.media.map(parseMedia);
  if (new Set(media.map((m) => m.position)).size !== media.length || media.reduce((n, m) => n + m.byte_size, 0) > 8_000_000) shape();
  instant(i.published_at);
  return { catalog_item_id: str(i.catalog_item_id)!, item_key: str(i.item_key)!, name: str(i.name)!,
    short_description: str(i.short_description, true), price_amount: str(i.price_amount, true),
    price_currency: str(i.price_currency, true), on_request: i.on_request,
    grouping_label: str(i.grouping_label, true), display_order: number(i.display_order, 0, Number.MAX_SAFE_INTEGER),
    available_from: nullableTime(i.available_from), available_until: nullableTime(i.available_until),
    offer_version_links: i.offer_version_links as string[], media,
    published_at: i.published_at as string, publication_id: str(i.publication_id)!,
    source_revision: number(i.source_revision, 0, Number.MAX_SAFE_INTEGER) };
}
function parseRecords(value: unknown): CatalogRecord[] {
  if (!Array.isArray(value)) shape();
  const records = value.map((raw) => {
    const r = obj(raw, ['organization_id', 'business_snapshot_id', 'business_publication_id', 'items']);
    if (!Array.isArray(r.items)) shape();
    const items = r.items.map(parseItem);
    if (new Set(items.map((item) => item.catalog_item_id)).size !== items.length) shape();
    return { organization_id: str(r.organization_id)!, business_snapshot_id: str(r.business_snapshot_id)!,
      business_publication_id: str(r.business_publication_id)!, items };
  });
  if (new Set(records.map((r) => r.organization_id)).size !== records.length) shape();
  return records;
}

export interface CatalogTransport { read(): Promise<Uint8Array | null> }
export class CatalogFetchTransport implements CatalogTransport {
  // مرورگرها fetch را فقط با گیرندهٔ window می‌پذیرند؛ `this.fetcher(...)` گیرنده را این کلاس می‌کند و
  // «Illegal invocation» می‌دهد. آن خطا بی‌صدا به «کاتالوگ خالی» تبدیل می‌شد و منو در هیچ مرورگری نمی‌آمد.
  // Node گیرنده را نمی‌سنجد، پس آزمون‌ها سبز بودند. تابع پیش‌فرض fetch را همیشه از globalThis صدا می‌زند.
  constructor(private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init), private readonly url = CATALOG_URL) {}
  async read(): Promise<Uint8Array | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const fetcher = this.fetcher;
      const response = await fetcher(this.url, { cache: 'no-store', signal: controller.signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('CATALOG_FETCH');
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > CATALOG_CAP)) throw new Error('CATALOG_SIZE');
      if (!response.body) throw new Error('CATALOG_FETCH');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > CATALOG_CAP) { await reader.cancel(); throw new Error('CATALOG_SIZE'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return bytes;
    } finally { clearTimeout(timeout); }
  }
}

export class CatalogConsumer {
  private accepted: { generatedAt: number; snapshotId: string; records: readonly CatalogRecord[] } | null = null;
  constructor(private readonly transport: CatalogTransport, private readonly trust: TrustBundle) {}

  async refresh(business: PublicExportConsumer, now = Date.now()): Promise<void> {
    // Every catalog failure is contained here; the business consumer is never mutated.
    try {
      const raw = await this.transport.read();
      if (!raw || raw.length > CATALOG_CAP || !business.hasValidSnapshot(now)) { this.accepted = null; return; }
      const artifact = await verifyArtifact(raw, this.trust, 'catalog');
      const generatedAt = instant(artifact.generated_at);
      if (generatedAt > now + MAX_CLOCK_SKEW_MS || now > generatedAt + TTL_MS) throw new Error('CATALOG_EXPIRED');
      const records = parseRecords(artifact.records);
      if (artifact.snapshot_id !== await snapshotId('mlino.v2.public-catalog.v1', artifact.records as unknown[])) shape();
      this.accepted = { generatedAt, snapshotId: business.snapshotId!, records };
    } catch { this.accepted = null; }
  }

  read(business: PublicExportConsumer, now = Date.now()): readonly CatalogRecord[] {
    const current = this.accepted;
    if (!current || !business.hasValidSnapshot(now) || current.snapshotId !== business.snapshotId ||
        current.generatedAt > now + MAX_CLOCK_SKEW_MS || now > current.generatedAt + TTL_MS) return [];
    const byOrg = new Map<string, PublicRecord>(business.read(now).map((record) => [record.business.organization_id, record]));
    return current.records.flatMap((record) => {
      const visible = byOrg.get(record.organization_id);
      if (!visible || record.business_snapshot_id !== current.snapshotId ||
          record.business_publication_id !== visible.business.publication_id) return [];
      const offerIds = new Set(visible.offers.map((offer) => offer.offer_version_id));
      const items = record.items.map((item) => ({ ...item,
        offer_version_links: item.offer_version_links.filter((id) => offerIds.has(id)) }));
      return [{ ...record, items }];
    });
  }
}
