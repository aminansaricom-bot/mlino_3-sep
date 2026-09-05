// uiFormat.ts — توابع نمایش مشترک (App، دستیار، ویترین AR)
// خالص و تست‌پذیر — هیچ وابستگی به React.

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    dental_clinic: 'دندان‌پزشکی',
    beauty_clinic: 'زیبایی',
    cafe: 'کافه',
    restaurant: 'رستوران',
    retail_shop: 'فروشگاه',
  };
  return map[cat] ?? cat;
}

export function floorLabel(floor: number | null, buildingId: string | null): string | null {
  if (floor === null || buildingId === null) return null;
  if (floor === 0) return 'همکف';
  if (floor < 0) return `طبقه ${Math.abs(floor)}-`;
  return `طبقه ${floor}`;
}

export function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return 'بدون قیمت';
  const num = price.toLocaleString('fa-IR');
  return currency === 'IRR' ? `${num} ریال` : num;
}

export function formatIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR');
  } catch {
    return iso;
  }
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} کیلومتر` : `${Math.round(meters)} متر`;
}
