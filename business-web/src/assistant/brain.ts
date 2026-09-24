// Melino's brain in the business panel. Two modes on one base (design doc §6):
//  • proactive: rules over the modules' real data → one message + at most three suggestions;
//  • command: the member's words → a structured result. Writes become a *proposal* that the member
//    edits and confirms; the confirmed proposal goes through the very same module command as the
//    manual form. Governance acts are never executed here — only prepared, with the reason why.
// Understanding is local and deterministic (no external model: provider retention is unresolved).

import {
  balanceSheet, chequeRegister, jalaliMonthRange, jalaliSeasonRange, partyBalances, profitAndLoss, toJalali, treasuryBalances, vatReport,
} from '../engine';
import { lowStock, type BaseUnit } from '../inventoryEngine';
import { compactRial, faNum, jDate, addDays, toFaDigits } from '../format';
import { dailyActions, type Snapshot } from '../modules/registry';
import { crmSummary, expiredConsents, expiringConsents, followUpList } from '../crmEngine';
import type { AssistantState } from './Orb';

// ---------- proactive ----------

export type Suggestion = Readonly<{ id: string; label: string; to: string }>;
export type Evaluation = Readonly<{ state: AssistantState; priority: 'critical' | 'high' | 'medium' | 'low'; message: string; suggestions: readonly Suggestion[] }>;

export function evaluate(s: Snapshot, surface: string): Evaluation {
  const actions = dailyActions(s);
  const related = (to: string) => (to.split('/')[1] ?? '') === surface;
  // Urgency wins; relevance to the current page only breaks ties (Content Studio priority model).
  const ranked = [...actions].sort((a, b) => ({ now: 0, soon: 1, later: 2 }[a.urgency] - { now: 0, soon: 1, later: 2 }[b.urgency]) || Number(related(b.to)) - Number(related(a.to)));
  const suggestions = ranked.slice(0, 3).map((a) => ({ id: a.id, label: a.title, to: a.to }));
  const top = ranked[0];
  if (!top) {
    const m = monthRange(s.today);
    const p = profitAndLoss(s.ledger, { from: m.from, to: s.today });
    return { state: 'happy', priority: 'low', suggestions: [],
      message: p.netSales > 0 ? `کار فوری‌ای نیست. فروش این ماه تا امروز ${compactRial(p.netSales)} ثبت شده.` : 'کار فوری‌ای نیست؛ فعلاً مشکلی گزارش نشده.' };
  }
  const now = ranked.filter((a) => a.urgency === 'now').length;
  return {
    state: now ? 'concerned' : 'suggesting',
    priority: now ? 'high' : 'medium',
    message: now ? `${faNum(now)} کار امروز فوری است. مهم‌ترین: ${top.title} — ${top.reason}.` : `پیشنهاد امروز: ${top.title} — ${top.reason}.`,
    suggestions,
  };
}

// ---------- command understanding ----------

export type Money = Readonly<{ rial: number; assumedToman: boolean; spoken: string }>;

export type Proposal =
  | Readonly<{ kind: 'daily'; amount: Money; cardAll: boolean; date: string }>
  | Readonly<{ kind: 'expense'; amount: Money; account: string; pay: 'cash' | 'bank' | 'credit'; bankId?: string; supplierId?: string; withVat: boolean; date: string; note: string }>
  | Readonly<{ kind: 'receipt' | 'payment'; amount: Money; partyId: string; pay: 'cash' | 'bank'; bankId?: string; date: string }>
  | Readonly<{ kind: 'transfer'; amount: Money; fromId: string; toId: string; date: string }>
  | Readonly<{ kind: 'withdrawal' | 'contribution'; amount: Money; treasuryId: string; date: string }>
  | Readonly<{ kind: 'inv-receive'; itemId: string; qty: number; cost: Money | null; date: string }>
  | Readonly<{ kind: 'inv-issue' | 'inv-count'; itemId: string; qty: number; date: string }>;

