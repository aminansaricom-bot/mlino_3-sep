// demoSocial.ts — امتیاز و نظر «نمونه» برای ساخت نمایشی.
//
// امتیاز و نظر در قرارداد امضاشده وجود ندارد و نباید از داده‌ی واقعی وانمود شود.
// پس این لایه فقط وقتی فعال است که ساخت نمایشی باشد (VITE_DEMO_RELOCATE=1) و فقط
// برای رکوردهای آزمایشی (شناسه‌ی «test-»). مقدارها قطعی‌اند (از روی شناسه ساخته
// می‌شوند) تا با هر بار باز کردن برنامه عوض نشوند، و همه‌جا برچسب «نمونه» دارند.

import { DEMO_REVIEW_TEXTS } from './demoReviewTexts';

export const DEMO_SOCIAL_ENABLED = import.meta.env.VITE_DEMO_RELOCATE === '1';

export type DemoReview = Readonly<{ author: string; stars: number; text: string }>;
export type DemoRating = Readonly<{ average: number; count: number }>;

/** FNV-1a — هش کوچک و قطعی برای ساختن مقدار شبه‌تصادفی پایدار. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** نام نمایشی بدون نشانه‌ی «(آزمایشی)». */
export function displayName(name: string): string {
  return name.replace('(آزمایشی)', '').trim();
}

export function isDemoSocialRecord(id: string): boolean {
  return id.startsWith('test-');
}

/** امتیاز نمونه‌ی کسب‌وکار: بین ۳٫۸ و ۴٫۹ با ۴۰ تا ۴۸۰ رأی، قطعی از روی شناسه. */
export function demoBusinessRating(id: string, enabled = DEMO_SOCIAL_ENABLED): DemoRating | null {
  if (!enabled || !isDemoSocialRecord(id)) return null;
  const hash = stableHash(id);
  return { average: Math.round((3.8 + (hash % 12) / 10) * 10) / 10, count: 40 + (Math.floor(hash / 12) % 441) };
}

/** نظرهای نمونه‌ی یک محصول با ستاره‌ی قطعی ۳ تا ۵، و میانگین آن‌ها. */
export function demoProductReviews(name: string, enabled = DEMO_SOCIAL_ENABLED): { reviews: DemoReview[]; rating: DemoRating | null } {
  if (!enabled) return { reviews: [], rating: null };
  const texts = DEMO_REVIEW_TEXTS[displayName(name)] ?? [];
  const reviews = texts.map(([author, text]) => ({ author, text, stars: 3 + (stableHash(text) % 3) }));
  if (!reviews.length) return { reviews, rating: null };
  const average = Math.round((reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length) * 10) / 10;
  return { reviews, rating: { average, count: reviews.length } };
}

/** «۴٫۶» با رقم فارسی. */
export function formatRating(value: number): string {
  return value.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
