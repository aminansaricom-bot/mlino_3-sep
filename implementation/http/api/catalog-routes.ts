import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { PLAN_LIMITS, planOf } from '../../core/plan-service';
import { PublicationService } from '../../core/publication-service';
import { inspectUploadedImage } from '../../public-export/media';
import { contextFor, RouteError } from './core-routes';

/**
 * Products and storefront editing for the business panel (/api/biz/:org/catalog…, /profile…).
 * Every change goes through the Core services the tests cover: editing needs `catalog_item.manage` or
 * `business_profile.manage`; nothing reaches customers until a person presses «انتشار» (`publication.manage`,
 * D-52), which records a snapshot. Photos are content-addressed files in the media store; a published snapshot
 * keeps pointing at its own files, so removing a photo from a draft never breaks what customers see.
 */

export interface CatalogDeps {
  readonly prisma: PrismaClient;
  readonly catalog: CatalogItemService;
  readonly profiles: BusinessProfileService;
  readonly publications: PublicationService;
  /** Absolute path of the media store the export reads (MEDIA_STORE_DIR). Without it photo upload is off. */
  readonly mediaStore?: string;
}

export type FileReply = { file: Buffer; contentType: string };

const UUID = '[0-9a-f-]{36}';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
const MEDIA_TYPE = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP' } as const;
const CONTENT_TYPE: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

function text(v: unknown, max: number, field: string, required = false): string | null {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ').trim() : '';
  if (!s) { if (required) throw new RouteError(400, 'INPUT_INVALID', { field }); return null; }
  if ([...s].length > max) throw new RouteError(400, 'INPUT_INVALID', { field });
  return s;
}

function price(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[,٬\s]/g, '');
  if (!/^[1-9]\d{0,11}$/.test(s)) throw new RouteError(400, 'INPUT_INVALID', { field: 'priceAmount' });
  return s;
}

/** mlino.business-hours.v1: day 1 = Saturday … 7 = Friday, each with up to two open–close intervals. */
function hours(v: unknown): unknown {
  if (v === null) return null;
  const weekly = (v as { weekly?: unknown })?.weekly;
  if (!Array.isArray(weekly) || weekly.length > 7) throw new RouteError(400, 'INPUT_INVALID', { field: 'businessHours' });
  const days = new Set<number>();
  const out = weekly.map((d) => {
    const day = Number((d as { day?: unknown }).day);
    const intervals = (d as { intervals?: unknown }).intervals;
    if (!Number.isInteger(day) || day < 1 || day > 7 || days.has(day) || !Array.isArray(intervals) || intervals.length > 2) throw new RouteError(400, 'INPUT_INVALID', { field: 'businessHours' });
    days.add(day);
    return { day, intervals: intervals.map((i) => {
      const open = String((i as { open?: unknown }).open ?? ''); const close = String((i as { close?: unknown }).close ?? '');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(close) || open === close) throw new RouteError(400, 'INPUT_INVALID', { field: 'businessHours' });
      return { open, close };
    }) };
  }).sort((a, b) => a.day - b.day);
  return { schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran', weekly: out };
}

