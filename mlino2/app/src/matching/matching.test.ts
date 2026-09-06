// matching.test.ts — تست‌های فاز ۲: پارسر نیت + سرویس تطبیق
// همه‌ی نتایج باید قابل‌ردیابی به دایرکتوری واقعی باشند (بدون اختراع).

import { describe, it, expect, beforeAll } from 'vitest';
import { RuleBasedIntentParser, extractRadiusMeters } from './IntentParser';
import { MatchingService } from './MatchingService';
import { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from '../directory/loader';
import { normalizeFa, stemFaTokens } from './normalize';

const parser = new RuleBasedIntentParser();
let directory: BusinessDirectoryService;
let matching: MatchingService;

beforeAll(async () => {
  directory = new BusinessDirectoryService();
  directory.loadSnapshot(await loadMockSnapshotRaw());
  matching = new MatchingService(directory);
});

describe('normalizeFa', () => {
  it('نویسه‌های عربی و نیم‌فاصله یکسان می‌شوند', () => {
    expect(normalizeFa('دُنداني‌پزشکی، كافه')).toBe('دنداني پزشکی کافه'.replace(/ي/g, 'ی'));
  });

  it('پسوند سبک حذف می‌شود', () => {
    expect(stemFaTokens('فروشگاه‌ها')).toContain('فروشگاه');
  });
});

describe('RuleBasedIntentParser — تعیین‌کننده بودن', () => {
  it('همان ورودی، همیشه همان خروجی', () => {
    const a = parser.parse('قهوه می‌خوام');
    const b = parser.parse('قهوه می‌خوام');
    expect(a).toEqual(b);
  });

  it('نیت دندان‌پزشکی را تشخیص می‌دهد', () => {
    const intent = parser.parse('درد دندونم شدید شده، دنبال دکتر دندانپزشکی هستم');
    expect(intent.category).toBe('dental_clinic');
    expect(intent.keywords).toContain('دندانپزشکی');
  });

  it('نیت کافه را تشخیص می‌دهد', () => {
    expect(parser.parse('یه جای خوب برای قهوه و کاپوچینو').category).toBe('cafe');
  });

  it('نیت زیبایی و لیزر را تشخیص می‌دهد', () => {
    expect(parser.parse('لیزر موهای زائد میخوام').category).toBe('beauty_clinic');
  });

  it('نیت نامطمئن → null (بدون حدس جعلی)', () => {
    expect(parser.parse('سلام خسته نباشید').category).toBeNull();
  });

  it('درخواست تخفیف را به‌عنوان modifier ثبت می‌کند', () => {
    const intent = parser.parse('دنبال تخفیف برای جرمگیری');
    expect(intent.modifiers.wantsOffer).toBe(true);
  });
});

describe('رفع یافته‌های بازبینی ممد (M-1 و I-1)', () => {
  it('M-1: جمله‌ی خالی → category null (نه حدس اولین دسته)', () => {
    expect(parser.parse('').category).toBeNull();
    expect(parser.parse('').keywords).toEqual([]);
  });

  it('M-1: جمله‌ی فقط-Stopword → category null', () => {
    const intent = parser.parse('می که را رو از با و تا');
    expect(intent.category).toBeNull();
  });

  it('I-1: «۲ کیلومتر» با رقم فارسی → ۲۰۰۰ متر', () => {
    expect(extractRadiusMeters('تا ۲ کیلومتر')).toBe(2000);
  });

  it('I-1: «۵۰۰ متر» با رقم فارسی → ۵۰۰ متر', () => {
    expect(extractRadiusMeters('تا ۵۰۰ متر')).toBe(500);
  });

  it('I-1: ارقام لاتین همچنان کار می‌کنند (رفتار قبلی حفظ)', () => {
    expect(extractRadiusMeters('تا 2 km')).toBe(2000);
    expect(extractRadiusMeters('تا 750 متر')).toBe(750);
  });
});

describe('MatchingService — تطبیق با دایرکتوری واقعی', () => {
  it('نیاز دندان‌پزشکی نزدیک تجریش → کلینیک لبخند پارس با محصول منطبق', () => {
    const intent = parser.parse('جرم گیری دندان میخوام');
    const res = matching.match(intent, {
      latitude: 35.7997,
      longitude: 51.4344,
      radiusMeters: 3000,
    });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].record.business_id).toBe('biz_mock_dental_01');
    expect(res.items[0].matchedProducts.length).toBeGreaterThan(0);
    expect(res.items[0].matchedProducts[0].product_id).toBe('prd_d01_01');
  });

  it('قهوه نزدیک پاساژ ونک → کافه مکث (فقط با انتخاب صریحِ نتیجه‌ی داده، نه GPS طبقه)', () => {
    const intent = parser.parse('کاپوچینو و کیک میخوام');
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 1000,
    });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].record.business_id).toBe('biz_mock_cafe_01');
    const ids = res.items[0].matchedProducts.map((p) => p.product_id);
    expect(ids).toContain('prd_c01_02');
  });

  it('فیلتر طبقه در نتیجه‌ی دستیار هم فقط با اعلام صریح کاربر اعمال می‌شود', () => {
    const intent = parser.parse('کاپوچینو میخوام');
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 1000,
      buildingId: 'bldg_mock_pasazh_vanak',
      floorLevel: 0,
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0].record.business_id).toBe('biz_mock_cafe_01');
  });

  it('درخواست تخفیف → آفرِ واقعی رکورد برگردانده می‌شود (اختراع ممنوع)', () => {
    const intent = parser.parse('دنبال تخفیف لیزر هستم');
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
    });
    const top = res.items[0];
    expect(top.record.business_id).toBe('biz_mock_beauty_02');
    expect(top.matchedOffer?.offer_id).toBe('off_b02_01');
  });

  it('شعاع جغرافیایی احترام می‌شود', () => {
    const intent = parser.parse('پیتزا میخوام');
    const res = matching.match(intent, {
      latitude: 35.7997, // تجریش — رستوران در ونک است
      longitude: 51.4344,
      radiusMeters: 1000,
    });
    expect(res.items.length).toBe(0);
  });

  it('هر نتیجه قابل‌ردیابی به رکورد واقعی دایرکتوری است', () => {
    const intent = parser.parse('عسل ارگانیک میخوام');
    const res = matching.match(intent, {
      latitude: 35.8028,
      longitude: 51.4402,
      radiusMeters: 5000,
    });
    const allIds = new Set(directory.getAll().map((r) => r.business_id));
    for (const item of res.items) {
      expect(allIds.has(item.record.business_id)).toBe(true);
      for (const p of item.matchedProducts) {
        const rec = directory.getById(item.record.business_id);
        expect(rec?.products.some((rp) => rp.product_id === p.product_id)).toBe(true);
      }
    }
  });
});

