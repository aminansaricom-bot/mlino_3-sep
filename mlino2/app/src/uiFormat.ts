import { tr, numberLocale } from './i18n';
// uiFormat.ts — توابع نمایش مشترک (App، دستیار، ویترین AR)
// خالص و تست‌پذیر — هیچ وابستگی به React.

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    dental_clinic: tr('دندان‌پزشکی'),
    beauty_clinic: tr('زیبایی'),
    cafe: tr('کافه'),
    restaurant: tr('رستوران'),
    retail_shop: tr('فروشگاه'),
  };
  return map[cat] ?? cat;
}

export function floorLabel(floor: number | null, buildingId: string | null): string | null {
  if (floor === null || buildingId === null) return null;
  if (floor === 0) return tr('همکف');
  // رقم فارسی، و «منفی» به‌جای خط تیره‌ی چسبیده که در RTL بد خوانده می‌شد
  if (floor < 0) return tr('طبقه منفی {0}', Math.abs(floor).toLocaleString(numberLocale()));
  return tr('طبقه {0}', floor.toLocaleString(numberLocale()));
}

/** برچسب فیلتر طبقه؛ برای فهرست عمومی طبقات، بدون نیاز به building_id. */
export function floorFilterLabel(floor: number): string {
  if (floor === 0) return tr('همکف');
  if (floor < 0) return tr('طبقه منفی {0}', Math.abs(floor).toLocaleString(numberLocale()));
  return tr('طبقه {0}', floor.toLocaleString(numberLocale()));
}

export function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return tr('بدون قیمت');
  const num = price.toLocaleString(numberLocale());
  return currency === 'IRR' ? tr('{0} ریال', num) : num;
}

export function formatIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString(numberLocale());
  } catch {
    return iso;
  }
}

export function formatDistance(meters: number): string {
  // رقم فارسی، هماهنگ با بقیه‌ی اعداد اپ (تعداد نتایج، درصد تخفیف)
  return meters >= 1000
    ? tr('{0} کیلومتر', (meters / 1000).toLocaleString(numberLocale(), { maximumFractionDigits: 1 }))
    : tr('{0} متر', Math.round(meters).toLocaleString(numberLocale()));
}
