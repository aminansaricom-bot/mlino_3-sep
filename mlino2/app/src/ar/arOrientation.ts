// arOrientation.ts — محاسبات جهت‌یابی برای ویترین AR (خالص و تست‌پذیر)
// NOTE(phase-3): تصمیم فنی ثبت‌شده در گزارش فاز ۳ — بدون SDK تجاری AR؛
// Geo-AR سبک با Web API (دوربین + قطب‌نما/gyro). طبقه هرگز از حسگر حدس زده نمی‌شود (سند 01 بخش ۳).

/** زاویه را به بازه‌ی [0, 360) نرمال می‌کند */
export function normalizeHeading(deg: number): number {
  const h = deg % 360;
  return h < 0 ? h + 360 : h;
}

/** کوچک‌ترین اختلاف زاویه‌ی دو جهت (۰ تا ۱۸۰) */
export function angularDifference(a: number, b: number): number {
  const d = Math.abs(normalizeHeading(a) - normalizeHeading(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * آزیموت (جهت جغرافیایی) از نقطه‌ی الف به نقطه‌ی ب بر حسب درجه — شمال=۰، شرق=۹۰.
 * همین تابع با GPS افقی کاربر ترکیب می‌شود تا مشخص شود کدام کسب‌وکار
 * در میدان دید دوربین است — طبقه/عمق هرگز در این محاسبه دخیل نیست.
 */
export function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(toLng - fromLng);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeHeading(toDeg(Math.atan2(y, x)));
}

export interface ArOverlayPlacement {
  /** اختلاف زاویه‌ای جهت کسب‌وکار با مرکز میدان دید (درجه، منفی=چپ، مثبت=راست) */
  relativeBearingDeg: number;
  /** موقعیت افقی روی صحنه بر حسب درصد (۰=لبه چپ، ۱۰۰=لبه راست) */
  screenXPercent: number;
  /** اندازه‌ی کارت بر اساس فاصله — دورتر = کوچک‌تر */
  scaleBucket: 'near' | 'mid' | 'far';
}

/**
 * جایگذاری یک کارت ویترین روی تصویر دوربین.
 * هدف: تقریب هندسی شفاف و قابل‌تست — نه شبیه‌سازی کامل سه‌بعدی.
 */
export function placeOverlay(
  bearingDeg: number,
  headingDeg: number,
  distanceMeters: number,
  fovDeg: number = 60,
): ArOverlayPlacement | null {
  const diff = normalizeHeading(bearingDeg - headingDeg);
  // به بازه‌ی (-180, 180] تبدیل می‌کنیم تا «چپ/راست مرکز» معنا دار شود
  const signed = diff > 180 ? diff - 360 : diff;
  const halfFov = fovDeg / 2;
  if (Math.abs(signed) > halfFov) return null;
  const screenXPercent = 50 + (signed / halfFov) * 50;
    const scaleBucket = distanceMeters <= 200 ? 'near' : distanceMeters <= 1000 ? 'mid' : 'far';
    return { relativeBearingDeg: signed, screenXPercent, scaleBucket };
  }

/**
 * تبدیل alpha سنسور به Heading قطب‌نمایی (شمال=۰، ساعتگرد).
 * یافته‌ی A-1 بازبینی فاز ۳: alpha در deviceorientation پادساعتگرد و نسبت به
 * جهت اولیه‌ی دستگاه است؛ Heading قطب‌نما ساعتگرد است — روی دستگاه‌های
 * استاندارد (اندروید/Chrome) تبدیل درست «360 − alpha» است.
 * فقط وقتی معتبر است که رویداد absolute باشد (deviceorientationabsolute یا absolute=true)؛
 * در غیر این صورت تماس‌گیرنده باید صادقانه به «جهت دستی» برگردد، نه حدس.
 */
export function headingFromAlpha(alphaDeg: number): number {
  return normalizeHeading(360 - alphaDeg);
}

export interface CompassEventInput {
  /** مقدار iOS — واقعاً جهت جغرافیایی شمال (ساعتگرد) — اگر موجود بود اولویت دارد */
  webkitCompassHeading?: number;
  /** مقدار استاندارد alpha (پادساعتگرد، نسبت به مرجع رویداد) */
  alpha: number | null;
  /** رویداد نسبت به شمال واقعی است؟ (deviceorientationabsolute / absolute=true) */
  absolute: boolean;
}

export type HeadingResult =
  | { kind: 'ok'; headingDeg: number }
  | { kind: 'not-absolute' }
  | { kind: 'no-data' };

/** ورودی رویداد قطب‌نما (iOS یا استاندارد) → Heading معتبر یا دلیل صریح رد */
export function headingFromCompassEvent(event: CompassEventInput): HeadingResult {
  if (typeof event.webkitCompassHeading === 'number') {
    return { kind: 'ok', headingDeg: normalizeHeading(event.webkitCompassHeading) };
  }
  if (event.alpha === null || typeof event.alpha !== 'number') {
    return { kind: 'no-data' };
  }
  // یافته‌ی A-1: alpha غیر-absolute مرجع نامعلوم دارد — هرگز به‌عنوان شمال تفسیر نمی‌شود
  if (!event.absolute) {
    return { kind: 'not-absolute' };
  }
  return { kind: 'ok', headingDeg: headingFromAlpha(event.alpha) };
}
