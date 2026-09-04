// geo.ts — محاسبات جغرافیایی سبک برای فاز ۱
// NOTE: تعمداً بدون PostGIS/دیتابیس — طبق تصمیم ثبت‌شده در گزارش فاز ۱،
// این ماژول نقطه‌ی تزریق جایگزینی آینده است (همین Interface، پیاده‌سازی PostGIS).

const EARTH_RADIUS_METERS = 6_371_000;

/** فاصله‌ی مستقیم دو نقطه روی زمین به متر (Haversine) */
export function haversineDistanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(s)));
}