describe('تصمیم مالک: بدون تطبیق واقعی → پاسخ صادقانه خالی (نه رکورد بی‌ربط)', () => {
  it('۱ — «عصرانه با چای ایرانی»: دسته null + بدون تطبیق متنی → items خالی (قبلاً نزدیک‌ترین بی‌ربط بود)', () => {
    const intent = parser.parse('سرو عصرانه با چای ایرانی برای دو نفر');
    expect(intent.category).toBeNull();
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
    });
    expect(res.items).toEqual([]);
  });

  it('۲ — جمله‌ی کاملاً بی‌تطبیق: دسته null + هیچ کلیدواژه‌ای در دایرکتوری نیست → items خالی', () => {
    // جمله‌ای که هیچ کلیدواژه‌اش (حتی به‌صورت زیررشته) در نام/توضیح محصولات نیست
    const intent = parser.parse('یه چیز خیلی خاص و عجیب برای هدیه‌ی ستاره‌شناسی');
    expect(intent.category).toBeNull();
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
    });
    expect(res.items).toEqual([]);
  });

  it('۲-جانبه — «جلسه‌ی کاری با وای‌فای»: تطبیق متنی واقعی دارد (کلمه‌ی «جلسه» در توضیحات لیزر دایرکتوری هست) → خالی نمی‌شود', () => {
    // توضیح: در باتری زنده‌ی قبلی این جمله نزدیک‌ترین رکورد بی‌ربط می‌گرفت؛
    // اما بازبینی دقیق نشان داد کلمه‌ی «جلسه» واقعاً در توضیحات محصولات هست
    // («لیزر در یک جلسه»، «۶ جلسه») — پس تطبیق متنی واقعی است و طبق تصمیم
    // مالک (خالی فقط وقتی هیچ تطبیق متنی نباشد) همچنان نتیجه برمی‌گردد.
    const intent = parser.parse('محلی برای جلسه‌ی کاری با فضای آرام و وای‌فای قوی');
    expect(intent.category).toBeNull();
    const res = matching.match(intent, {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
    });
    expect(res.items.length).toBeGreaterThan(0);
  });

  it('۳ — مرز رفتار: همان کلیدواژه‌های بی‌تطبیق با دسته‌ی صریح (نیت LLM) همچنان نتیجه‌ی دسته می‌دهد', () => {
    // همان جمله‌ی عصرانه، ولی این بار LLM دسته‌ی cafe را صریحاً اعلام کرده
    const res = matching.match(
      { category: 'cafe', keywords: ['عصرانه', 'چای', 'ایرانی'], modifiers: {} },
      { latitude: 35.7603, longitude: 51.41, radiusMeters: 5000 },
    );
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].record.business_id).toBe('biz_mock_cafe_01');
  });

  it('۴ — رگرسیون: تطبیق متنی و دسته‌ی صریح همچنان کار می‌کنند', () => {
    const textMatch = matching.match(parser.parse('جرم گیری دندان میخوام'), {
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
    });
    expect(textMatch.items.length).toBeGreaterThan(0);

    const categoryOnly = matching.match(
      { category: 'cafe', keywords: [], modifiers: {} },
      { latitude: 35.7603, longitude: 51.41, radiusMeters: 5000 },
    );
    expect(categoryOnly.items.length).toBeGreaterThan(0);
  });
});
