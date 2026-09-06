// intentContract.ts — قرارداد مشترک خروجی «فهم نیت» برای همه‌ی موتورها
// الزام ۱ و ۵ دستور LLM: خروجی LLM دقیقاً از همین اعتبارسنجی عبور می‌کند که
// خروجی پارسر قاعده‌محور عبور می‌کند — نتیجه‌ی نهایی همیشه از دایرکتوری واقعی
// می‌آید و هیچ موتوری نمی‌تواند کسب‌وکار/محصول اختراع کند.
// NOTE(test): یک تست قرارداد مشترک، هر دو پیاده‌سازی را با همین توابع می‌سنجد.

import type { IntentModifiers, ParsedIntent } from './IntentParser';
import type { V2BusinessCategory } from '../directory/contract';

export type IntentEngineKind = 'rule-based' | 'llm-deepseek' | 'llm-gemini';

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set<V2BusinessCategory>([
  'dental_clinic',
  'beauty_clinic',
  'cafe',
  'restaurant',
  'retail_shop',
]);

export type IntentValidationResult =
  | { ok: true; intent: ParsedIntent }
  | { ok: false; reason: string };

function isValidKeywords(keywords: unknown): keywords is string[] {
  return (
    Array.isArray(keywords) &&
    keywords.every((k) => typeof k === 'string' && k.length > 0 && k.length <= 64) &&
    keywords.length <= 24
  );
}

function isValidModifiers(m: unknown): m is IntentModifiers {
  if (typeof m !== 'object' || m === null) return false;
  const rec = m as Record<string, unknown>;
  for (const key of ['wantsOffer', 'wantsCheap', 'wantsNearest'] as const) {
    const v = rec[key];
    if (v !== undefined && typeof v !== 'boolean') return false;
  }
  return true;
}

/**
 * اعتبارسنجی سخت‌گیرانه‌ی خروجی هر موتور intent (قاعده‌محور یا LLM).
 * قرارداد: category یا یکی از دسته‌های قرارداد است یا null؛ keywords آرایه‌ی
 * رشته‌ی معتبر؛ modifiers بولی. هر انحراف → رد (نه اصلاح حدسی).
 */
export function validateParsedIntent(raw: unknown): IntentValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'intent must be an object' };
  }
  const rec = raw as Record<string, unknown>;

  const category = rec['category'];
  if (category !== null && typeof category !== 'string') {
    return { ok: false, reason: 'category must be string | null' };
  }
  if (typeof category === 'string' && !KNOWN_CATEGORIES.has(category)) {
    return { ok: false, reason: `unknown category "${category}"` };
  }

  if (!isValidKeywords(rec['keywords'])) {
    return { ok: false, reason: 'keywords must be a bounded array of non-empty strings' };
  }

  if (!isValidModifiers(rec['modifiers'])) {
    return { ok: false, reason: 'modifiers must be an object of booleans' };
  }

  return {
    ok: true,
    intent: {
      category: (category as V2BusinessCategory | null) ?? null,
      keywords: rec['keywords'],
      modifiers: rec['modifiers'],
    },
  };
}