export type CommandResult =
  | Readonly<{ type: 'answer'; text: string; to?: string; linkLabel?: string }>
  | Readonly<{ type: 'navigate'; to: string; label: string }>
  | Readonly<{ type: 'proposal'; proposal: Proposal; title: string }>
  | Readonly<{ type: 'governance'; text: string; to: string; linkLabel: string }>
  | Readonly<{ type: 'refuse'; text: string }>
  | Readonly<{ type: 'unknown'; text: string }>;

const monthRange = (today: string) => { const t = toJalali(today); return jalaliMonthRange(t.jy, t.jm); };

export function normalize(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/[،,](?=\d{3})/g, '').replace(/٫/g, '.')
    .replace(/\s+/g, ' ').trim();
}

const WORD_NUM: Record<string, number> = { یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, شیش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10, بیست: 20, سی: 30, چهل: 40, پنجاه: 50, شصت: 60, هفتاد: 70, هشتاد: 80, نود: 90, صد: 100, دویست: 200, سیصد: 300, پانصد: 500 };
const SCALE: Record<string, number> = { هزار: 1e3, تومن: 1, میلیون: 1e6, ملیون: 1e6, میلیارد: 1e9 };

/** The first money amount in the text. Without «ریال», amounts are read as Toman (how people speak) and flagged. */
export function parseMoney(text: string): Money | null {
  // Word numbers only as whole words: «دانه» must not read as «نه» (9).
  const re = /(\d+(?:\.\d+)?|(?<![؀-ۿ])(?:یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده|بیست|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود|صد|دویست|سیصد|پانصد)(?![؀-ۿ]))\s*(هزار|میلیون|ملیون|میلیارد)?\s*(تومان|تومن|ریال)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[2] && !m[3] && !/^\d{4,}$/.test(m[1])) continue; // «۲ کیلو» or «۳ تا» is not money
    const base = /^\d/.test(m[1]) ? Number(m[1]) : WORD_NUM[m[1]];
    const scaled = base * (m[2] ? SCALE[m[2]] : 1);
    const rial = m[3] === 'ریال' ? Math.round(scaled) : Math.round(scaled * 10);
    if (!Number.isSafeInteger(rial) || rial <= 0) continue;
    return { rial, assumedToman: m[3] !== 'ریال' && m[3] !== 'تومان' && m[3] !== 'تومن', spoken: m[0].trim() };
  }
  return null;
}

/** «۲۰ کیلو», «۳ لیتر», «۵۰۰ گرم», «۱۲ تا/عدد» → base units for the item's unit. */
export function parseQty(text: string, unit: BaseUnit): number | null {
  const m = /(\d+(?:\.\d+)?|(?<![؀-ۿ])(?:یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|بیست|سی|پنجاه|صد)(?![؀-ۿ]))\s*(کیلوگرم|کیلو|گرم|لیتر|میلی ?لیتر|عدد|تا|دونه|بسته)?/.exec(text);
  if (!m) return null;
  const n = /^\d/.test(m[1]) ? Number(m[1]) : WORD_NUM[m[1]];
  const u = m[2] ?? '';
  if (unit === 'pcs') return Math.round(n);
  if (/کیلو|لیتر/.test(u) && !/میلی/.test(u)) return Math.round(n * 1000);
  if (/گرم|میلی/.test(u)) return Math.round(n);
  return Math.round(n * 1000); // bare number for weight/volume: kg / L
}

const EXPENSE_KEYS: readonly [RegExp, string, string][] = [
  [/اجاره/, '6102', 'اجاره'], [/حقوق|دستمزد|پرسنل/, '6101', 'حقوق و دستمزد'], [/برق|آب|گاز|تلفن|اینترنت|قبض/, '6103', 'قبض'],
  [/تبلیغ|اینستاگرام|بنر/, '6104', 'تبلیغات'], [/پیک|حمل|ارسال/, '6105', 'حمل و ارسال'], [/کارمزد/, '6106', 'کارمزد بانکی'],
  [/تعمیر|سرویس دستگاه/, '6107', 'تعمیر و نگهداری'], [/بسته ?بندی|لیوان|دستمال/, '6108', 'بسته‌بندی و مصرفی'],
  [/شیر|قهوه|مواد|نان|شیرینی|خرید کالا|میوه/, '5101', 'خرید مواد اولیه و کالا'],
];

