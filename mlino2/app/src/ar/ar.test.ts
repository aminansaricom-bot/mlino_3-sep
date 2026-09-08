// ar.test.ts — تست‌های فاز ۳: ویترین AR
// همه‌ی منطق خالص (جهت‌یابی، میدان دید، فیلتر طبقه) و ردیابی‌پذیری به دایرکتوری واقعی.

import { describe, it, expect, beforeAll } from 'vitest';
import {
  angularDifference,
  bearingDegrees,
  headingFromAlpha,
  headingFromCompassEvent,
  normalizeHeading,
  placeOverlay,
} from './arOrientation';
import {
  composeArScene,
  AR_MAX_SECONDARY,
  AR_DEFAULT_RADIUS,
  AR_RADIUS_OPTIONS,
  type ArVitrineItem,
  type ArViewResponse,
} from './ArOverlayService';
import { ArOverlayService } from './ArOverlayService';
import { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from '../directory/loader';

let directory: BusinessDirectoryService;
let ar: ArOverlayService;

beforeAll(async () => {
  directory = new BusinessDirectoryService();
  directory.loadSnapshot(await loadMockSnapshotRaw());
  ar = new ArOverlayService(directory);
});

describe('arOrientation — محاسبات جهت‌یابی', () => {
  it('normalizeHeading بازه‌ی [0,360) را تضمین می‌کند', () => {
    expect(normalizeHeading(-10)).toBe(350);
    expect(normalizeHeading(370)).toBe(10);
    expect(normalizeHeading(360)).toBe(0);
  });

  it('angularDifference اختلاف کوتاه را می‌دهد (نه مسیر بلند)', () => {
    expect(angularDifference(350, 10)).toBe(20);
    expect(angularDifference(0, 180)).toBe(180);
    expect(angularDifference(90, 270)).toBe(180);
  });

  it('bearing: از مرکز تهران به شمال = حدود ۰ درجه (شمال جغرافیایی)', () => {
    const b = bearingDegrees(35.7, 51.4, 35.8, 51.4);
    expect(b).toBeCloseTo(0, 0);
  });

  it('bearing: به سمت شرق = حدود ۹۰ درجه', () => {
    const b = bearingDegrees(35.7, 51.4, 35.7, 51.5);
    expect(b).toBeCloseTo(90, 0);
  });

  it('bearing: به سمت غرب = حدود ۲۷۰ درجه', () => {
    const b = bearingDegrees(35.7, 51.5, 35.7, 51.4);
    expect(b).toBeCloseTo(270, 0);
  });
});

describe('placeOverlay — جایگذاری روی صحنه', () => {
  it('کسب‌وکار مقابلِ دوربین → وسط صحنه (۵۰٪)', () => {
    const p = placeOverlay(45, 45, 100);
    expect(p).not.toBeNull();
    expect(p?.screenXPercent).toBeCloseTo(50, 5);
    expect(p?.scaleBucket).toBe('near');
  });

  it('کسب‌وکار در لبه‌ی میدان دید → لبه‌ی صحنه', () => {
    const p = placeOverlay(0, 30, 100, 60); // ۳۰ درجه چپِ مرکز، نیم‌فیلد=۳۰
    expect(p?.screenXPercent).toBeCloseTo(0, 5);
  });

  it('کسب‌وکار پشت سر (خارج میدان دید) → null', () => {
    expect(placeOverlay(180, 0, 100)).toBeNull();
    expect(placeOverlay(100, 0, 100, 60)).toBeNull();
  });

  it('مرز چپ/راست درست تشخیص داده می‌شود (اختلاف ۳۴۰ درجه = ۲۰ درجه سمت دیگر)', () => {
    const p = placeOverlay(350, 10, 500);
    expect(p).not.toBeNull();
    expect(p?.relativeBearingDeg).toBeCloseTo(-20, 5);
    expect(p?.scaleBucket).toBe('mid');
  });

  it('فاصله‌ی زیاد → bucket «far»', () => {
    const p = placeOverlay(45, 45, 2000);
    expect(p?.scaleBucket).toBe('far');
  });
});

describe('رفع یافته‌ی A-1 — قطب‌نمای اندروید (alpha → heading)', () => {
  it('alpha پادساعتگرد است؛ heading قطب‌نما ساعتگرد: 360 − alpha', () => {
    expect(headingFromAlpha(0)).toBe(0);
    expect(headingFromAlpha(270)).toBe(90); // دستگاه ساعتگرد ۹۰° → شرق
    expect(headingFromAlpha(90)).toBe(270); // پادساعتگرد ۹۰° → غرب
    expect(headingFromAlpha(180)).toBe(180);
  });

  it('رویداد غیر-absolute هرگز به‌عنوان شمال تفسیر نمی‌شود', () => {
    const r = headingFromCompassEvent({ alpha: 120, absolute: false });
    expect(r.kind).toBe('not-absolute');
  });

  it('رویداد absolute با تبدیل 360−alpha هد می‌دهد', () => {
    const r = headingFromCompassEvent({ alpha: 270, absolute: true });
    expect(r).toEqual({ kind: 'ok', headingDeg: 90 });
  });

  it('iOS: webkitCompassHeading اولویت دارد و ساعتگرد است (بدون تبدیل)', () => {
    const r = headingFromCompassEvent({ webkitCompassHeading: 45, alpha: 315, absolute: false });
    expect(r).toEqual({ kind: 'ok', headingDeg: 45 });
  });

  it('بدون داده‌ی معتبر → no-data (نه حدس)', () => {
    const r = headingFromCompassEvent({ alpha: null, absolute: true });
    expect(r.kind).toBe('no-data');
  });
});

describe('ArOverlayService — ویترین از دایرکتوری واقعی', () => {
  const VANAK = { latitude: 35.7603, longitude: 51.41 };

  it('همه‌ی ویترین‌ها قابل‌ردیابی به رکورد واقعی دایرکتوری‌اند (ضدتوهم ساختاری)', () => {
    const view = ar.buildView({
      ...VANAK,
      radiusMeters: 5000,
      headingDeg: 0,
      fovDeg: 360,
    });
    const allIds = new Set(directory.getAll().map((r) => r.business_id));
    for (const item of view.items) {
      expect(allIds.has(item.businessId)).toBe(true);
      const rec = directory.getById(item.businessId);
      expect(rec).not.toBeNull();
      for (const p of item.activeProducts) {
        expect(rec?.products.some((rp) => rp.product_id === p.product_id && rp.is_active)).toBe(
          true,
        );
      }
      if (item.activeOffer !== null) {
        expect(rec?.offers.some((o) => o.offer_id === item.activeOffer?.offer_id)).toBe(true);
      }
    }
  });

  it('میدان دید محدود → فقط کسب‌وکارهای جلوی کاربر؛ بقیه در behindCount', () => {
    const narrow = ar.buildView({ ...VANAK, radiusMeters: 5000, headingDeg: 0, fovDeg: 60 });
    const wide = ar.buildView({ ...VANAK, radiusMeters: 5000, headingDeg: 0, fovDeg: 360 });
    expect(narrow.items.length).toBeLessThan(wide.items.length);
    expect(narrow.items.length + narrow.behindCount).toBe(wide.items.length);
  });

  it('قرارداد طبقه: فقط با اعلام صریح کاربر فیلتر می‌شود — هرگز حدس GPS', () => {
    // بدون اعلام طبقه: همه‌ی کسب‌وکارهای پاساژ در همه‌ی طبقات
    const noFloor = ar.buildView({
      ...VANAK,
      radiusMeters: 5000,
      headingDeg: 0,
      fovDeg: 360,
      buildingId: 'bldg_mock_pasazh_vanak',
    });
    const recs = noFloor.items.map((i) => directory.getById(i.businessId));
    const floors = new Set(recs.map((r) => r?.location.floor_level));
    expect(floors.size).toBeGreaterThan(1);

    // با اعلام طبقه‌ی ۰ (همکف): فقط همان طبقه
    const ground = ar.buildView({
      ...VANAK,
      radiusMeters: 5000,
      headingDeg: 0,
      fovDeg: 360,
      buildingId: 'bldg_mock_pasazh_vanak',
      floorLevel: 0,
    });
    for (const item of ground.items) {
      const rec = directory.getById(item.businessId);
      expect(rec?.location.building_id).toBe('bldg_mock_pasazh_vanak');
      expect(rec?.location.floor_level).toBe(0);
    }
    expect(ground.declaredFloor).toBe(0);
  });

  it('ساختمان‌های چندطبقه‌ی اطراف برای پرسش صریح طبقه شناسایی می‌شوند', () => {
    const buildings = ar.multiFloorBuildingsAround(VANAK.latitude, VANAK.longitude, 2000);
    expect(buildings.length).toBeGreaterThan(0);
    const vanak = buildings.find((b) => b.buildingId === 'bldg_mock_pasazh_vanak');
    expect(vanak).toBeDefined();
    expect(vanak?.floors.length).toBeGreaterThan(1);
  });

  it('آفر فعال با تخفیف واقعی رکورد برگردانده می‌شود — نه اختراع', () => {
    const view = ar.buildView({ ...VANAK, radiusMeters: 5000, headingDeg: 0, fovDeg: 360 });
    const withOffer = view.items.filter((i) => i.activeOffer !== null);
    for (const item of withOffer) {
      const rec = directory.getById(item.businessId);
      const offer = rec?.offers.find((o) => o.offer_id === item.activeOffer?.offer_id);
      expect(offer).toBeDefined();
      expect(item.activeOffer?.discount_percent).toBe(offer?.discount_percent);
    }
  });

  it('شعاع کوچک → ویترین خالی، بدون ساخت آیتم جعلی', () => {
    const view = ar.buildView({
      latitude: 35.7,
      longitude: 51.2,
      radiusMeters: 50,
      headingDeg: 0,
      fovDeg: 360,
    });
    expect(view.items).toEqual([]);
    expect(view.behindCount).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * صحنه‌ی AR — سناریوهای الزامی مالک محصول (۸ سپتامبر ۲۰۲۶)
 * انگیزه: تست میدانی نشان داد کارت‌ها روی هم می‌افتند و کسب‌وکار ۲.۶ کیلومتری
 * هم در AR ظاهر می‌شود.
 * ──────────────────────────────────────────────────────────────────────────── */
describe('صحنه‌ی AR — یک کارت اصلی، حباب‌های فرعی، بدون هم‌پوشانی', () => {
  const mk = (
    id: string,
    relBearing: number,
    dist: number,
    extra: Partial<ArVitrineItem> = {},
  ): ArVitrineItem => ({
    businessId: id,
    name: id,
    category: 'cafe',
    distanceMeters: dist,
    activeProducts: [],
    activeOffer: null,
    placement: {
      relativeBearingDeg: relBearing,
      screenXPercent: 50 + (relBearing / 30) * 50,
      scaleBucket: dist < 30 ? 'near' : dist < 60 ? 'mid' : 'far',
    },
    ...extra,
  });

  const viewOf = (items: ArVitrineItem[], behind = 0): ArViewResponse => ({
    items,
    behindCount: behind,
    declaredFloor: null,
    declaredBuildingId: null,
  });

  it('۱ — با ۱۰ کسب‌وکار در میدان دید: دقیقاً یک کارت اصلی و حداکثر ۵ حباب', () => {
    const items = Array.from({ length: 10 }, (_, i) => mk(`b${i}`, -28 + i * 6, 10 + i * 5));
    const scene = composeArScene(viewOf(items), 100);
    expect(scene.primary).not.toBeNull();
    expect(scene.secondary.length).toBeLessThanOrEqual(AR_MAX_SECONDARY);
    expect(scene.overflowCount).toBeGreaterThan(0);
  });

  it('۴ — حباب نزدیک‌تر بزرگ‌تر از حباب دورتر است', () => {
    const scene = composeArScene(viewOf([mk('near', -20, 10), mk('far', 20, 90)]), 100);
    const all = [scene.primary!, ...scene.secondary];
    const near = all.find((i) => i.businessId === 'near')!;
    const far = all.find((i) => i.businessId === 'far')!;
    // کارت اصلی همیشه ۱ است؛ مقایسه‌ی اندازه روی مقدار خام فاصله انجام می‌شود
    expect(near.sizeScale).toBeGreaterThanOrEqual(far.sizeScale);
  });

  it('۵ — هیچ دو موردی روی هم قرار نمی‌گیرند (فاصله‌ی افقی یا ردیف متفاوت)', () => {
    const items = Array.from({ length: 8 }, (_, i) => mk(`b${i}`, -14 + i * 4, 20 + i));
    const scene = composeArScene(viewOf(items), 100);
    const placed = [scene.primary!, ...scene.secondary];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const sameLane = placed[i].laneIndex === placed[j].laneIndex;
        const gap = Math.abs(placed[i].screenXPercent - placed[j].screenXPercent);
        if (sameLane) expect(gap).toBeGreaterThanOrEqual(14);
      }
    }
  });

  it('نزدیک‌ترین همیشه اصلی نیست — موردِ وسطِ میدان دید بر نزدیکِ لبه ترجیح دارد', () => {
    const edgeButClose = mk('edge', 29, 8);
    const centredFarther = mk('centre', 1, 25);
    const scene = composeArScene(viewOf([edgeButClose, centredFarther]), 100, {
      headingReliable: true,
    });
    expect(scene.primary!.businessId).toBe('centre');
  });

  it('وقتی جهت‌یابی قابل‌اعتماد نیست، فاصله وزن بیشتری می‌گیرد', () => {
    const edgeButClose = mk('edge', 29, 8);
    const centredFarther = mk('centre', 1, 25);
    const scene = composeArScene(viewOf([edgeButClose, centredFarther]), 100, {
      headingReliable: false,
    });
    expect(scene.primary!.businessId).toBe('edge');
  });

  it('تطابق دسته با نیاز کاربر در انتخاب اصلی اثر دارد', () => {
    const a = mk('cafe-one', 5, 30);
    const b = mk('dental-one', 5, 30, { category: 'dental_clinic' });
    const scene = composeArScene(viewOf([a, b]), 100, { preferredCategory: 'dental_clinic' });
    expect(scene.primary!.businessId).toBe('dental-one');
  });

  it('۳ — چیزی که خارج از میدان دید است اصلاً به صحنه نمی‌رسد (شمارش پشت سر)', () => {
    const scene = composeArScene(viewOf([], 9), 30);
    expect(scene.primary).toBeNull();
    expect(scene.secondary).toHaveLength(0);
    expect(scene.behindCount).toBe(9);
  });

  it('شعاع پیش‌فرض ۳۰ متر است و گزینه‌ها همان چهار مقدار مصوب‌اند', () => {
    expect(AR_DEFAULT_RADIUS).toBe(30);
    expect([...AR_RADIUS_OPTIONS]).toEqual([15, 30, 50, 100]);
  });
});
