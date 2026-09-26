import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { MAX_PIXELS, type EmbeddingModel } from './model';

/**
 * Visual product search (D-91) — a module over the published catalog.
 *
 * What is searchable is decided by the signed public catalog (only published, visible items of published
 * businesses): the indexer reads its images from the trusted export directory, and every answer is re-joined with
 * the current catalog and published-business list, so an item that was withdrawn, deleted or changed its images
 * drops out at once — a stored vector alone never makes a result.
 *
 * Storage: one vector per image content hash (SHA-256) and model/preprocessing version, in this module's own tables
 * (module storage beside chat and ratings, D-71). pgvector was not available on the servers checked, so vectors are
 * float32 bytes and the search is exact cosine in memory behind `VectorIndex` (fine for thousands of images; a
 * different engine replaces only that class).
 *
 * The search photo is processed in memory only: never written to disk, never logged, never stored.
 */

export const VISUAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS visual_image_embeddings (
  image_sha256       char(64) NOT NULL,
  model_id           text NOT NULL,
  preprocess_version text NOT NULL,
  dims               int NOT NULL,
  vector             bytea,
  status             varchar(8) NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  error              text,
  attempts           int NOT NULL DEFAULT 0,
  source_path        text NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_sha256, model_id, preprocess_version)
);
CREATE TABLE IF NOT EXISTS visual_image_refs (
  organization_id text NOT NULL,
  catalog_item_id text NOT NULL,
  image_sha256    char(64) NOT NULL,
  position        int NOT NULL,
  seen_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, catalog_item_id, image_sha256)
);
CREATE INDEX IF NOT EXISTS visual_image_refs_sha ON visual_image_refs (image_sha256);
`;

export type VisualErrorCode = 'IMAGE_TOO_LARGE' | 'IMAGE_INVALID' | 'IMAGE_UNSUPPORTED' | 'IMAGE_TOO_SMALL' | 'MODEL_UNAVAILABLE' | 'BUSY' | 'TIMEOUT' | 'BAD_FILTER';
export class VisualError extends Error {
  constructor(readonly code: VisualErrorCode, message = code) { super(message); this.name = 'VisualError'; }
}

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_SIDE = 4096;
export const MIN_SIDE = 32;
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);
const MEDIA_PATH = /^media\/sha256\/([0-9a-f]{2})\/([0-9a-f]{64})\.(jpg|jpeg|png|webp)$/;
const MAX_ATTEMPTS = 3;

/** The file itself decides, never its name: decodable JPEG/PNG/WebP within the size and pixel limits. */
export async function checkImage(buf: Buffer): Promise<{ width: number; height: number; format: string }> {
  if (buf.length > MAX_UPLOAD_BYTES) throw new VisualError('IMAGE_TOO_LARGE');
  if (buf.length < 16) throw new VisualError('IMAGE_INVALID');
  const sharp = require('sharp') as typeof import('sharp').default; // eslint-disable-line @typescript-eslint/no-var-requires
  let meta: import('sharp').Metadata;
  try { meta = await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata(); }
  catch (e) { throw new VisualError(/pixel limit/i.test(String((e as Error).message)) ? 'IMAGE_TOO_LARGE' : 'IMAGE_INVALID'); }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new VisualError('IMAGE_UNSUPPORTED');
  const width = meta.width ?? 0; const height = meta.height ?? 0;
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) throw new VisualError('IMAGE_TOO_LARGE');
  if (width < MIN_SIDE || height < MIN_SIDE) throw new VisualError('IMAGE_TOO_SMALL');
  return { width, height, format: meta.format };
}

// ───────────── the published catalog (the only source of searchable items) ─────────────

export interface CatalogImage { sha256: string; path: string }
export interface CatalogEntry {
  organizationId: string;
  businessName: string;
  catalogItemId: string;
  name: string;
  grouping: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  onRequest: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  images: CatalogImage[];
}

interface CatalogDoc { records?: Array<{ organization_id?: string; items?: Array<Record<string, unknown>> }> }
interface BusinessDoc { records?: Array<{ business?: { organization_id?: string; name?: string } }> }

function readJsonFile<T>(file: string): { mtimeMs: number; doc: T } | null {
  try { const mtimeMs = fs.statSync(file).mtimeMs; return { mtimeMs, doc: JSON.parse(fs.readFileSync(file, 'utf8')) as T }; }
  catch { return null; }
}

/** Items of published businesses from the public catalog, with their public images. */
export function loadCatalog(catalogPath: string, publishedPath: string): { key: string; entries: CatalogEntry[] } | null {
  const cat = readJsonFile<CatalogDoc>(catalogPath);
  const pub = readJsonFile<BusinessDoc>(publishedPath);
  if (!cat || !pub) return null;
  const names = new Map<string, string>();
  for (const r of pub.doc.records ?? []) if (r.business?.organization_id) names.set(r.business.organization_id, r.business.name ?? '');
  const entries: CatalogEntry[] = [];
  for (const rec of cat.doc.records ?? []) {
    const org = rec.organization_id;
    if (!org || !names.has(org)) continue; // a business that is not published has no searchable items
    for (const it of rec.items ?? []) {
      const media = Array.isArray(it.media) ? it.media as Array<Record<string, unknown>> : [];
      const images: CatalogImage[] = [];
      for (const m of [...media].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))) {
        const p = String(m.path ?? ''); const sha = String(m.sha256 ?? '');
        const match = MEDIA_PATH.exec(p);
        if (match && match[2] === sha && sha.startsWith(match[1])) images.push({ sha256: sha, path: p });
      }
      entries.push({
        organizationId: org, businessName: names.get(org) ?? '', catalogItemId: String(it.catalog_item_id ?? ''), name: String(it.name ?? ''),
        grouping: typeof it.grouping_label === 'string' ? it.grouping_label : null,
        priceAmount: typeof it.price_amount === 'string' ? it.price_amount : null, priceCurrency: typeof it.price_currency === 'string' ? it.price_currency : null,
        onRequest: it.on_request === true,
        availableFrom: typeof it.available_from === 'string' ? it.available_from : null, availableUntil: typeof it.available_until === 'string' ? it.available_until : null,
        images,
      });
    }
  }
  return { key: `${cat.mtimeMs}:${pub.mtimeMs}`, entries: entries.filter((e) => e.catalogItemId) };
}

// ───────────── vector index (exact cosine; replaceable) ─────────────

export interface VectorEntry<M> { vector: Float32Array; meta: M }
export interface VectorIndex<M> {
  readonly size: number;
  /** All entries accepted by `accept`, best first, with their similarity; filtering happens before ranking. */
  search(query: Float32Array, accept: (meta: M) => boolean): Array<{ meta: M; score: number }>;
}

/** Exact cosine over L2-normalised vectors (a dot product). O(n·d) per query; right for a catalog of thousands. */
export class ExactCosineIndex<M> implements VectorIndex<M> {
  constructor(private readonly entries: readonly VectorEntry<M>[]) {}
  get size(): number { return this.entries.length; }
  search(query: Float32Array, accept: (meta: M) => boolean): Array<{ meta: M; score: number }> {
    const out: Array<{ meta: M; score: number }> = [];
    for (const e of this.entries) {
      if (!accept(e.meta)) continue;
      let s = 0;
      for (let i = 0; i < query.length; i += 1) s += query[i] * e.vector[i];
      out.push({ meta: e.meta, score: s });
    }
    return out.sort((a, b) => b.score - a.score);
  }
}

export const toBytes = (v: Float32Array): Buffer => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
export const fromBytes = (b: Buffer, dims: number): Float32Array | null => {
  if (b.length !== dims * 4) return null;
  const copy = Buffer.from(b); // aligned copy
  return new Float32Array(copy.buffer, copy.byteOffset, dims);
};

// ───────────── the module ─────────────

export interface SearchFilter {
  /** Businesses the phone chose (its own category, nearby or open filters) — ids only, never a position. */
  organizationIds?: readonly string[];
  minPrice?: number;
  maxPrice?: number;
  limit: number;
  offset: number;
}

export interface VisualResult {
  kind: 'visually_similar';
  organizationId: string;
  businessName: string;
  catalogItemId: string;
  name: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  onRequest: boolean;
  /** The item's first public image, and the one that matched best (both public export paths). */
  imagePath: string | null;
  matchedImagePath: string;
}

type ImageMeta = { entry: CatalogEntry; image: CatalogImage };

export interface VisualOptions {
  catalogPath: string;
  publishedPath: string;
  /** Directory that holds `media/sha256/…` of the public export (trusted source of catalog images). */
  mediaRoot: string;
  /** Cosine similarity below which an image is not «similar». Evaluated, configurable (VISUAL_MIN_SIMILARITY). */
  minSimilarity: number;
  now?: () => Date;
}

export class VisualSearchModule {
  private model: EmbeddingModel | null = null;
  private modelState: 'missing' | 'loading' | 'ready' | 'error' = 'missing';
  private modelDetail: string | undefined;
  private cache: { key: string; index: VectorIndex<ImageMeta> } | null = null;
  private readyGeneration = 0;
  private inflight = 0;
  private indexing: Promise<unknown> | null = null;

  constructor(private readonly db: Pool, private readonly options: VisualOptions) {}

  setModel(model: EmbeddingModel): void { this.model = model; this.modelState = 'ready'; this.modelDetail = undefined; this.cache = null; }
  setModelState(state: 'missing' | 'loading' | 'error', detail?: string): void { this.modelState = state; this.modelDetail = detail; }

  async status(): Promise<{ model: string; ready: boolean; detail?: string; images: { ready: number; pending: number; failed: number } }> {
    const counts = { ready: 0, pending: 0, failed: 0 };
    if (this.model) {
      const r = await this.db.query<{ status: 'ready' | 'pending' | 'failed'; n: string }>(
        'SELECT status, count(*) AS n FROM visual_image_embeddings WHERE model_id = $1 AND preprocess_version = $2 GROUP BY status', [this.model.id, this.model.preprocess]);
      for (const row of r.rows) counts[row.status] = Number(row.n);
    }
    return { model: this.modelState, ready: this.modelState === 'ready', ...(this.modelDetail ? { detail: this.modelDetail } : {}), images: counts };
  }

  /** Reads a catalog image only from the trusted export directory, and only if its bytes are the stated hash. */
  private readCatalogImage(image: CatalogImage): Buffer {
    const m = MEDIA_PATH.exec(image.path);
    if (!m || m[2] !== image.sha256) throw new Error('untrusted image path');
    const root = path.resolve(this.options.mediaRoot);
    const file = path.resolve(root, image.path);
    if (!file.startsWith(root + path.sep)) throw new Error('image path outside the export directory');
    const bytes = fs.readFileSync(file);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== image.sha256) throw new Error('image bytes do not match their hash');
    return bytes;
  }

  /**
   * One indexing pass over the published catalog (background worker and the idempotent backfill both use it):
   * refreshes the item↔image links, and embeds images that have no vector for this model yet. Failed images are
   * retried up to three times with the error kept. Returns what it did.
   */
  async indexPass(maxImages = 50): Promise<{ embedded: number; failed: number; skipped: number; remaining: number }> {
    if (this.indexing) { await this.indexing.catch(() => undefined); }
    const run = this.runIndexPass(maxImages);
    this.indexing = run;
    try { return await run; } finally { this.indexing = null; }
  }

  private async runIndexPass(maxImages: number): Promise<{ embedded: number; failed: number; skipped: number; remaining: number }> {
    const model = this.model;
    const catalog = loadCatalog(this.options.catalogPath, this.options.publishedPath);
    if (!model || !catalog) return { embedded: 0, failed: 0, skipped: 0, remaining: 0 };
    const now = (this.options.now ?? (() => new Date()))();

    // Links: exactly the current catalog (withdrawn items and removed images disappear).
    const refs = catalog.entries.flatMap((e) => e.images.map((img, i) => ({ org: e.organizationId, item: e.catalogItemId, sha: img.sha256, position: i })));
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM visual_image_refs');
      for (const r of refs) {
        await client.query('INSERT INTO visual_image_refs (organization_id, catalog_item_id, image_sha256, position, seen_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', [r.org, r.item, r.sha, r.position, now]);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => undefined); throw e; } finally { client.release(); }

    const unique = new Map<string, CatalogImage>();
    for (const e of catalog.entries) for (const img of e.images) unique.set(img.sha256, img);
    const known = await this.db.query<{ image_sha256: string; status: string; attempts: number }>(
      'SELECT image_sha256, status, attempts FROM visual_image_embeddings WHERE model_id = $1 AND preprocess_version = $2', [model.id, model.preprocess]);
    const state = new Map(known.rows.map((r) => [r.image_sha256, r]));
    const todo = [...unique.values()].filter((img) => {
      const s = state.get(img.sha256);
      return !s || s.status === 'pending' || (s.status === 'failed' && s.attempts < MAX_ATTEMPTS);
    });
    let embedded = 0; let failed = 0;
    for (const img of todo.slice(0, maxImages)) {
      await this.db.query(
        `INSERT INTO visual_image_embeddings (image_sha256, model_id, preprocess_version, dims, status, source_path, attempts, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, 0, $6) ON CONFLICT (image_sha256, model_id, preprocess_version) DO UPDATE SET status = CASE WHEN visual_image_embeddings.status = 'ready' THEN 'ready' ELSE 'pending' END, updated_at = EXCLUDED.updated_at`,
        [img.sha256, model.id, model.preprocess, model.dims, img.path, now]);
      try {
        const vector = await model.embed(this.readCatalogImage(img));
        if (vector.length !== model.dims) throw new Error(`model returned ${vector.length} dimensions, expected ${model.dims}`);
        await this.db.query(
          `UPDATE visual_image_embeddings SET vector = $4, status = 'ready', error = NULL, attempts = attempts + 1, updated_at = $5
           WHERE image_sha256 = $1 AND model_id = $2 AND preprocess_version = $3`, [img.sha256, model.id, model.preprocess, toBytes(vector), now]);
        embedded += 1;
      } catch (e) {
        await this.db.query(
          `UPDATE visual_image_embeddings SET status = 'failed', error = $4, attempts = attempts + 1, updated_at = $5
           WHERE image_sha256 = $1 AND model_id = $2 AND preprocess_version = $3`, [img.sha256, model.id, model.preprocess, String((e as Error).message).slice(0, 300), now]);
        failed += 1;
      }
    }
    if (embedded) { this.readyGeneration += 1; this.cache = null; }
    return { embedded, failed, skipped: unique.size - todo.length, remaining: Math.max(0, todo.length - maxImages) };
  }

  /** The searchable images now: current catalog × ready vectors of the current model and preprocessing only. */
  private async index(model: EmbeddingModel): Promise<VectorIndex<ImageMeta>> {
    const catalog = loadCatalog(this.options.catalogPath, this.options.publishedPath);
    if (!catalog) return new ExactCosineIndex<ImageMeta>([]);
    const key = `${catalog.key}:${this.readyGeneration}:${model.id}:${model.preprocess}`;
    if (this.cache?.key === key) return this.cache.index;
    const shas = [...new Set(catalog.entries.flatMap((e) => e.images.map((i) => i.sha256)))];
    const rows = shas.length ? await this.db.query<{ image_sha256: string; vector: Buffer; dims: number }>(
      `SELECT image_sha256, vector, dims FROM visual_image_embeddings
        WHERE status = 'ready' AND model_id = $1 AND preprocess_version = $2 AND dims = $3 AND image_sha256 = ANY($4::text[])`,
      [model.id, model.preprocess, model.dims, shas]) : { rows: [] };
    const vectors = new Map<string, Float32Array>();
    for (const r of rows.rows) { const v = fromBytes(r.vector, model.dims); if (v) vectors.set(r.image_sha256, v); }
    const entries: VectorEntry<ImageMeta>[] = [];
    for (const entry of catalog.entries) for (const image of entry.images) {
      const v = vectors.get(image.sha256);
      if (v) entries.push({ vector: v, meta: { entry, image } });
    }
    const index = new ExactCosineIndex(entries);
    this.cache = { key, index };
    return index;
  }

  /**
   * Similar products for one photo. Similarity decides first; filters (the phone's business ids, price) are applied
   * before ranking so no valid result is lost to late filtering; each product appears once (its best-matching image);
   * nothing under the similarity threshold is returned. The internal score is not part of the answer.
   */
  async search(photo: Buffer, filter: SearchFilter): Promise<{ results: VisualResult[]; total: number; scope: 'all' | 'subset'; indexed: number }> {
    const model = this.model;
    if (!model || this.modelState !== 'ready') throw new VisualError('MODEL_UNAVAILABLE');
    await checkImage(photo);
    if (this.inflight >= 2) throw new VisualError('BUSY');
    this.inflight += 1;
    try {
      const query = await model.embed(photo);
      if (query.length !== model.dims) throw new VisualError('MODEL_UNAVAILABLE');
      const index = await this.index(model);
      const now = (this.options.now ?? (() => new Date()))().getTime();
      const allowed = filter.organizationIds ? new Set(filter.organizationIds) : null;
      const price = (e: CatalogEntry) => (e.priceAmount === null ? null : Number(e.priceAmount));
      const accept = ({ entry }: ImageMeta) => {
        if (allowed && !allowed.has(entry.organizationId)) return false;
        if (entry.availableFrom && Date.parse(entry.availableFrom) > now) return false;
        if (entry.availableUntil && Date.parse(entry.availableUntil) <= now) return false;
        const p = price(entry);
        if (filter.minPrice !== undefined && (p === null || p < filter.minPrice)) return false;
        if (filter.maxPrice !== undefined && (p === null || p > filter.maxPrice)) return false;
        return true;
      };
      const hits = index.search(query, accept);
      const best = new Map<string, { meta: ImageMeta; score: number }>();
      for (const h of hits) {
        if (h.score < this.options.minSimilarity) break; // sorted: the rest are lower
        const k = `${h.meta.entry.organizationId}/${h.meta.entry.catalogItemId}`;
        if (!best.has(k)) best.set(k, h); // best image per product (hits are best-first)
      }
      const ranked = [...best.values()];
      const page = ranked.slice(filter.offset, filter.offset + filter.limit).map(({ meta }): VisualResult => ({
        kind: 'visually_similar',
        organizationId: meta.entry.organizationId, businessName: meta.entry.businessName,
        catalogItemId: meta.entry.catalogItemId, name: meta.entry.name,
        priceAmount: meta.entry.priceAmount, priceCurrency: meta.entry.priceCurrency, onRequest: meta.entry.onRequest,
        imagePath: meta.entry.images[0]?.path ?? null, matchedImagePath: meta.image.path,
      }));
      return { results: page, total: ranked.length, scope: allowed ? 'subset' : 'all', indexed: index.size };
    } finally { this.inflight -= 1; }
  }

  /** For evaluation only: the raw similarity list of one photo (never sent to clients). */
  async evaluate(photo: Buffer): Promise<Array<{ organizationId: string; catalogItemId: string; name: string; score: number }>> {
    const model = this.model;
    if (!model) throw new VisualError('MODEL_UNAVAILABLE');
    const index = await this.index(model);
    const hits = index.search(await model.embed(photo), () => true);
    const best = new Map<string, { organizationId: string; catalogItemId: string; name: string; score: number }>();
    for (const h of hits) {
      const k = `${h.meta.entry.organizationId}/${h.meta.entry.catalogItemId}`;
      if (!best.has(k)) best.set(k, { organizationId: h.meta.entry.organizationId, catalogItemId: h.meta.entry.catalogItemId, name: h.meta.entry.name, score: h.score });
    }
    return [...best.values()];
  }
}