const ROUTES: readonly [RegExp, string, string][] = [
  [/چک/, '/accounting/cheques', 'چک‌ها'], [/ترازنامه/, '/accounting/reports:balance', 'ترازنامه'], [/تراز آزمایشی/, '/accounting/reports:trial', 'تراز آزمایشی'],
  [/سود|زیان|گزارش/, '/accounting/reports', 'گزارش‌ها'], [/سند|اسناد|دفتر/, '/accounting/journal', 'اسناد'], [/حسابداری/, '/accounting', 'حسابداری'],
  [/انبار|موجودی کالا|موجودی مواد/, '/inventory', 'انبار'], [/دستور مصرف|رسپی/, '/inventory/recipes', 'دستور مصرف'],
  [/ویترین/, '/storefront', 'ویترین'], [/محصول|منو/, '/products', 'محصولات'], [/آفر|تخفیف/, '/storefront/offers', 'آفرها'],
  [/محتوا|اینستاگرام|پست/, '/content', 'تولید محتوا'], [/پیام|گفتگو|چت/, '/storefront/chat', 'گفتگو با مشتری'], [/مشتری|crm/i, '/crm', 'مشتریان'], [/امروز|خانه|داشبورد/, '/', 'امروز'],
];

const SUFFIX = /^(ها|های|ی|ای|رو|را|مون|تون)?$/;
/** Whole-word match (so «شیر» does not match «شیرینی»), allowing common Persian suffixes. */
function hasWord(text: string, word: string): boolean {
  const w = normalize(word);
  if (w.length < 2) return false;
  return text.split(' ').some((t) => t.startsWith(w) && SUFFIX.test(t.slice(w.length)));
}
const STOP = new Set(['و', 'ی', 'از', 'به', 'با', 'کافه', 'بانک', 'صندوق', 'شرکت', 'خانم', 'آقای']);
const nameWords = (name: string) => normalize(name.replace(/[()]/g, ' ')).split(' ').filter((w) => w.length >= 2 && !STOP.has(w));

function findParty(s: Snapshot, text: string, role: 'customer' | 'supplier'): string | undefined {
  const parties = s.ledger.listParties().filter((p) => p.role === role || p.role === 'both');
  return parties.find((p) => nameWords(p.name).some((w) => hasWord(text, w)))?.id;
}

function findTreasury(s: Snapshot, text: string, kind?: 'cash' | 'bank'): string | undefined {
  const all = s.ledger.listTreasuries().filter((t) => !kind || t.kind === kind);
  const named = all.find((t) => nameWords(t.name).some((w) => hasWord(text, w)));
  if (named) return named.id;
  if (kind) return all[0]?.id;
  if (/صندوق|نقد/.test(text)) return all.find((t) => t.kind === 'cash')?.id;
  if (/بانک|کارت|حساب/.test(text)) return all.find((t) => t.kind === 'bank')?.id;
  return undefined;
}

function findStockItem(s: Snapshot, text: string) {
  return s.inventory.listItems().find((i) => nameWords(i.name).some((w) => hasWord(text, w)));
}

const isQuestion = (t: string) => !/شمرد|شمارش/.test(t) && /\?|؟|چقدر|چقد|چند|چیه|کدوم|کدام|چطوره|بگو/.test(t);

