// What Melino (the robot in the corner of the search page) says, and when. Pure functions, so the rules that keep it
// helpful and not tiresome are tested: one greeting per visit (shorter after the first), tips only after a quiet spell,
// each tip once per session, at most three per visit, and nothing unsolicited after the person closes its bubble.
import { msg, num, tr } from '../i18n';

export type BuddyAction = 'photo' | 'voice' | 'live' | 'offers' | 'saved';
export type BuddyTip = Readonly<{ id: string; text: string; action?: BuddyAction; actionLabel?: string }>;

export const IDLE_MS = 9000;
export const MAX_TIPS_PER_VISIT = 3;

const TIPS: readonly BuddyTip[] = [
  { id: 'photo', text: msg('از یک محصول عکس بگیر تا مشابهش را در کسب‌وکارهای ملینو پیدا کنم.'), action: 'photo', actionLabel: msg('جست‌وجو با عکس') },
  { id: 'live', text: msg('در ویترین زنده گوشی را به اطراف بگیر تا کسب‌وکارها و محصولات نزدیک را ببینی.'), action: 'live', actionLabel: msg('ویترین زنده') },
  { id: 'voice', text: msg('می‌توانی با صدا بپرسی؛ مثلاً «کافه‌ی باز نزدیک من».'), action: 'voice', actionLabel: msg('پرسیدن با صدا') },
  { id: 'offers', text: msg('آفرهای فعال نزدیکت را یک‌جا ببین.'), action: 'offers', actionLabel: msg('دیدن آفرها') },
  { id: 'chat', text: msg('با هر کسب‌وکار می‌توانی مستقیم گفتگو کنی؛ شماره‌ات به او نشان داده نمی‌شود.') },
  { id: 'saved', text: msg('محصولی را که دوست داری ذخیره کن تا بعداً راحت پیدایش کنی.'), action: 'saved', actionLabel: msg('ذخیره‌ها') },
];

/** Tips whose action this screen can really do, not yet shown this session. */
export function nextTip(available: ReadonlySet<BuddyAction>, shown: readonly string[]): BuddyTip | null {
  return TIPS.find((t) => !shown.includes(t.id) && (!t.action || available.has(t.action))) ?? null;
}

/** Whether a tip may appear now. */
export function mayTip(o: { idleFor: number; bubbleOpen: boolean; quiet: boolean; tipsThisVisit: number; typing: boolean }): boolean {
  return !o.quiet && !o.bubbleOpen && !o.typing && o.idleFor >= IDLE_MS && o.tipsThisVisit < MAX_TIPS_PER_VISIT;
}

/** The greeting: the full one on the first visit of the session, then short and varied ones. */
export function greeting(visit: number): string {
  if (visit <= 1) return tr('سلام! من ملینو هستم. دنبال چی می‌گردی؟ بنویس یا بگو تا کمکت کنم.');
  return visit % 2 === 0 ? tr('دنبال چی می‌گردی؟') : tr('بگو چی لازم داری تا نزدیک‌ترینش را پیدا کنیم.');
}

/** A short line after the person stops typing: what was found, or what to try instead. */
export function resultLine(query: string, counts: { businesses: number; products: number }): string {
  const q = query.trim();
  if (counts.businesses === 0 && counts.products === 0) return tr('برای «{0}» چیزی پیدا نکردم. ساده‌تر بنویس یا با عکس بگرد.', q);
  return tr('برای «{0}»، {1} کسب‌وکار و {2} محصول پیدا کردم. برای پاسخ کامل‌تر روی من بزن.', q, num(counts.businesses), num(counts.products));
}
