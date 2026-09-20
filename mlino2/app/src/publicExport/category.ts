import type { PublicRecord } from './mapping';

export type DisplayCategory =
  | 'dental_clinic'
  | 'beauty_clinic'
  | 'cafe'
  | 'restaurant'
  | 'retail_shop'
  | 'uncategorized';

export type DerivedCategory = Readonly<{
  key: DisplayCategory;
  label: string;
  guessed: true;
}>;

type CategoryRule = Readonly<{ key: Exclude<DisplayCategory, 'uncategorized'>; label: string; tokens: readonly string[] }>;

export const CATEGORY_RULES: readonly CategoryRule[] = [
  { key: 'dental_clinic', label: 'درمان و دندان', tokens: ['dental', 'dentist', 'دندان', 'دندانپزشک', 'دندانپزشکی', 'ایمپلنت', 'ارتودنسی', 'جرم گیری', 'عصب کشی'] },
  { key: 'beauty_clinic', label: 'زیبایی و مراقبت', tokens: ['beauty', 'skin', 'laser', 'زیبایی', 'پوست', 'لیزر', 'بوتاکس', 'فیلر', 'مو'] },
  { key: 'cafe', label: 'کافه', tokens: ['cafe', 'coffee', 'کافه', 'قهوه', 'اسپرسو', 'لاته'] },
  { key: 'restaurant', label: 'رستوران و غذا', tokens: ['restaurant', 'food', 'رستوران', 'غذا', 'کباب', 'پیتزا', 'برگر'] },
  { key: 'retail_shop', label: 'فروشگاه', tokens: ['retail', 'shop', 'store', 'فروشگاه', 'خرید', 'محصول'] },
] as const;

export function normalizeCategoryText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[_-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenMatch(text: string, token: string): boolean {
  const normalizedToken = normalizeCategoryText(token);
  return (` ${text} `).includes(` ${normalizedToken} `);
}

function classify(text: string): CategoryRule | null {
  const normalized = normalizeCategoryText(text);
  if (!normalized) return null;
  let winner: { rule: CategoryRule; score: number } | null = null;
  for (const rule of CATEGORY_RULES) {
    const score = new Set(rule.tokens.filter((token) => tokenMatch(normalized, token)).map(normalizeCategoryText)).size;
    if (score > 0 && (winner === null || score > winner.score)) winner = { rule, score };
  }
  return winner?.rule ?? null;
}

export function deriveDisplayCategory(record: Pick<PublicRecord, 'business' | 'capabilities'>): DerivedCategory {
  const capabilityText = record.capabilities.map((item) => `${item.capability_key} ${item.name}`).join(' ');
  const rule = classify(capabilityText) ?? classify(`${record.business.name} ${record.business.description ?? ''}`);
  return rule
    ? { key: rule.key, label: rule.label, guessed: true }
    : { key: 'uncategorized', label: 'بدون دسته', guessed: true };
}
