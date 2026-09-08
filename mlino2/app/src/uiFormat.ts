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
  // رقم فارسی، و «منفی» به‌جای خط تیره‌ی چسبیده که در RTL بد خوانده می‌شد
  if (floor < 0) return `طبقه منفی ${Math.abs(floor).toLocaleString('fa-IR')}`;
  return `طبقه ${floor.toLocaleString('fa-IR')}`;
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
  // رقم فارسی، هماهنگ با بقیه‌ی اعداد اپ (تعداد نتایج، درصد تخفیف)
  return meters >= 1000
    ? `${(meters / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلومتر`
    : `${Math.round(meters).toLocaleString('fa-IR')} متر`;
}
