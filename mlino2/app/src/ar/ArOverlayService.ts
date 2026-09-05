// ArOverlayService.ts — مدل ویترین AR از دایرکتوری واقعی
// تضمین سند 01 بخش ۲: این سرویس تنها از BusinessDirectoryService داده می‌گیرد —
// هیچ مسیر مستقیم جدیدی به داده (چه Mock چه آینده‌ی V1) وجود ندارد.
// قرارداد طبقه (سند 01 بخش ۳): floorLevel فقط وقتی کاربر صریحاً اعلام کند
// اعمال می‌شود؛ هرگز از GPS یا حسگر حدس زده نمی‌شود.

import type { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { bearingDegrees, placeOverlay } from './arOrientation';

export interface ArQuery {
  /** موقعیت افقی کاربر (GPS) */
  latitude: number;
  longitude: number;
  /** شعاع نمایش ویترین‌ها (متر) */
  radiusMeters: number;
  /**
   * طبقه‌ی اعلام‌شده‌ی کاربر — فقط با buildingId معنا دارد.
   * وقتی داده می‌شود، فقط کسب‌وکارهای همان ساختمان/همان طبقه برگردانده می‌شوند
   * (کسب‌وکارهای بیرون ساختمان این حالت نیستند — کاربر داخل ساختمان است).
   */
  buildingId?: string;
  floorLevel?: number;
  /** میدان دید افقی دوربین بر حسب درجه */
  fovDeg?: number;
  /** جهت فعلی دوربین/کاربر بر حسب درجه (شمال=۰) */
  headingDeg: number;
}

export interface ArVitrineItem {
  businessId: string;
  name: string;
  category: string;
  distanceMeters: number;
  /** محصولات فعال این کسب‌وکار — از رکورد واقعی دایرکتوری */
  activeProducts: Array<{ product_id: string; name: string; price: number | null; currency: string | null }>;
  /** آفر فعال (نخستین) — از رکورد واقعی دایرکتوری */
  activeOffer: { offer_id: string; title: string; discount_percent: number | null } | null;
  placement: { relativeBearingDeg: number; screenXPercent: number; scaleBucket: 'near' | 'mid' | 'far' };
}

export interface ArViewResponse {
  items: ArVitrineItem[];
  /** تعداد کسب‌وکارهایی که در شعاع‌اند اما پشت سر کاربر */
  behindCount: number;
  /** طبقه‌ی اعلام‌شده — در پاسخ برمی‌گردد تا UI صادقانه نمایش دهد */
  declaredFloor: number | null;
  declaredBuildingId: string | null;
}

function isOfferActiveNow(validUntil: string | null, now: number): boolean {
  if (validUntil === null) return true;
  const t = Date.parse(validUntil);
  return Number.isNaN(t) ? true : t >= now;
}

export class ArOverlayService {
  constructor(private readonly directory: BusinessDirectoryService) {}

  /**
   * ویترین‌های درون میدان دید را از دایرکتوری می‌سازد.
   * هر آیتم قابل‌ردیابی به یک business_id واقعی است — این سرویس چیزی از خودش نمی‌سازد.
   */
  buildView(query: ArQuery, now: number = Date.now()): ArViewResponse {
    const near = this.directory.findNear({
      latitude: query.latitude,
      longitude: query.longitude,
      radiusMeters: query.radiusMeters,
      buildingId: query.buildingId,
      floorLevel: query.floorLevel,
    });

    const fov = query.fovDeg ?? 60;
    const items: ArVitrineItem[] = [];
    let behindCount = 0;

    for (const { record, distanceMeters } of near) {
      const bearing = bearingDegrees(
        query.latitude,
        query.longitude,
        record.location.latitude,
        record.location.longitude,
      );

      const placement = placeOverlay(bearing, query.headingDeg, distanceMeters, fov);
      if (placement === null) {
        behindCount += 1;
        continue;
      }

      const activeProducts = record.products
        .filter((p) => p.is_active)
        .map((p) => ({
          product_id: p.product_id,
          name: p.name,
          price: p.price,
          currency: p.currency,
        }));

      const activeOfferRecord = record.offers.find((o) => isOfferActiveNow(o.valid_until, now));

      items.push({
        businessId: record.business_id,
        name: record.name,
        category: record.category,
        distanceMeters,
        activeProducts,
        activeOffer:
          activeOfferRecord !== undefined
            ? {
                offer_id: activeOfferRecord.offer_id,
                title: activeOfferRecord.title,
                discount_percent: activeOfferRecord.discount_percent,
              }
            : null,
        placement,
      });
    }

    items.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      items,
      behindCount,
      declaredFloor: query.floorLevel ?? null,
      declaredBuildingId: query.buildingId ?? null,
    };
  }

  /**
   * ساختمان‌های چندطبقه‌ی اطراف کاربر — برای پرسش صریح طبقه (سند 01 بخش ۳).
   * تنها منبع داده: دایرکتوری.
   */
  multiFloorBuildingsAround(latitude: number, longitude: number, radiusMeters: number): Array<{
    buildingId: string;
    floors: number[];
  }> {
    const near = this.directory.findNear({ latitude, longitude, radiusMeters });
    const floorsByBuilding = new Map<string, Set<number>>();
    for (const { record } of near) {
      const { building_id, floor_level } = record.location;
      if (building_id === null || floor_level === null) continue;
      const set = floorsByBuilding.get(building_id) ?? new Set<number>();
      set.add(floor_level);
      floorsByBuilding.set(building_id, set);
    }
    return [...floorsByBuilding.entries()].map(([buildingId, floors]) => ({
      buildingId,
      floors: [...floors].sort((a, b) => a - b),
    }));
  }
}
