// rankRecords.ts — رتبه‌بندی محلی. فقط روی داده‌ی امضاشده و پذیرفته‌شده کار می‌کند؛
// هوش مصنوعی فقط «منظور» را داده و هیچ کسب‌وکار، قیمت یا ترتیبی نساخته است.

import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { openNow } from '../publicExport/businessHours';
import { activeOffersFor } from '../ar/ArGlassCard';
import { normalizeFa, type AssistantIntent } from './assistantIntent';

export type RankedResult = Readonly<{
  record: PublicUiRecord;
  score: number;
  distanceMeters?: number;
  items: readonly CatalogItem[];
  offerName: string | null;
  /** true وقتی خودِ کلمه‌ها (نه فقط دسته) در منو، نام یا پیشنهاد پیدا شده‌اند. */
  direct: boolean;
}>;

const has = (text: string | null | undefined, keyword: string) => !!text && normalizeFa(text).includes(keyword);

export function rankRecords(input: {
  records: readonly PublicUiRecord[];
  catalogByOrg: ReadonlyMap<string, CatalogRecord>;
  distances: ReadonlyMap<string, number>;
  intent: AssistantIntent;
  now: number;
  limit?: number;
}): RankedResult[] {
  const { records, catalogByOrg, distances, intent, now, limit = 6 } = input;
  const keywords = intent.keywords.map(normalizeFa).filter((k) => k.length >= 2);
  const out: RankedResult[] = [];
  for (const record of records) {
    const hours = openNow(record, now);
    if (intent.open_now && hours === 'closed') continue;
    const items = catalogByOrg.get(record.id)?.items ?? [];
    const offers = activeOffersFor(record, now, 5);
    let score = 0;
    const matched: CatalogItem[] = [];
    let offerName: string | null = null;
    for (const k of keywords) {
      for (const item of items) {
        if (has(item.name, k)) { score += 4; if (!matched.includes(item)) matched.push(item); }
        else if (has(item.short_description, k) || has(item.grouping_label, k)) { score += 1.5; if (matched.length < 1 && !matched.includes(item)) matched.push(item); }
      }
      for (const offer of offers) if (has(offer.name, k) || has(offer.short_description, k)) { score += 3; offerName = offerName ?? offer.name; }
      if (has(record.name, k)) score += 3;
      if (record.capabilities.some((c) => has(c.name, k))) score += 2;
      if (has(record.description, k)) score += 1;
    }
    const direct = score > 0;
    const categoryMatch = intent.category !== null && record.category.key === intent.category;
    if (categoryMatch) score += 2;
    if (keywords.length > 0 && score === 0) continue;
    if (intent.category !== null && !categoryMatch && matched.length === 0 && score < 3) continue;
    if (offers.length > 0) { score += intent.sort === 'offer' ? 4 : 0.5; offerName = offerName ?? offers[0].name; }
    if (intent.open_now && hours === 'unknown') score -= 1;
    const distance = distances.get(record.id);
    if (distance !== undefined) {
      if (distance <= intent.radius_meters) score += 1.5;
      else if (distance > intent.radius_meters * 3) score -= 2;
    }
    out.push({ record, score, distanceMeters: distance, items: matched.slice(0, 2), offerName, direct });
  }
  const byDistance = (a: RankedResult, b: RankedResult) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
  // تطابق مستقیم همیشه بالاتر از تطابقِ فقط-دسته است، سپس ترتیب درخواستی.
  out.sort((a, b) => Number(b.direct) - Number(a.direct) || (intent.sort === 'nearest'
    ? byDistance(a, b) || b.score - a.score
    : intent.sort === 'offer'
      ? Number(!!b.offerName) - Number(!!a.offerName) || b.score - a.score || byDistance(a, b)
      : b.score - a.score || byDistance(a, b) || a.record.id.localeCompare(b.record.id)));
  return out.slice(0, limit);
}
