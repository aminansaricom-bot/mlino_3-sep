/**
 * Chat auto-reply (owner decision D-75). Runs on the MLINO server only; no external model.
 *
 * It never invents an answer. A reply comes from exactly one of:
 *   1. an answer the business approved (its own knowledge — typed by the owner or learned from the owner's
 *      reply to an earlier question), or
 *   2. the business's own PUBLISHED facts (declared hours, address, public phone, published menu and prices,
 *      active offers) — the same facts V2 shows (D-52).
 * Anything else is escalated: the customer is told the question went to the business, and the owner's
 * answer can be saved as knowledge for next time.
 */

export interface KnowledgeEntry { readonly id: string; readonly question: string; readonly answer: string }

export interface BusinessFacts {
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  /** Declared weekly hours: day 1 = Saturday … 7 = Friday. */
  readonly hours: ReadonlyArray<{ day: number; intervals: ReadonlyArray<{ open: string; close: string }> }> | null;
  readonly items: ReadonlyArray<{ name: string; price: string | null }>;
  readonly offers: ReadonlyArray<{ name: string; until: string | null }>;
}

export type AutoAnswer =
  | { kind: 'knowledge'; entryId: string; text: string }
  | { kind: 'fact'; text: string }
  | { kind: 'greeting'; text: string }
  | { kind: 'unknown' };

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const fa = (s: string) => s.replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export function normalize(text: string): string {
  return text
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀة]/g, 'ه').replace(/[أإآ]/g, 'ا')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[ً-ْـ]/g, '')
    .replace(/‌/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

const STOP = new Set(['و', 'یا', 'از', 'به', 'با', 'در', 'که', 'این', 'اون', 'آن', 'را', 'رو', 'هم', 'تا', 'برای', 'یه', 'یک', 'من', 'ما', 'شما', 'میشه', 'می', 'است', 'هست', 'هستید', 'هستین', 'لطفا', 'ببخشید', 'سلام', 'مرسی', 'ممنون', 'آیا', 'ایا', 'چی', 'چه']);
const SUFFIXES = ['هایی', 'های', 'ها', 'ترین', 'تر', 'ید', 'ین', 'یم', 'ه', 'ی'];

function stem(token: string): string {
  for (const s of SUFFIXES) if (token.length > s.length + 2 && token.endsWith(s)) return token.slice(0, -s.length);
  return token;
}

export function tokens(text: string): string[] {
  return [...new Set(normalize(text).split(' ').filter((t) => t && !STOP.has(t)).map(stem))];
}

/** Share of the stored question's words found in the customer's message, weighted against extra words. */
export function similarity(query: string, stored: string): number {
  const q = tokens(query);
  const s = tokens(stored);
  if (!q.length || !s.length) return 0;
  const hit = s.filter((t) => q.includes(t)).length;
  const recall = hit / s.length;
  const precision = hit / q.length;
  return recall === 0 ? 0 : (2 * recall * precision) / (recall + precision);
}

export const KNOWLEDGE_THRESHOLD = 0.6;

const DAY = ['', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const clean = (s: string) => s.replace(/\s*\(آزمایشی\)/g, '').replace(/\s*—\s*داده‌ی آزمایشی.*$/, '').trim();

function hoursText(hours: NonNullable<BusinessFacts['hours']>): string {
  const byText = new Map<string, number[]>();
  for (let d = 1; d <= 7; d += 1) {
    const day = hours.find((h) => h.day === d);
    const t = day && day.intervals.length ? day.intervals.map((i) => `${i.open} تا ${i.close}`).join(' و ') : 'تعطیل';
    byText.set(t, [...(byText.get(t) ?? []), d]);
  }
  if (byText.size === 1) return `همه‌ی روزها ${fa([...byText.keys()][0])}`;
  return [...byText.entries()].map(([t, days]) => `${days.map((d) => DAY[d]).join('، ')}: ${fa(t)}`).join(' — ');
}

function matchItem(query: string, items: BusinessFacts['items']) {
  const q = tokens(query);
  let best: { item: BusinessFacts['items'][number]; score: number } | null = null;
  for (const item of items) {
    const words = tokens(clean(item.name));
    if (!words.length) continue;
    const hit = words.filter((w) => q.includes(w)).length / words.length;
    if (hit >= 0.99 && (!best || hit > best.score || words.length > tokens(clean(best.item.name)).length)) best = { item, score: hit };
  }
  return best?.item ?? null;
}

export function answer(message: string, knowledge: readonly KnowledgeEntry[], facts: BusinessFacts): AutoAnswer {
  const text = normalize(message);
  if (!text) return { kind: 'unknown' };

  // 1. The business's own approved answers come first.
  let best: { e: KnowledgeEntry; s: number } | null = null;
  let second = 0;
  for (const e of knowledge) {
    const s = similarity(message, e.question);
    if (!best || s > best.s) { second = best?.s ?? 0; best = { e, s }; } else if (s > second) second = s;
  }
  if (best && best.s >= KNOWLEDGE_THRESHOLD && best.s - second >= 0.1) return { kind: 'knowledge', entryId: best.e.id, text: best.e.answer };

  // 2. Published facts, only when the question is clearly about one of them.
  const asksPrice = /قیمت|(^| )چنده?( |$)|چقدر|چقد|هزینه/.test(text);
  const asksHave = /دارید|دارین|دارن|داره|موجود|هست|سرو می/.test(text);
  const item = matchItem(message, facts.items);
  if (item && (asksPrice || asksHave)) {
    const price = item.price ? `قیمت منتشرشده: ${item.price}` : 'قیمتش منتشر نشده است';
    return { kind: 'fact', text: `«${clean(item.name)}» در منوی منتشرشده‌ی ${clean(facts.name)} هست؛ ${price}. موجودی لحظه‌ای را نمی‌دانم.` };
  }
  if (/ساعت|باز|تعطیل|تا کی|از کی|کی میبندی|کی می بندید|بسته/.test(text) && !item) {
    return facts.hours
      ? { kind: 'fact', text: `ساعت کاری اعلام‌شده: ${hoursText(facts.hours)}. برای تعطیلی‌های مناسبتی بهتر است خود کسب‌وکار تأیید کند.` }
      : { kind: 'unknown' };
  }
  if (/آدرس|ادرس|نشانی|کجا|لوکیشن|مسیر|کجاست/.test(text)) {
    return facts.address ? { kind: 'fact', text: `نشانی اعلام‌شده: ${clean(facts.address)}` } : { kind: 'unknown' };
  }
  if (/شماره|تلفن|تماس|زنگ/.test(text)) {
    return facts.phone ? { kind: 'fact', text: `تلفن عمومی: ${fa(facts.phone)}` } : { kind: 'unknown' };
  }
  if (/تخفیف|آفر|افر|پیشنهاد ویژه|جشنواره/.test(text)) {
    if (!facts.offers.length) return { kind: 'fact', text: 'الان آفر منتشرشده‌ی فعالی ندارد.' };
    return { kind: 'fact', text: `آفرهای فعال: ${facts.offers.map((o) => `${clean(o.name)}${o.until ? ` (تا ${o.until})` : ''}`).join('؛ ')}` };
  }

  // 3. A bare greeting or thanks gets a fixed line, not an escalation.
  if (/^(سلام|درود|وقت بخیر|عصر بخیر|صبح بخیر|شب بخیر|ممنون|مرسی|متشکرم|خیلی ممنون|سپاس)( [\p{L}]+)?$/u.test(text) && text.split(' ').length <= 3) {
    return /ممنون|مرسی|متشکر|سپاس/.test(text)
      ? { kind: 'greeting', text: 'خواهش می‌کنم!' }
      : { kind: 'greeting', text: `سلام! سؤالتان را بپرسید؛ اگر جوابش را بدانم همین حالا می‌گویم، وگرنه از ${clean(facts.name)} می‌پرسم.` };
  }
  return { kind: 'unknown' };
}

export const ESCALATION_TEXT = (name: string) => `جواب این را دقیق نمی‌دانم و حدس نمی‌زنم؛ از ${clean(name)} پرسیدم و جوابش همین‌جا می‌آید.`;
