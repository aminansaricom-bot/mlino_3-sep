// Melino's gentle coaching: one short, useful tip for the page the member is on — never more than one at a time,
// never while they are typing, and it steps back when ignored. Tips come from the modules' real data first
// (the same daily actions as «امروز»), then a one-time «how to use me here» hint per page. No tip invents a fact.

import { dailyActions, type ModuleId, type Snapshot } from '../modules/registry';
import { faNum } from '../format';

export type Tip = Readonly<{
  id: string;
  text: string;
  action?: Readonly<{ label: string; to?: string; ask?: string }>;
  /** Real data behind it (an action for today) — shown before usage hints. */
  fromData: boolean;
}>;

export type CoachMemory = Readonly<{ seen: readonly string[]; ignoredStreak: number; quietUntil: number; lastShownAt: number }>;
export const EMPTY_MEMORY: CoachMemory = { seen: [], ignoredStreak: 0, quietUntil: 0, lastShownAt: 0 };

/** Wait this long on a page before offering anything; hide an untouched tip after this long. */
export const DWELL_MS = 6000;
export const SHOW_MS = 14000;
/** At least this long between two tips anywhere in the panel. */
export const GAP_MS = 90_000;
/** Two ignored tips in a row → quiet for a day, unless the member opens the assistant themselves. */
export const IGNORE_LIMIT = 2;
export const QUIET_MS = 24 * 3600_000;

function pageModule(path: string): ModuleId | 'home' | null {
  const [, first = '', second = ''] = path.split('/');
  if (!first) return 'home';
  if (first === 'storefront') return second === 'chat' ? 'chat' : second === 'offers' ? 'offers' : 'storefront';
  return (['accounting', 'inventory', 'products', 'crm', 'plan', 'content'] as const).find((m) => m === first) ?? null;
}

const HOWTO: Partial<Record<ModuleId | 'home', Tip>> = {
  home: { id: 'howto:home', fromData: false, text: 'هر وقت خواستی بپرس، مثلاً «سود این ماه چقدره؟» — از همین داده‌های خودت جواب می‌دهم.', action: { label: 'بپرس', ask: 'سود این ماه چقدره؟' } },
  accounting: { id: 'howto:accounting', fromData: false, text: 'به‌جای پر کردن فرم می‌توانی بگویی «هزینه‌ی برق ۱۲ میلیون از بانک»؛ پیش‌نویس سند را آماده می‌کنم و ثبتش با تأیید خودت است.' },
  inventory: { id: 'howto:inventory', fromData: false, text: 'ورود کالا را می‌توانی بگویی، مثلاً «۲۰ کیلو شیر وارد انبار شد به قیمت ۹ میلیون»؛ من فقط پیش‌نویسش را می‌سازم.' },
  crm: { id: 'howto:crm', fromData: false, text: 'عضو تازه فقط با رضایت خود مشتری ثبت می‌شود؛ از من هم فقط آمار کلی می‌شنوی، نه اطلاعات یک نفر.' },
  storefront: { id: 'howto:storefront', fromData: false, text: 'ویترین همان چیزی است که مشتری‌های نزدیک می‌بینند. یک آفر شعاع‌دار برای رهگذرها می‌تواند آن‌ها را به ویترینت بیاورد.', action: { label: 'آفر اطراف', to: '/storefront/offers' } },
  offers: { id: 'howto:offers', fromData: false, text: 'برای رهگذرها شعاع ۵۰۰ متر، برای اهل محله ۱ تا ۲ کیلومتر معمولاً بهتر جواب می‌دهد. آفر تا وقتی خودت منتشرش نکنی دیده نمی‌شود.' },
  chat: { id: 'howto:chat', fromData: false, text: 'جوابی که یک بار به سؤال تکراری می‌دهی را با «یاد بگیر» نگه دار؛ دفعه‌ی بعد پاسخ‌گو خودش همان را می‌گوید.' },
  products: { id: 'howto:products', fromData: false, text: 'محصول با عکس در ویترین زنده و جست‌وجوی V2 بیشتر دیده می‌شود.' },
};

export function tipsFor(path: string, s: Snapshot): Tip[] {
  const page = pageModule(path);
  if (!page || page === 'plan' || page === 'content') return [];
  let actions: ReturnType<typeof dailyActions> = [];
  try { actions = dailyActions(s); } catch { actions = []; }
  const own = page === 'home' ? actions.slice(0, 1) : actions.filter((a) => a.module === page);
  const fromData: Tip[] = own.slice(0, 2).map((a) => ({ id: `act:${a.id}:${a.reason}`, fromData: true, text: `${a.title} — ${a.reason}.`, action: { label: 'رفتن', to: a.to } }));
  // Chat: a switched-off auto-reply is worth one gentle mention when the plan already includes it.
  const c = s.chat?.summary;
  if (page === 'chat' && c && c.autoReplyAllowed && !c.autoReply) {
    fromData.push({ id: 'chat:auto-off', fromData: true, text: `پلنت پاسخ‌گوی خودکار دارد ولی خاموش است${c.conversations ? `؛ ${faNum(c.conversations)} گفتگو داری` : ''}. فقط با جواب‌های تأییدشده‌ی تو جواب می‌دهد و حدس نمی‌زند.` });
  }
  const howto = HOWTO[page];
  return howto ? [...fromData, howto] : fromData;
}

export function pickTip(tips: readonly Tip[], mem: CoachMemory, now: number): Tip | null {
  if (now < mem.quietUntil || now - mem.lastShownAt < GAP_MS) return null;
  return tips.find((t) => !mem.seen.includes(t.id)) ?? null;
}

export function shown(mem: CoachMemory, tip: Tip, now: number): CoachMemory {
  return { ...mem, seen: [...mem.seen.filter((id) => id !== tip.id), tip.id].slice(-300), lastShownAt: now };
}

/** used = tapped its action; ignored = faded untouched; closed = dismissed with ×. */
export function outcome(mem: CoachMemory, kind: 'used' | 'ignored' | 'closed', now: number): CoachMemory {
  if (kind === 'used') return { ...mem, ignoredStreak: 0, quietUntil: 0 };
  const streak = mem.ignoredStreak + 1;
  return { ...mem, ignoredStreak: streak, quietUntil: streak >= IGNORE_LIMIT ? now + QUIET_MS : mem.quietUntil };
}

/** The member opened the assistant themselves: attention is welcome again. */
export function reengaged(mem: CoachMemory): CoachMemory {
  return { ...mem, ignoredStreak: 0, quietUntil: 0 };
}

const KEY = 'mlino.panel.coach';
export function loadMemory(): CoachMemory {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && Array.isArray(v.seen) ? { ...EMPTY_MEMORY, ...v } : EMPTY_MEMORY; } catch { return EMPTY_MEMORY; }
}
export function saveMemory(mem: CoachMemory): void {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* per-viewer convenience only */ }
}