async function storeFile(store: string, bytes: Buffer, sha: string, ext: string): Promise<string> {
  const rel = `media/sha256/${sha.slice(0, 2)}/${sha}.${ext}`;
  const abs = path.join(store, ...rel.split('/'));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  try { await fs.access(abs); return rel; } catch { /* not there yet */ }
  const tmp = `${abs}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, bytes, { mode: 0o644 });
  await fs.rename(tmp, abs);
  return rel;
}

export async function handleCatalogRoute(
  deps: CatalogDeps, personId: string, orgId: string, rest: string, method: string,
  body: () => Promise<Record<string, unknown>>, raw: (max: number) => Promise<Buffer>, header: (name: string) => string | undefined,
): Promise<unknown | FileReply | undefined> {
  const context = contextFor(personId, orgId);

  // ── products ──
  if (rest === '/catalog' && method === 'GET') {
    const [items, tier] = await Promise.all([
      deps.prisma.catalogItem.findMany({
        where: { organizationId: orgId, lifecycleStatus: { not: 'RETIRED' } },
        include: { media: { orderBy: { position: 'asc' } } },
        orderBy: [{ groupingLabel: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
        take: 500,
      }),
      planOf(deps.prisma, orgId),
    ]);
    const published = items.filter((i) => i.publicationStatus === 'PUBLISHED').length;
    return {
      limit: PLAN_LIMITS[tier].publishedCatalogItems, published, tier, photosEnabled: !!deps.mediaStore,
      items: items.map((i) => ({
        id: i.id, name: i.name, shortDescription: i.shortDescription, priceAmount: i.priceAmount?.toString() ?? null, onRequest: i.onRequest,
        groupingLabel: i.groupingLabel, displayOrder: i.displayOrder, status: i.publicationStatus, lifecycle: i.lifecycleStatus,
        // Edited after its last publication: customers still see the earlier version until «انتشار».
        changed: i.publicationStatus === 'PUBLISHED' && i.contentRevision > (i.publishedContentRevision ?? 0),
        media: i.media.map((m) => ({ id: m.id, path: m.objectPath, alt: m.altText })),
      })),
    };
  }
  if (rest === '/catalog' && method === 'POST') {
    const b = await body();
    const priceAmount = price(b.priceAmount);
    const item = await deps.catalog.create(context, {
      organizationId: orgId, itemKey: `panel-${crypto.randomUUID()}`,
      name: text(b.name, 120, 'name', true)!, shortDescription: text(b.shortDescription, 400, 'shortDescription'),
      priceAmount, priceCurrency: priceAmount ? 'IRR' : null, onRequest: !priceAmount,
      groupingLabel: text(b.groupingLabel, 60, 'groupingLabel'),
    });
    // A product made in the panel is meant to be used: active as a draft, still invisible until published.
    await deps.catalog.activate(context, item.id);
    return { id: item.id };
  }
  const one = rest.match(new RegExp(`^/catalog/(${UUID})(/[a-z]+)?$`));
  if (one && method === 'POST') {
    const [, id, action] = one;
    if (!action) {
      const b = await body();
      const fields: Record<string, unknown> = {};
      if ('name' in b) fields.name = text(b.name, 120, 'name', true);
      if ('shortDescription' in b) fields.shortDescription = text(b.shortDescription, 400, 'shortDescription');
      if ('groupingLabel' in b) fields.groupingLabel = text(b.groupingLabel, 60, 'groupingLabel');
      if ('priceAmount' in b) { const p = price(b.priceAmount); fields.priceAmount = p; fields.priceCurrency = p ? 'IRR' : null; fields.onRequest = !p; }
      await deps.catalog.updatePublicFields(context, id, fields);
      return { ok: true };
    }
    if (action === '/publish') return { outcome: (await deps.publications.publish(context, 'CATALOG_ITEM', id, 'panel: published by member')).outcome };
    if (action === '/withdraw') return { outcome: (await deps.publications.withdraw(context, 'CATALOG_ITEM', id, 'panel: withdrawn by member')).outcome };
    if (action === '/retire') {
      const item = await deps.prisma.catalogItem.findFirst({ where: { id, organizationId: orgId }, select: { publicationStatus: true } });
      if (!item) throw new RouteError(404, 'NOT_FOUND');
      if (item.publicationStatus === 'PUBLISHED') await deps.publications.withdraw(context, 'CATALOG_ITEM', id, 'panel: removed from catalog by member');
      await deps.catalog.retire(context, id, 'panel: removed from catalog by member');
      return { ok: true };
    }
    if (action === '/media') {
      if (!deps.mediaStore) throw new RouteError(503, 'PHOTOS_OFF');
      const bytes = await raw(1_500_000);
      let info: ReturnType<typeof inspectUploadedImage>;
      try { info = inspectUploadedImage(bytes); } catch (e) { throw new RouteError(400, 'PHOTO_INVALID', { reason: e instanceof Error ? e.message : 'invalid' }); }
      let alt = '';
      try { alt = decodeURIComponent(header('x-alt-text') ?? ''); } catch { alt = ''; }
      const altText = text(alt, 200, 'altText') ?? 'عکس محصول';
      const sha = crypto.createHash('sha256').update(bytes).digest('hex');
      const count = await deps.prisma.catalogItemMedia.count({ where: { catalogItemId: id, organizationId: orgId } });
      if (count >= 8) throw new RouteError(409, 'PHOTO_LIMIT');
      const objectPath = await storeFile(deps.mediaStore, bytes, sha, EXT[info.mediaType]);
      const media = await deps.catalog.addMedia(context, id, {
        position: count, objectPath, sha256: sha, mediaType: MEDIA_TYPE[info.mediaType], byteSize: bytes.length,
        widthPx: info.width, heightPx: info.height, altText,
      });
      return { id: media.id, path: objectPath };
    }
    return undefined;
  }
  const removeMedia = rest.match(new RegExp(`^/catalog/(${UUID})/media/(${UUID})/remove$`));
  if (removeMedia && method === 'POST') {
    await deps.catalog.removeMedia(context, removeMedia[1], removeMedia[2]);
    // Keep positions 0..n-1 so the next photo can be added after them.
    const left = await deps.prisma.catalogItemMedia.findMany({ where: { catalogItemId: removeMedia[1], organizationId: orgId }, orderBy: { position: 'asc' }, select: { id: true } });
    if (left.length) await deps.catalog.reorderMedia(context, removeMedia[1], left.map((m) => m.id));
    return { ok: true };
  }
  // Draft photos are not public yet: members read them through the API, only for their own business.
  const file = rest.match(/^\/media\/sha256\/([0-9a-f]{2})\/([0-9a-f]{64})\.(jpg|png|webp|avif)$/);
  if (file && method === 'GET' && deps.mediaStore) {
    const [, prefix, sha, ext] = file;
    if (sha.slice(0, 2) !== prefix) throw new RouteError(404, 'NOT_FOUND');
    const owned = await deps.prisma.catalogItemMedia.findFirst({ where: { organizationId: orgId, sha256: sha }, select: { id: true } });
    if (!owned) throw new RouteError(404, 'NOT_FOUND');
    const bytes = await fs.readFile(path.join(deps.mediaStore, 'media', 'sha256', prefix, `${sha}.${ext}`)).catch(() => null);
    if (!bytes) throw new RouteError(404, 'NOT_FOUND');
    return { file: bytes, contentType: CONTENT_TYPE[ext] } satisfies FileReply;
  }

  // ── storefront (business profile) ──
  if (rest === '/profile' && method === 'GET') {
    const p = await deps.prisma.businessProfile.findFirst({ where: { organizationId: orgId, lifecycleStatus: { not: 'ARCHIVED' } }, orderBy: { createdAt: 'asc' } });
    if (!p) return { profile: null };
    const contact = (p.contactInformation ?? {}) as Record<string, unknown>;
    const links = (p.links ?? {}) as Record<string, unknown>;
    return { profile: {
      id: p.id, name: p.name, description: p.description, addressText: p.addressText,
      publicPhone: typeof contact.public_phone === 'string' ? contact.public_phone : null,
      website: typeof links.website === 'string' ? links.website : null,
      social: Array.isArray(links.public_social) ? links.public_social.filter((s): s is string => typeof s === 'string') : [],
      businessHours: p.businessHours ?? null, status: p.publicationStatus,
      changed: p.publicationStatus === 'PUBLISHED' && p.contentRevision > (p.publishedContentRevision ?? 0),
    } };
  }
  const prof = rest.match(new RegExp(`^/profile/(${UUID})(/publish)?$`));
  if (prof && method === 'POST') {
    const [, id, publish] = prof;
    if (publish) return { outcome: (await deps.publications.publish(context, 'BUSINESS_PROFILE', id, 'panel: storefront published by member')).outcome };
    const b = await body();
    const current = await deps.prisma.businessProfile.findFirst({ where: { id, organizationId: orgId }, select: { contactInformation: true, links: true } });
    if (!current) throw new RouteError(404, 'NOT_FOUND');
    const fields: Record<string, unknown> = {};
    if ('description' in b) fields.description = text(b.description, 600, 'description');
    if ('addressText' in b) fields.addressText = text(b.addressText, 200, 'addressText');
    if ('publicPhone' in b) {
      const phone = text(b.publicPhone, 20, 'publicPhone');
      const digits = phone?.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\s-]/g, '') ?? null;
      if (digits && !/^\+?\d{5,14}$/.test(digits)) throw new RouteError(400, 'INPUT_INVALID', { field: 'publicPhone' });
      const contact = { ...((current.contactInformation ?? {}) as Record<string, unknown>) };
      if (digits) contact.public_phone = digits; else delete contact.public_phone;
      fields.contactInformation = contact;
    }
    if ('website' in b || 'social' in b) {
      const links = { ...((current.links ?? {}) as Record<string, unknown>) };
      if ('website' in b) {
        const site = text(b.website, 200, 'website');
        if (site && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(site)) throw new RouteError(400, 'INPUT_INVALID', { field: 'website' });
        if (site) links.website = site; else delete links.website;
      }
      if ('social' in b) {
        const list = Array.isArray(b.social) ? b.social.map((s) => text(s, 200, 'social')).filter((s): s is string => !!s) : [];
        if (list.length > 4 || list.some((s) => !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(s))) throw new RouteError(400, 'INPUT_INVALID', { field: 'social' });
        if (list.length) links.public_social = list; else delete links.public_social;
      }
      fields.links = links;
    }
    if ('businessHours' in b) fields.businessHours = hours(b.businessHours);
    await deps.profiles.updatePublicFields(context, id, fields);
    return { ok: true };
  }
  return undefined;
}
