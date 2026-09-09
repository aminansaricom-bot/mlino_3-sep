// ArOverlayService.ts — مدل ویترین AR از دایرکتوری واقعی
// تضمین سند 01 بخش ۲: این سرویس تنها از BusinessDirectoryService داده می‌گیرد —
// هیچ مسیر مستقیم جدیدی به داده (چه Mock چه آینده‌ی V1) وجود ندارد.
// قرارداد طبقه (سند 01 بخش ۳): floorLevel فقط وقتی کاربر صریحاً اعلام کند
// اعمال می‌شود؛ هرگز از GPS یا حسگر حدس زده نمی‌شود.

import type { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { bearingDegrees, placeOverlay } from './arOrientation';
import { isOfferActiveAt } from '../offers';

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

      const activeOfferRecord = record.offers.find((o) => isOfferActiveAt(o.valid_from, o.valid_until, now));

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

/* ────────────────────────────────────────────────────────────────────────────
 * ترکیب صحنه‌ی AR — یک کارت اصلی + چند حباب فرعی، بدون هم‌پوشانی
 *
 * چرا اضافه شد: در تست میدانی روی گوشی واقعی، همه‌ی ویترین‌های داخل میدان دید
 * هم‌زمان و هم‌اندازه روی تصویر می‌افتادند و روی هم می‌نشستند — ناخوانا. ضمناً
 * کسب‌وکاری در فاصله‌ی ۲.۶ کیلومتر هم در AR ظاهر می‌شد.
 * (شواهد: ضبط صفحه‌ی ۸ سپتامبر ۲۰۲۶ توسط مالک محصول.)
 *
 * این توابع خالص‌اند و روی خروجی موجود `buildView` کار می‌کنند — هیچ مسیر
 * داده‌ی جدیدی باز نمی‌شود و `buildView` دست‌نخورده می‌ماند.
 * ──────────────────────────────────────────────────────────────────────────── */

/** شعاع‌های مجاز نمایش AR (متر) — تصمیم مالک محصول */
export const AR_RADIUS_OPTIONS = [15, 30, 50, 100] as const;
export const AR_DEFAULT_RADIUS = 30;

/** حداکثر حباب فرعی روی صحنه؛ باقی به «موارد بیشتر» می‌روند */
export const AR_MAX_SECONDARY = 5;

export interface ArSceneItem extends ArVitrineItem {
  /** درصد افقی نهایی پس از رفع هم‌پوشانی */
  screenXPercent: number;
  /** ردیف عمودی — برای جداکردن حباب‌هایی که افقی به هم نزدیک‌اند */
  laneIndex: number;
  /** ضریب اندازه بر پایه‌ی فاصله، بین کف و سقف مشخص */
  sizeScale: number;
}

export interface ArScene {
  primary: ArSceneItem | null;
  secondary: ArSceneItem[];
  /** تعداد مواردی که در میدان دید بودند اما روی صحنه جا نشدند */
  overflowCount: number;
  behindCount: number;
  declaredFloor: number | null;
  declaredBuildingId: string | null;
}

export interface SceneOptions {
  /** دسته‌ی موردعلاقه‌ی کاربر — در انتخاب کارت اصلی وزن دارد */
  preferredCategory?: string | null;
  /** وقتی جهت‌یابی قابل‌اعتماد نیست، مرکزیت وزن کمتری می‌گیرد */
  headingReliable?: boolean;
  fovDeg?: number;
}

/**
 * امتیاز کاندیدای کارت اصلی. نزدیک‌ترین لزوماً اصلی نیست — اگر از مرکز جهت
 * دوربین دور باشد، کاندیدای وسط‌تر برنده می‌شود.
 */
function primaryScore(item: ArVitrineItem, opts: SceneOptions, fov: number): number {
  // ۱) مرکزیت: هرچه به مرکز میدان دید نزدیک‌تر، بهتر
  const centrality = 1 - Math.min(1, Math.abs(item.placement.relativeBearingDeg) / (fov / 2));
  // ۲) نزدیکی: نرمال‌شده روی ۱۰۰ متر
  const proximity = 1 - Math.min(1, item.distanceMeters / 100);
  // ۳) تطابق دسته با نیاز کاربر
  const categoryMatch =
    opts.preferredCategory != null && item.category === opts.preferredCategory ? 1 : 0;
  // ۴) داشتن پیشنهاد فعال
  const hasOffer = item.activeOffer !== null ? 1 : 0;

  /**
   * وقتی جهت‌یابی قابل‌اعتماد نیست، `relativeBearingDeg` اصلاً یک اندازه‌گیری
   * واقعی نیست — پس مرکزیت فقط باید تساوی را بشکند، نه تصمیم را بگیرد. وزن
   * ۰٫۱۵ برای این کار کافی نبود: بازه‌ی مرکزیت روی نصف FOV (۳۰ درجه) نرمال
   * می‌شود و بازه‌ی نزدیکی روی ۱۰۰ متر، پس اختلاف مرکزیت طبیعتاً چند برابر
   * بزرگ‌تر درمی‌آید و باز هم برنده را تعیین می‌کرد. با ۰٫۰۵ عملاً خاموش است.
   */
  const wCentre = opts.headingReliable === false ? 0.05 : 0.45;
  const wProx = opts.headingReliable === false ? 0.7 : 0.3;

  return wCentre * centrality + wProx * proximity + 0.15 * categoryMatch + 0.1 * hasOffer;
}

/** اندازه بر پایه‌ی فاصله، با کف و سقف تا حباب‌ها نه غول شوند نه ناخوانا */
function sizeFor(distanceMeters: number, radiusMeters: number): number {
  const MIN = 0.55;
  const MAX = 1;
  const t = Math.min(1, Math.max(0, distanceMeters / Math.max(1, radiusMeters)));
  return MAX - (MAX - MIN) * t;
}

/**
 * رفع هم‌پوشانی افقی: آیتم‌ها به ترتیب اهمیت چیده می‌شوند و هرکدام که به
 * آیتم چیده‌شده‌ی قبلی نزدیک‌تر از حد مجاز باشد، به ردیف بعدی منتقل می‌شود.
 * ساده و قطعی — بدون فیزیک و بدون حلقه‌ی همگرایی.
 */
function assignLanes(items: ArSceneItem[], minGapPercent: number, maxLanes: number): ArSceneItem[] {
  const placed: ArSceneItem[] = [];
  const laneOccupancy: number[][] = Array.from({ length: maxLanes }, () => []);

  for (const item of items) {
    let lane = 0;
    while (lane < maxLanes) {
      const clash = laneOccupancy[lane].some((x) => Math.abs(x - item.screenXPercent) < minGapPercent);
      if (!clash) break;
      lane += 1;
    }
    if (lane >= maxLanes) continue; // جا نشد — به overflow می‌رود
    laneOccupancy[lane].push(item.screenXPercent);
    placed.push({ ...item, laneIndex: lane });
  }
  return placed;
}

/**
 * از خروجی `buildView` یک صحنه‌ی خوانا می‌سازد: یک کارت اصلی، حداکثر
 * AR_MAX_SECONDARY حباب فرعی، بدون هم‌پوشانی، و شمارش باقی‌مانده‌ها.
 */
export function composeArScene(
  view: ArViewResponse,
  radiusMeters: number,
  opts: SceneOptions = {},
): ArScene {
  const fov = opts.fovDeg ?? 60;

  const enriched: ArSceneItem[] = view.items.map((it) => ({
    ...it,
    screenXPercent: it.placement.screenXPercent,
    laneIndex: 0,
    sizeScale: sizeFor(it.distanceMeters, radiusMeters),
  }));

  if (enriched.length === 0) {
    return {
      primary: null,
      secondary: [],
      overflowCount: 0,
      behindCount: view.behindCount,
      declaredFloor: view.declaredFloor,
      declaredBuildingId: view.declaredBuildingId,
    };
  }

  const ranked = [...enriched].sort((a, b) => primaryScore(b, opts, fov) - primaryScore(a, opts, fov));
  const primary = { ...ranked[0], sizeScale: 1, laneIndex: 0 };

  const rest = ranked.slice(1);
  // فرعی‌ها از کارت اصلی فاصله‌ی افقی داشته باشند و روی هم نیفتند
  const candidates = rest.filter(
    (it) => Math.abs(it.screenXPercent - primary.screenXPercent) >= 14,
  );
  const laid = assignLanes(candidates, 18, 2);
  const secondary = laid.slice(0, AR_MAX_SECONDARY);
  const overflowCount = view.items.length - 1 - secondary.length;

  return {
    primary,
    secondary,
    overflowCount: Math.max(0, overflowCount),
    behindCount: view.behindCount,
    declaredFloor: view.declaredFloor,
    declaredBuildingId: view.declaredBuildingId,
  };
}
