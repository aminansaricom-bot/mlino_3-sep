// MatchingService.ts — تطبیق نیاز مشتری با دایرکتوری واقعی (Cache V2)
//
// تضمین سند 01 بخش ۵: نتیجه‌ی نهایی همیشه قطعی و قابل‌ردیابی به داده‌ی
// کسب‌وکار است — این سرویس فقط رکوردهای واقعی دایرکتوری را رتبه می‌دهد،
// هرگز چیزی از خودش نمی‌سازد.
//
// ورودی نیت از IntentParser می‌آید؛ منبع داده فقط از
// BusinessDirectoryService (تنها سرویسی که منبع را می‌شناسد).

import type { ParsedIntent } from './IntentParser';
import { stemFaTokens } from './normalize';
import type { NearResult } from '../directory/BusinessDirectoryService';
import type { BusinessDirectoryService } from '../directory/BusinessDirectoryService';

export interface MatchQuery {
  /** موقعیت فعلی مشتری (GPS افقی) */
  latitude: number;
  longitude: number;
  /** شعاع جست‌وجو — پیش‌فرض ۵ کیلومتر */
  radiusMeters?: number;
  /** طبقه‌ی اعلام‌شده‌ی کاربر در مکان چندطبقه — هرگز از GPS حدس زده نمی‌شود */
  floorLevel?: number;
  buildingId?: string;
}

export interface MatchItem {
  record: NearResult['record'];
  distanceMeters: number;
  /** رکوردهای محصول منطبق — همیشه از دایرکتوری واقعی */
  matchedProducts: Array<{
    product_id: string;
    name: string;
    price: number | null;
    currency: string | null;
  }>;
  /** آفر فعال منطبق، اگر هست */
  matchedOffer: { offer_id: string; title: string; discount_percent: number | null } | null;
  score: number;
}

export interface MatchResponse {
  items: MatchItem[];
  /** نیت تفسیرشده — برای شفافیت UI (کاربر بفهمد دستیار چه فهمید) */
  interpreted: ParsedIntent;
}

function textScore(haystacks: readonly string[], keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  let hits = 0;
  for (const kw of keywords) {
    if (haystacks.some((h) => h.includes(kw))) hits += 1;
  }
  return hits / keywords.length;
}

export class MatchingService {
  constructor(private readonly directory: BusinessDirectoryService) {}

  /**
   * نیت مشتری را روی دایرکتوری (فیلتر جغرافیایی + امتیاز شباهت) می‌دهد.
   * امتیاز: شباهت متنی (۱.۰) + آفر فعال (۰.۲۵) + نزدیکی (۰.۲۵ حداکثر) − ارزانی نسبتاً
   */
  match(intent: ParsedIntent, query: MatchQuery): MatchResponse {
    const radiusMeters = query.radiusMeters ?? 5000;
    const near = this.directory.findNear({
      latitude: query.latitude,
      longitude: query.longitude,
      radiusMeters,
      floorLevel: query.floorLevel,
      buildingId: query.buildingId,
      category: intent.category ?? undefined,
    });

    const maxDist = near.length > 0 ? Math.max(...near.map((n) => n.distanceMeters)) : 1;
    const items: MatchItem[] = [];

    for (const { record, distanceMeters } of near) {
      const nameStems = stemFaTokens(record.name);
      const productStems = record.products
        .filter((p) => p.is_active)
        .map((p) => ({ product: p, stems: stemFaTokens(`${p.name} ${p.description ?? ''}`) }));

      const keywordScore = Math.max(
        textScore(nameStems, intent.keywords),
        ...productStems.map((p) => textScore(p.stems, intent.keywords)),
        0,
      );

      const activeOffer = record.offers.find(
        (o) => o.valid_until === null || Date.parse(o.valid_until) >= Date.now(),
      );
      const offerScore = intent.modifiers.wantsOffer && activeOffer ? 0.25 : 0;
      const proximityScore = intent.modifiers.wantsNearest
        ? 0.25 * (1 - distanceMeters / maxDist)
        : 0;

      const score = keywordScore + offerScore + proximityScore;

      const matchedProducts = productStems
        .filter((p) => textScore(p.stems, intent.keywords) > 0)
        .map((p) => ({
          product_id: p.product.product_id,
          name: p.product.name,
          price: p.product.price,
          currency: p.product.currency,
        }));

      items.push({
        record,
        distanceMeters,
        matchedProducts,
        matchedOffer:
          activeOffer && (intent.modifiers.wantsOffer || offerScore > 0)
            ? {
                offer_id: activeOffer.offer_id,
                title: activeOffer.title,
                discount_percent: activeOffer.discount_percent,
              }
            : null,
        score,
      });
    }

    // اگر پارسر دسته را حدس زد اما کسی در آن دسته نتیجه‌ی متنی نداشت،
    // همان دسته به‌صورت کامل برگردانده می‌شود (نزدیک‌ترین گزینه‌های موجود).
    items.sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters);

    return { items, interpreted: intent };
  }
}