export function understand(raw: string, s: Snapshot): CommandResult {
  const text = normalize(raw);
  if (!text) return { type: 'unknown', text: 'چیزی ننوشتی.' };
  const date = /دیروز/.test(text) ? addDays(s.today, -1) : s.today;

  // Standing delegation to a machine is refused outright (D-57 §4.6).
  if (/از این به بعد|همیشه خودت|خودکار منتشر|هر روز خودت|بدون پرسیدن/.test(text)) {
    return { type: 'refuse', text: 'این یکی را نمی‌توانم قبول کنم: اختیار ماندگار به ماشین داده نمی‌شود. هر ثبت یا انتشار را برای همان مورد مشخص آماده می‌کنم و تأیید با خود شماست.' };
  }
  // Governance: prepare, never execute.
  if (/منتشر|انتشار|پابلیش|آفر (بساز|بذار|فعال)|تخفیف (بذار|بده|فعال)|عکس (اضافه|بذار)|اجازه بده به|دسترسی بده/.test(text)) {
    const to = /عکس|محصول|منو/.test(text) ? '/products' : /ویترین|پروفایل|ساعت/.test(text) ? '/storefront' : '/storefront/offers';
    return { type: 'governance', to, linkLabel: 'رفتن به همان بخش',
      text: to === '/storefront/offers'
        ? 'آفر را خودت در «ویترین مجازی ← آفر اطراف» می‌سازی: عنوان، مدت و شعاعی که می‌خواهی. اول پیش‌نویس ساخته می‌شود و فقط با دکمه‌ی «انتشار» خودت در V2 دیده می‌شود؛ من به جای تو منتشر نمی‌کنم.'
        : 'انتشار و دادن دسترسی تصمیم خود شماست و روی همان مورد با دکمه‌ی انتشار انجام می‌شود؛ من فقط آماده‌اش می‌کنم. در این نسخه‌ی نمایشی، ویرایش و انتشار پس از ورود عضو فعال می‌شود.' };
  }

  // Chat (D-73): the panel assistant never reads or writes customer messages; it knows only counts. (The business's
  // own auto-reply, D-75, runs on the server and is switched on in the chat section.)
  if (/پیام|گفتگو|چت/.test(text) && !/تبلیغ/.test(text)) {
    if (/جواب|پاسخ|بفرست|بنویس|بگو به/.test(text)) {
      return { type: 'governance', to: '/storefront/chat/questions', linkLabel: 'سؤال‌های بی‌جواب', text: 'من پیام‌های مشتری را نمی‌خوانم و به جای کسی چیزی نمی‌فرستم. جواب را خودت در گفتگو می‌نویسی؛ اگر پاسخ‌گوی خودکار روشن باشد (پلن پرو و مکس)، سؤال‌هایی که نمی‌دانست در «سؤال‌های بی‌جواب» منتظر جواب توست و می‌توانی برای دفعه‌ی بعد یادش بدهی.' };
    }
    const c = s.chat;
    if (!c?.loggedIn) return { type: 'answer', to: '/storefront/chat', linkLabel: 'ورود و گفتگو', text: 'برای دیدن گفتگوها اول باید با شماره‌ی موبایل وارد شوی. بعد از ورود فقط شمار پیام‌های خوانده‌نشده را به تو می‌گویم، نه متن آن‌ها را.' };
    if (!c.summary) return { type: 'answer', to: '/storefront/chat', linkLabel: 'گفتگو با مشتری', text: 'وضعیت گفتگوها الان خوانده نشد؛ حدسی نمی‌زنم. در خود صفحه‌ی گفتگو ببین.' };
    return { type: 'answer', to: '/storefront/chat', linkLabel: 'گفتگو با مشتری', text: c.summary.sensitive ? 'گفتگو برای این کسب‌وکار خاموش است، چون در دسته‌ی حساس قرار دارد.' : `${faNum(c.summary.conversations)} گفتگو داری و ${c.summary.unreadMessages ? `${faNum(c.summary.unreadMessages)} پیام خوانده‌نشده در ${faNum(c.summary.unreadConversations)} گفتگو` : 'پیام خوانده‌نشده‌ای نیست'}${c.summary.pendingQuestions ? `؛ ${faNum(c.summary.pendingQuestions)} سؤال هم منتظر جواب توست` : ''}. متن پیام‌ها را فقط خودت در صفحه‌ی گفتگو می‌بینی.` };
  }

  // CRM: the assistant speaks only in aggregates and never reads or repeats a person's data (R8-a §3.6).
  if (/مشتری|عضو|باشگاه/.test(text) && !/(به|از) (شرکت|خانم|آقای)/.test(text)) {
    if (/جدید|تازه|ثبت نام|ثبت‌نام|اضافه کن|عضو کن/.test(text)) {
      return { type: 'governance', to: '/crm/register', linkLabel: 'فرم عضو تازه', text: 'عضو تازه فقط با رضایت خود مشتری ثبت می‌شود و این رضایت را خودت در فرم ثبت می‌کنی؛ من اطلاعات کسی را بدون آن ثبت نمی‌کنم.' };
    }
    if (isQuestion(text) || /غیرفعال|نیامده|رضایت/.test(text)) {
      const cs = crmSummary(s.crm, s.today, monthRange(s.today).from);
      const follow = followUpList(s.crm, s.today).length;
      const exp = expiredConsents(s.crm, s.today).length + expiringConsents(s.crm, s.today).length;
      return { type: 'answer', to: '/crm', linkLabel: 'مشتریان', text: `${faNum(cs.members)} عضو فعال با رضایت؛ ${faNum(cs.visitsThisMonth)} مراجعه این ماه؛ ${faNum(cs.marketingOptIn)} نفر پیام تبلیغاتی را پذیرفته‌اند؛ ${faNum(follow)} نفر از آن‌ها بیش از ۳۰ روز نیامده‌اند${exp ? `؛ رضایت ${faNum(exp)} عضو تمام شده یا رو به پایان است` : ''}. جزئیات هر نفر فقط در خود بخش مشتریان و با ثبت دسترسی دیده می‌شود.` };
    }
  }

  if (isQuestion(text)) {
    const m = monthRange(s.today);
    if (/سود|زیان|نتیجه/.test(text)) {
      const prev = /ماه (قبل|پیش|گذشته)/.test(text);
      const t = toJalali(s.today);
      const r = prev ? jalaliMonthRange(t.jm === 1 ? t.jy - 1 : t.jy, t.jm === 1 ? 12 : t.jm - 1) : m;
      const p = profitAndLoss(s.ledger, { from: r.from, to: r.to < s.today ? r.to : s.today });
      return { type: 'answer', to: '/accounting/reports', linkLabel: 'گزارش سود و زیان',
        text: `${p.netProfit >= 0 ? 'سود' : 'زیان'} ${toFaDigits(r.label)}${prev ? '' : ' تا امروز'}: ${compactRial(p.netProfit)} — فروش خالص ${compactRial(p.netSales)}، هزینه ${compactRial(p.totalExpenses)}.` };
    }
    if (/فروش/.test(text)) {
      const from = /امروز/.test(text) ? s.today : /دیروز/.test(text) ? addDays(s.today, -1) : m.from;
      const to = /دیروز/.test(text) ? from : s.today;
      const p = profitAndLoss(s.ledger, { from, to });
      return { type: 'answer', to: '/accounting/reports', linkLabel: 'گزارش‌ها', text: `فروش خالص ${from === to ? (from === s.today ? 'امروز' : 'دیروز') : 'این ماه تا امروز'}: ${compactRial(p.netSales)} (بدون ارزش افزوده).` };
    }
    const stock = findStockItem(s, text);
    if (stock && /موجودی|چقدر|داریم|مونده|مانده/.test(text) && !/بانک|صندوق|نقد/.test(text)) {
      const on = s.inventory.onHand(stock.id).qty;
      const d = on >= 1000 && stock.unit !== 'pcs' ? `${faNum(Math.round(on / 100) / 10)} ${stock.unit === 'g' ? 'کیلوگرم' : 'لیتر'}` : `${faNum(on)} ${stock.unit === 'g' ? 'گرم' : stock.unit === 'ml' ? 'میلی‌لیتر' : 'عدد'}`;
      return { type: 'answer', to: '/inventory', linkLabel: 'انبار', text: `موجودی دفتری ${stock.name}: ${d}${on <= stock.reorderLevel ? ' — زیر حد سفارش است.' : '.'}` };
    }
    if (/موجودی|بانک|صندوق|نقد/.test(text)) {
      const rows = treasuryBalances(s.ledger, s.today);
      return { type: 'answer', to: '/accounting', linkLabel: 'حسابداری', text: rows.map((t) => `${t.name}: ${compactRial(t.balance)}`).join('؛ ') + '.' };
    }
    if (/چک/.test(text)) {
      const open = chequeRegister(s.ledger, s.today, { status: 'open' });
      const soon = open.filter((c) => c.dueDate <= addDays(s.today, 14));
      return { type: 'answer', to: '/accounting/cheques', linkLabel: 'چک‌ها',
        text: open.length === 0 ? 'چک در جریانی نداری.' : `${faNum(open.length)} چک در جریان است${soon.length ? `؛ نزدیک‌ترین: ${soon[0].partyName}، ${compactRial(soon[0].amount)}، سررسید ${jDate(soon[0].dueDate)}` : ''}.` };
    }
    if (/بدهی|طلب|بدهکار|بستانکار/.test(text)) {
      const rows = partyBalances(s.ledger, s.today);
      const r = rows.filter((p) => p.receivable > 0).map((p) => `${p.name} ${compactRial(p.receivable)}`);
      const pay = rows.filter((p) => p.payable > 0).map((p) => `${p.name} ${compactRial(p.payable)}`);
      return { type: 'answer', to: '/accounting/reports:parties', linkLabel: 'طرف حساب‌ها', text: `طلب از مشتری‌ها: ${r.join('، ') || 'ندارید'}. بدهی به تأمین‌کننده‌ها: ${pay.join('، ') || 'ندارید'}.` };
    }
    if (/مالیات|ارزش افزوده/.test(text)) {
      const t = toJalali(s.today);
      const season = jalaliSeasonRange(t.jy, (Math.floor((t.jm - 1) / 3) + 1) as 1 | 2 | 3 | 4);
      const v = vatReport(s.ledger, season);
      return { type: 'answer', to: '/accounting/reports:vat', linkLabel: 'گزارش ارزش افزوده', text: `ارزش افزوده‌ی ${toFaDigits(season.label)} تا امروز: فروش ${compactRial(v.output)}، خرید قابل کسر ${compactRial(v.input)}، پرداختنی ${compactRial(v.payable)}.` };
    }
    if (/ترازنامه|دارایی/.test(text)) {
      const b = balanceSheet(s.ledger, s.today);
      return { type: 'answer', to: '/accounting/reports:balance', linkLabel: 'ترازنامه', text: `دارایی‌ها ${compactRial(b.totalAssets)} = بدهی‌ها ${compactRial(b.totalLiabilities)} + سرمایه ${compactRial(b.totalEquity)}.` };
    }
    if (/کم|تموم|تمام|سفارش/.test(text)) {
      const low = lowStock(s.inventory);
      return { type: 'answer', to: '/inventory', linkLabel: 'انبار', text: low.length ? `زیر حد سفارش: ${low.map((r) => r.name).join('، ')}.` : 'هیچ قلمی زیر حد سفارش نیست.' };
    }
  }

  // ---- writes: always a proposal, never a direct write ----
  const money = parseMoney(text);
  const stock = findStockItem(s, text);

  if (stock && /وارد|ورود|رسید|اومد|آمد|تحویل|خرید/.test(text) && !/فروش|مصرف|شمرد/.test(text)) {
    const qty = parseQty(text.replace(money?.spoken ?? '\u0000', ''), stock.unit);
    if (qty) return { type: 'proposal', title: `ورود ${stock.name} به انبار`, proposal: { kind: 'inv-receive', itemId: stock.id, qty, cost: money, date } };
  }
  if (stock && /مصرف|ضایع|دور ریخت|خراب|ریخت/.test(text)) {
    const qty = parseQty(text, stock.unit);
    if (qty) return { type: 'proposal', title: `مصرف ${stock.name}`, proposal: { kind: 'inv-issue', itemId: stock.id, qty, date } };
  }
  if (stock && /شمرد|شمارش|الان .* داریم|موجودی واقعی/.test(text)) {
    const qty = parseQty(text, stock.unit);
    if (qty !== null) return { type: 'proposal', title: `شمارش ${stock.name}`, proposal: { kind: 'inv-count', itemId: stock.id, qty, date } };
  }

  if (money) {
    if (/فروش/.test(text)) {
      return { type: 'proposal', title: 'ثبت فروش روزانه', proposal: { kind: 'daily', amount: money, cardAll: /کارت|پوز|کارتخوان/.test(text), date } };
    }
    if (/انتقال|جابجا|جابه جا|واریز .* به (بانک|حساب)/.test(text)) {
      const fromCash = /از صندوق|نقد/.test(text);
      const from = fromCash ? findTreasury(s, 'صندوق') : findTreasury(s, text.split(/ به /)[0] ?? text, 'bank');
      const to = findTreasury(s, text.split(/ به /)[1] ?? '', fromCash ? 'bank' : undefined) ?? findTreasury(s, 'بانک', 'bank');
      if (from && to && from !== to) return { type: 'proposal', title: 'انتقال وجه', proposal: { kind: 'transfer', amount: money, fromId: from, toId: to, date } };
    }
    if (/برداشت/.test(text)) return { type: 'proposal', title: 'برداشت مالک', proposal: { kind: 'withdrawal', amount: money, treasuryId: findTreasury(s, text) ?? findTreasury(s, '', 'bank')!, date } };
    if (/آورده|سرمایه گذاشتم|سرمایه اضافه/.test(text)) return { type: 'proposal', title: 'آورده‌ی مالک', proposal: { kind: 'contribution', amount: money, treasuryId: findTreasury(s, text) ?? findTreasury(s, '', 'bank')!, date } };
    const customer = findParty(s, text, 'customer');
    if (customer && /دریافت|گرفتم|واریز کرد|پرداخت کرد|داد/.test(text)) {
      const bank = /بانک|کارت|واریز/.test(text);
      return { type: 'proposal', title: 'دریافت از مشتری', proposal: { kind: 'receipt', amount: money, partyId: customer, pay: bank ? 'bank' : 'cash', bankId: bank ? findTreasury(s, text, 'bank') : undefined, date } };
    }
    const supplier = findParty(s, text, 'supplier');
    if (supplier && /پرداخت|دادم|تسویه|واریز/.test(text) && !/قبض|اجاره|حقوق/.test(text)) {
      const bank = !/نقد|صندوق/.test(text);
      return { type: 'proposal', title: 'پرداخت به تأمین‌کننده', proposal: { kind: 'payment', amount: money, partyId: supplier, pay: bank ? 'bank' : 'cash', bankId: bank ? findTreasury(s, text, 'bank') : undefined, date } };
    }
    const cat = EXPENSE_KEYS.find(([re]) => re.test(text));
    if (cat || /هزینه|خرید|پرداخت|قبض/.test(text)) {
      const pay = /نسیه/.test(text) ? 'credit' : /بانک|کارت|حساب|ملت|سامان|واریز/.test(text) ? 'bank' : 'cash';
      return { type: 'proposal', title: 'ثبت هزینه', proposal: {
        kind: 'expense', amount: money, account: cat?.[1] ?? '6199', pay, bankId: pay === 'bank' ? findTreasury(s, text, 'bank') : undefined,
        supplierId: findParty(s, text, 'supplier'), withVat: /فاکتور|ارزش افزوده|مالیات/.test(text), date, note: cat?.[2] ?? 'هزینه',
      } };
    }
  }

  const route = ROUTES.find(([re]) => re.test(text));
  if (route && /برو|باز|نشون|نمایش|ببینم|کجا|صفحه/.test(text)) return { type: 'navigate', to: route[1], label: route[2] };
  if (route && !money) return { type: 'navigate', to: route[1], label: route[2] };

  return { type: 'unknown', text: 'منظورت را مطمئن نفهمیدم و حدس نمی‌زنم. مثلاً بگو: «هزینه‌ی برق ۱۲ میلیون از بانک ملت»، «فروش امروز ۴۵ میلیون کارت»، «۲۰ کیلو شیر وارد انبار شد به قیمت ۹ میلیون»، «سود این ماه چقدره؟» یا «برو به چک‌ها».' };
}
