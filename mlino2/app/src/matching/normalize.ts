// normalize.ts — نرمال‌سازی متن فارسی برای تطبیق واژگانی
// بخشی از «جست‌وجوی معنایی سبک» فاز ۲: بدون سرویس بیرونی، تعیین‌کننده و تست‌پذیر.
// NOTE: این یک تقریب واژگانی از جست‌وجوی معنایی است؛ Embedding واقعی
// فقط با تصمیم مالک محصول و سرویس‌دهنده‌ی LLM اضافه می‌شود (گزارش فاز ۲).

/** یکسان‌سازی نویسه‌های عربی/فارسی، حذف نیم‌فاصله و اضافات */
export function normalizeFa(input: string): string {
  return input
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[\u064B-\u065F\u0670]/g, '') // اعراب
    .replace(/\u200c/g, ' ') // نیم‌فاصله → فاصله
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // نقطه‌گذاری → فاصله
    .replace(/\s+/g, ' ')
    .trim();
}

/** توکن‌های نرمال‌شده */
export function tokenizeFa(input: string): string[] {
  const normalized = normalizeFa(input);
  return normalized.length === 0 ? [] : normalized.split(' ');
}

/** حذف پسوندهای رایج سبک (فقط برای تطبیق، نه زبان‌شناسی کامل) */
const LIGHT_SUFFIXES = ['ها', 'های', 'انی', 'ام', 'ات', 'اش'];

export function stripLightSuffix(token: string): string {
  for (const suffix of LIGHT_SUFFIXES) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

export function stemFaTokens(input: string): string[] {
  return tokenizeFa(input).map(stripLightSuffix);
}
