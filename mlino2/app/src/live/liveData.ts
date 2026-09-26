// Data helpers for the live storefront and its menu. Everything is read from the signed public records and the
// signed catalog — nothing here invents a price, a discount, a distance or a count.

import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import type { PublicOffer } from '../publicExport/mapping';
import { activeOffersFor } from '../ar/ArGlassCard';
import { tr, numberLocale, num, msg } from '../i18n';

export type CategoryGroup = 'all' | 'food' | 'shop' | 'services' | 'health' | 'other';

export const CATEGORY_GROUPS: readonly { id: CategoryGroup; label: string; icon: 'grid' | 'food' | 'shop' | 'service' | 'health' | 'more' }[] = [
  { id: 'all', label: msg('همه'), icon: 'grid' },
  { id: 'food', label: msg('غذا و نوشیدنی'), icon: 'food' },
  { id: 'services', label: msg('خدمات'), icon: 'service' },
  { id: 'shop', label: msg('فروشگاه'), icon: 'shop' },
  { id: 'health', label: msg('سلامت'), icon: 'health' },
  { id: 'other', label: msg('سایر'), icon: 'more' },
];

/** The app's display categories mapped onto the menu's groups; no new schema. */
export function groupOf(categoryKey: string): Exclude<CategoryGroup, 'all'> {
  if (categoryKey === 'cafe' || categoryKey === 'restaurant') return 'food';
  if (categoryKey === 'retail_shop') return 'shop';
  if (categoryKey === 'beauty_clinic') return 'services';
  if (categoryKey === 'dental_clinic') return 'health';
  return 'other';
}

export const clean = (name: string) => name.replace(/\s*\(آزمایشی\)/g, '').trim();
const fa = (n: number) => num(n, { maximumFractionDigits: 0 });
export const rial = (amount: number) => tr('{0} ریال', fa(amount));
export const faNum = (n: number) => fa(n);

/** An active offer that the business linked to this very product (offer_version_links). Never a shop-wide one. */
export function offerForItem(item: CatalogItem, offers: readonly PublicOffer[]): PublicOffer | null {
  return offers.find((offer) => item.offer_version_links.includes(offer.offer_version_id)) ?? null;
}

export type ItemPrice = Readonly<{
  /** Regular price, integer rials; null = «قیمت با پرسش». */
  price: number | null;
  /** Final price under the product's own offer, only when the offer states a lower price. */
  final: number | null;
  /** Whole percent computed from the two real prices (e.g. 95 000 → 76 000 = 20). */
  percent: number | null;
  offer: PublicOffer | null;
}>;

export function itemPrice(item: CatalogItem, offers: readonly PublicOffer[]): ItemPrice {
  const price = !item.on_request && item.price_amount !== null && Number.isFinite(Number(item.price_amount)) ? Math.round(Number(item.price_amount)) : null;
  const offer = offerForItem(item, offers);
  const offered = offer && !offer.on_request && offer.price_amount !== null ? Math.round(Number(offer.price_amount)) : null;
  const final = price !== null && offered !== null && Number.isFinite(offered) && offered > 0 && offered < price ? offered : null;
  const percent = price !== null && final !== null ? Math.round((1 - final / price) * 100) : null;
  return { price, final, percent: percent && percent > 0 ? percent : null, offer };
}

/** «تا ۵ مهر» from the offer's real end; nothing when it has none. */
export function untilLabel(iso: string | null): string | null {
  if (!iso) return null;
  try { return tr('تا {0}', new Date(iso).toLocaleDateString(numberLocale(), { day: 'numeric', month: 'long' })); } catch { return null; }
}

/** First real photo the business published, for its round thumbnail. */
export function businessThumb(catalog: CatalogRecord | undefined) {
  return catalog?.items.find((item) => item.media.length > 0)?.media[0];
}

export function activeOffers(record: PublicUiRecord | undefined, now: number): PublicOffer[] {
  return activeOffersFor(record, now, 20);
}

/** Products shown for a business; «فقط آفرها» keeps only products with their own active offer. */
export function visibleItems(catalog: CatalogRecord | undefined, offers: readonly PublicOffer[], offersOnly: boolean): CatalogItem[] {
  const items = [...(catalog?.items ?? [])].sort((a, b) => a.display_order - b.display_order);
  return offersOnly ? items.filter((item) => offerForItem(item, offers) !== null) : items;
}

export type SearchHit = Readonly<{ businessId: string; businessName: string; item: CatalogItem }>;

