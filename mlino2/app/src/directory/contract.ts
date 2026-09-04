// contract.ts — تایپ‌های Business Directory Record
// دقیقاً مطابق بخش ۲ سند 02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md
// این فایل تنها منبع حقیقت «شکل داده‌ی V1→V2» در V2 است.
// NOTE(contract): floor_level و building_id فیلدهای درجه‌یک‌اند (الزام سند 01 بخش ۳).

export type V2BusinessCategory =
  | 'dental_clinic'
  | 'beauty_clinic'
  | 'cafe'
  | 'restaurant'
  | 'retail_shop';

export interface V2BusinessLocation {
  /** عرض جغرافیایی (WGS84) */
  latitude: number;
  /** طول جغرافیایی (WGS84) */
  longitude: number;
  /** طبقه، اگر داخل ساختمان چندطبقه است — null یعنی ساختمان اختصاصی/بدون طبقه */
  floor_level: number | null;
  /** شناسه‌ی ساختمان/پاساژ/مال برای گروه‌بندی چندطبقه — null یعنی ندارد */
  building_id: string | null;
}

export interface V2BusinessProduct {
  product_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface V2BusinessOffer {
  offer_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  /** ISO timestamp */
  valid_from: string;
  /** ISO timestamp | null — null یعنی بدون تاریخ پایان */
  valid_until: string | null;
}

/**
 * رکورد دایرکتوری کسب‌وکار — کپی خواندنیِ Cache در V2.
 * منبع حقیقت این داده همیشه V1 است؛ V2 هرگز آن را تولید یا تغییر نمی‌دهد.
 */
export interface V2BusinessDirectoryRecord {
  /** شناسه‌ی پایدار کسب‌وکار در V1 */
  business_id: string;
  /** همان organization_id که در V1 استفاده می‌شود */
  organization_id: string;
  name: string;
  category: V2BusinessCategory;
  location: V2BusinessLocation;
  products: V2BusinessProduct[];
  offers: V2BusinessOffer[];
  /** آخرین باری که این رکورد از V1 به‌روزرسانی شد — ISO timestamp */
  last_synced_at: string;
}

/**
 * Snapshot فایل Export (گزینه‌ی ۲ قرارداد — مکانیزم انتقال فاز اول):
 * یک فایل JSON دوره‌ای از سمت V1 (فعلاً Mock) که V2 وارد می‌کند.
 */
export interface V2BusinessDirectoryExport {
  /** نسخه‌ی شکل داده — فعلاً برابر نسخه‌ی سند قرارداد */
  contract_version: 'draft-1';
  generated_at: string;
  records: V2BusinessDirectoryRecord[];
}