/** Products whose name, description or business name contains the text, within the chosen group. */
export function searchProducts(records: readonly PublicUiRecord[], catalogs: ReadonlyMap<string, CatalogRecord>, text: string, group: CategoryGroup, limit = 30): SearchHit[] {
  const q = text.trim().toLocaleLowerCase('fa-IR');
  const hits: SearchHit[] = [];
  for (const record of records) {
    if (group !== 'all' && groupOf(record.category.key) !== group) continue;
    const name = clean(record.name);
    for (const item of catalogs.get(record.id)?.items ?? []) {
      const hay = `${item.name} ${item.short_description ?? ''} ${name}`.toLocaleLowerCase('fa-IR');
      if (!q || hay.includes(q)) hits.push({ businessId: record.id, businessName: name, item });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

// ───────────── live storefront redesign helpers (owner's brief, 2026-09-26) ─────────────

/** Persian/Arabic letters (ی/ي، ک/ك), diacritics, half-spaces and spaces do not decide a match. */
export function foldText(text: string): string {
  return text.replace(/ي/gu, 'ی').replace(/ك/gu, 'ک').replace(/[ً-ٰٟ]/gu, '').replace(/ـ/gu, '')
    .replace(/[\s‌‏‎]+/gu, '').toLocaleLowerCase('fa-IR');
}

/** Active offers of the business that are NOT linked to one of its products: shown on the business, never on a product. */
export function businessWideOffers(record: PublicUiRecord | undefined, catalog: CatalogRecord | undefined, now: number): PublicOffer[] {
  const linked = new Set((catalog?.items ?? []).flatMap((item) => item.offer_version_links));
  return activeOffers(record, now).filter((offer) => !linked.has(offer.offer_version_id));
}

/** The short offer tag on a business marker: the largest real product discount, else «آفر», else nothing. */
export function offerTag(record: PublicUiRecord | undefined, catalog: CatalogRecord | undefined, now: number): { percent: number | null } | null {
  const offers = activeOffers(record, now);
  if (!offers.length) return null;
  let best: number | null = null;
  for (const item of catalog?.items ?? []) { const p = itemPrice(item, offers).percent; if (p !== null && (best === null || p > best)) best = p; }
  return { percent: best };
}

export type NearbyHit = Readonly<{ businessId: string; item: CatalogItem }>;

/** Products of these businesses whose name, description or group matches any of the words (after folding). */
export function matchProducts(records: readonly PublicUiRecord[], catalogs: ReadonlyMap<string, CatalogRecord>, words: readonly string[], limit = 60): NearbyHit[] {
  const wanted = [...new Set(words.map(foldText).filter((w) => w.length >= 2))];
  if (!wanted.length) return [];
  const hits: NearbyHit[] = [];
  for (const record of records) {
    for (const item of [...(catalogs.get(record.id)?.items ?? [])].sort((a, b) => a.display_order - b.display_order)) {
      const hay = foldText(`${item.name} ${item.short_description ?? ''} ${item.grouping_label ?? ''}`);
      if (wanted.some((w) => hay.includes(w))) hits.push({ businessId: record.id, item });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

/**
 * Markers that would overlap go to another row (up to three); the chosen business always keeps the first row.
 * `minGap` is in percent of the width. Markers that find no free row are left out (their business stays in the list).
 */
export function assignLanes<T extends { businessId: string; x: number }>(items: readonly T[], selectedId: string | null, minGap = 24, lanes = 3): Array<T & { lane: number }> {
  const order = [...items].sort((a, b) => (a.businessId === selectedId ? -1 : b.businessId === selectedId ? 1 : 0));
  const taken: number[][] = Array.from({ length: lanes }, () => []);
  const out: Array<T & { lane: number }> = [];
  for (const it of order) {
    const lane = taken.findIndex((xs) => xs.every((x) => Math.abs(x - it.x) >= minGap));
    if (lane < 0) continue;
    taken[lane].push(it.x);
    out.push({ ...it, lane });
  }
  return out;
}

/** Suggested questions that fit: availability for any product, sizes only for shop goods, offer end only with an offer. */
export function chatSuggestions(opts: { hasItem: boolean; categoryKey: string | null; hasOffer: boolean }): string[] {
  const out: string[] = [];
  if (opts.hasItem) out.push(msg('این محصول موجوده؟'));
  if (opts.hasItem && opts.categoryKey === 'retail_shop') out.push(msg('چه سایزهایی داره؟'));
  if (opts.hasOffer) out.push(msg('این آفر تا کی فعاله؟'));
  if (!opts.hasItem) out.push(msg('ساعت کاری؟'));
  return out;
}
