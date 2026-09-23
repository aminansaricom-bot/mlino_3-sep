// Module manifests: the only thing the shell knows about a module (design doc §3.1).
// summary() returns real numbers or «—»; actions() returns daily actions that carry all five D-12
// requirements (reason, owner, expected impact, KPI, measurable outcome) or nothing at all.

import {
  chequeRegister, jalaliMonthRange, jalaliSeasonRange, partyBalances, profitAndLoss, toJalali, treasuryBalances, vatReport, type Ledger,
} from '../engine';
import { lowStock, stockReport, stockValue, displayQty, type Inventory } from '../inventoryEngine';
import { compactRial, faNum, jDate, addDays, toFaDigits } from '../format';
import type { BookData } from '../book';
import type { PublishedBusiness } from '../published';
import { crmSummary, expiredConsents, expiringConsents, followUpList, type Crm } from '../crmEngine';

/** The eleven Core responsibility categories (D-55 · D-65), in Persian. */
export const ROLE_LABEL = {
  owner_founder: 'مالک', executive: 'مدیریت ارشد', general_manager: 'مدیر کل', operations_manager: 'عملیات', marketing: 'بازاریابی',
  sales: 'فروش', customer_service: 'خدمات مشتری', finance: 'مالی', hr: 'منابع انسانی', specialist: 'متخصص', custom_role: 'سایر',
} as const;
export type RoleKey = keyof typeof ROLE_LABEL;

/** Chat reaches the shell only as aggregates from the server (D-73); null when no member is logged in. */
export type ChatSnap = Readonly<{ loggedIn: boolean; summary: Readonly<{ conversations: number; unreadConversations: number; unreadMessages: number; enabled: boolean; sensitive: boolean }> | null }>;

export type Snapshot = Readonly<{ today: string; book: BookData; ledger: Ledger; inventory: Inventory; crm: Crm; published: PublishedBusiness | null | undefined; chat?: ChatSnap | null }>;

export type DailyAction = Readonly<{
  id: string;
  module: ModuleId;
  urgency: 'now' | 'soon' | 'later';
  title: string;
  /** Evidence: the real fact this action comes from. */
  reason: string;
  owner: RoleKey;
  impact: string;
  kpi: string;
  outcome: string;
  to: string;
}>;

export type Stat = Readonly<{ label: string; value: string; tone?: 'good' | 'bad' }>;

export type ModuleId = 'accounting' | 'inventory' | 'products' | 'storefront' | 'offers' | 'content' | 'crm' | 'chat';

export type ModuleManifest = Readonly<{
  id: ModuleId;
  title: string;
  icon: string;
  route: string;
  layer: 'core' | 'module';
  status: 'demo' | 'published-view' | 'live' | 'design' | 'blocked';
  statusNote: string;
  blockedBy?: string;
  summary: (s: Snapshot) => readonly Stat[];
  actions: (s: Snapshot) => readonly DailyAction[];
}>;

const monthOf = (today: string) => { const t = toJalali(today); return jalaliMonthRange(t.jy, t.jm); };

export const MODULES: readonly ModuleManifest[] = [
  {
    id: 'accounting', title: 'حسابداری', icon: '📒', route: '/accounting', layer: 'module', status: 'demo',
    statusNote: 'نمایشی — دفتر نمونه، فقط در همین مرورگر',
    summary: ({ ledger, today }) => {
      const m = monthOf(today);
      const p = profitAndLoss(ledger, { from: m.from, to: today });
      const cash = treasuryBalances(ledger, today).reduce((s, t) => s + t.balance, 0);
      return [
        { label: 'فروش این ماه', value: compactRial(p.netSales + p.otherIncome) },
        { label: 'نقد و بانک', value: compactRial(cash) },
        { label: 'نتیجه‌ی این ماه', value: compactRial(p.netProfit), tone: p.netProfit >= 0 ? 'good' : 'bad' },
      ];
    },
    actions: ({ ledger, today, book }) => {
      const out: DailyAction[] = [];
      for (const c of chequeRegister(ledger, today, { status: 'open' }).filter((c) => c.dueDate <= addDays(today, 7))) {
        const incoming = c.direction === 'received';
        out.push({
          id: `chq-${c.id}`, module: 'accounting', urgency: c.overdue || c.daysToDue <= 1 ? 'now' : 'soon',
          title: incoming ? `وصول چک ${c.partyName}` : `موجودی کافی برای چک پرداختی به ${c.partyName}`,
          reason: `چک ${compactRial(c.amount)} ${c.overdue ? `از ${jDate(c.dueDate)} سررسید گذشته` : `سررسید ${jDate(c.dueDate)} (${c.daysToDue === 0 ? 'امروز' : `${faNum(c.daysToDue)} روز دیگر`})`}`,
          owner: 'finance', impact: incoming ? 'ورود نقدینگی' : 'جلوگیری از برگشت چک و اعتبار کسب‌وکار',
          kpi: incoming ? 'وصول به‌موقع مطالبات' : 'تعهدات پرداخت‌شده‌ی به‌موقع',
          outcome: 'ثبت «وصول شد» یا «برگشت خورد» در بخش چک‌ها', to: '/accounting/cheques',
        });
      }
      const recorded = book.ops.some((op) => op.k === 'daily' && op.input.date === today);
      if (!recorded) out.push({
        id: 'daily-sales', module: 'accounting', urgency: 'soon', title: 'ثبت فروش امروز',
        reason: `برای ${jDate(today)} هنوز فروش روزانه‌ای ثبت نشده`, owner: 'operations_manager',
        impact: 'گزارش سود و ارزش افزوده‌ی درست', kpi: 'کامل بودن دفتر روزانه', outcome: 'یک سند فروش روزانه برای امروز', to: '/accounting/record',
      });
      const t = toJalali(today);
      const season = jalaliSeasonRange(t.jy, (Math.floor((t.jm - 1) / 3) + 1) as 1 | 2 | 3 | 4);
      const daysLeft = Math.round((Date.parse(`${season.to}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
      const vat = vatReport(ledger, season);
      if (daysLeft <= 15 && vat.payable > 0) out.push({
        id: 'vat-season', module: 'accounting', urgency: daysLeft <= 5 ? 'now' : 'soon', title: 'آماده‌سازی اظهارنامه‌ی ارزش افزوده',
        reason: `${faNum(daysLeft)} روز تا پایان ${toFaDigits(season.label)}؛ مانده‌ی پرداختنی ${compactRial(vat.payable)}`, owner: 'finance',
        impact: 'پرهیز از جریمه‌ی دیرکرد', kpi: 'تعهد مالیاتی به‌موقع', outcome: 'گزارش فصل بررسی و پرداخت ثبت شود', to: '/accounting/reports',
      });
      for (const p of partyBalances(ledger, today).filter((p) => p.receivable > 0).slice(0, 2)) out.push({
        id: `ar-${p.id}`, module: 'accounting', urgency: 'later', title: `پیگیری طلب از ${p.name}`,
        reason: `مانده‌ی طلب ${compactRial(p.receivable)}`, owner: 'finance', impact: 'ورود نقدینگی', kpi: 'دوره‌ی وصول مطالبات',
        outcome: 'ثبت دریافت از مشتری', to: '/accounting/record',
      });
      return out;
    },
  },
  {
    id: 'inventory', title: 'موجودی مواد و کالا', icon: '📦', route: '/inventory', layer: 'module', status: 'demo',
    statusNote: 'نمایشی — هم‌داستان با دفتر نمونه',
    summary: ({ inventory }) => {
      const low = lowStock(inventory).length;
      return [
        { label: 'ارزش موجودی', value: compactRial(stockValue(inventory)) },
        { label: 'زیر حد سفارش', value: `${faNum(low)} قلم`, tone: low ? 'bad' : 'good' },
      ];
    },
    actions: ({ inventory }) => {
      const out: DailyAction[] = [];
      for (const r of lowStock(inventory).slice(0, 3)) {
        const q = displayQty(r.qty, r.unit);
        const lvl = displayQty(r.reorderLevel, r.unit);
        out.push({
          id: `low-${r.id}`, module: 'inventory', urgency: r.qty <= 0 ? 'now' : 'soon',
          title: r.negative ? `شمارش ${r.name} — موجودی منفی` : `سفارش ${r.name}`,
          reason: r.negative ? `فروش بیش از موجودی ثبت‌شده؛ موجودی دفتری ${faNum(q.value)} ${q.label}` : `موجودی ${faNum(q.value)} ${q.label}، حد سفارش ${faNum(lvl.value)} ${lvl.label}`,
          owner: 'operations_manager', impact: 'تمام نشدن اقلام منو', kpi: 'در دسترس بودن منو',
          outcome: r.negative ? 'ثبت شمارش واقعی' : 'ثبت ورود کالا به انبار', to: '/inventory/record',
        });
      }
      return out;
    },
  },
  {
    id: 'products', title: 'محصولات و منو', icon: '🍽️', route: '/products', layer: 'core', status: 'published-view',
    statusNote: 'از فایل امضاشده‌ی منتشرشده در V2 — ویرایش پس از ورود عضو',
    summary: ({ published }) => published ? [
      { label: 'قلم منتشرشده', value: `${faNum(published.items.length)} قلم` },
      { label: 'بدون عکس', value: `${faNum(published.items.filter((i) => i.media.length === 0).length)} قلم`, tone: published.items.some((i) => i.media.length === 0) ? 'bad' : 'good' },
    ] : [{ label: 'کاتالوگ', value: '—' }],
    actions: ({ published }) => {
      const missing = published?.items.filter((i) => i.media.length === 0) ?? [];
      return missing.length ? [{
        id: 'photo-missing', module: 'products', urgency: 'later', title: `افزودن عکس برای ${missing.map((i) => i.name.replace(/\s*\(آزمایشی\)/, '')).slice(0, 2).join('، ')}`,
        reason: `${faNum(missing.length)} قلم منتشرشده در V2 بدون عکس دیده می‌شود`, owner: 'marketing',
        impact: 'دیده‌شدن بهتر در ویترین زنده', kpi: 'کامل بودن ویترین', outcome: 'عکس اضافه و با تأیید شما منتشر شود', to: '/products',
      }] : [];
    },
  },
  {
    id: 'storefront', title: 'ویترین مجازی در V2', icon: '🪟', route: '/storefront', layer: 'core', status: 'published-view',
    statusNote: 'همان چیزی که مشتری در نقشه و ویترین زنده می‌بیند',
    summary: ({ published }) => published ? [
      { label: 'وضعیت', value: 'منتشرشده', tone: 'good' },
      { label: 'توانمندی‌ها', value: `${faNum(published.capabilities.length)} مورد` },
    ] : [{ label: 'وضعیت', value: '—' }],
    actions: () => [],
  },
  {
    id: 'offers', title: 'آفر و تخفیف', icon: '🏷️', route: '/offers', layer: 'core', status: 'published-view',
    statusNote: 'آفرهای منتشرشده؛ V2 آن‌ها را کنار نتیجه‌های نزدیک کاربر نشان می‌دهد',
    summary: ({ published, today }) => {
      if (!published) return [{ label: 'آفر', value: '—' }];
      const active = published.offers.filter((o) => (!o.valid_from || o.valid_from.slice(0, 10) <= today) && (!o.valid_until || o.valid_until.slice(0, 10) >= today));
      return [{ label: 'آفر فعال', value: `${faNum(active.length)} آفر` }];
    },
    actions: ({ published, today }) => (published?.offers ?? [])
      .filter((o) => o.valid_until && o.valid_until.slice(0, 10) >= today && o.valid_until.slice(0, 10) <= addDays(today, 14))
      .map((o) => ({
        id: `offer-end-${o.offer_id}`, module: 'offers' as const, urgency: 'soon' as const, title: `تصمیم درباره‌ی پایان «${o.name}»`,
        reason: `اعتبار تا ${jDate(o.valid_until!.slice(0, 10))}`, owner: 'marketing' as const, impact: 'ادامه یا پایان آگاهانه‌ی تخفیف',
        kpi: 'فروش اقلام آفردار', outcome: 'تمدید (نسخه‌ی تازه، با انتشار انسانی) یا پایان', to: '/offers',
      })),
  },
  {
    id: 'content', title: 'تولید محتوا', icon: '✨', route: '/content', layer: 'module', status: 'design',
    statusNote: 'Content Studio — پس از پیوند با رضایت دوطرفه وصل می‌شود', blockedBy: 'D-62 · OD-09',
    summary: () => [{ label: 'اتصال', value: 'وصل نشده' }], actions: () => [],
  },
  {
    id: 'crm', title: 'مشتریان (CRM)', icon: '👥', route: '/crm', layer: 'module', status: 'demo',
    statusNote: 'رضایت سطح A (D-72) — فقط اعضای با رضایت، با تاریخ پایان و حذف واقعی',
    summary: ({ crm, today }) => {
      const s = crmSummary(crm, today, monthOf(today).from);
      return [{ label: 'اعضای فعال', value: `${faNum(s.members)} نفر` }, { label: 'مراجعه‌ی این ماه', value: faNum(s.visitsThisMonth) }];
    },
    actions: ({ crm, today }) => {
      const out: DailyAction[] = [];
      const expired = expiredConsents(crm, today);
      if (expired.length) out.push({
        id: 'crm-expired', module: 'crm', urgency: 'now', title: 'تمدید یا حذف اعضای با رضایت تمام‌شده',
        reason: `رضایت ${faNum(expired.length)} عضو تمام شده و اطلاعاتشان بدون رضایت نگه داشته شده`, owner: 'customer_service',
        impact: 'پایبندی به سیاست رضایت (R8-a)', kpi: 'صفر داده‌ی بدون رضایت معتبر', outcome: 'تمدید با رضایت تازه یا حذف کامل', to: '/crm',
      });
      const expiring = expiringConsents(crm, today);
      if (expiring.length) out.push({
        id: 'crm-expiring', module: 'crm', urgency: 'soon', title: 'درخواست تمدید رضایت از اعضا',
        reason: `رضایت ${faNum(expiring.length)} عضو تا دو هفته‌ی دیگر تمام می‌شود`, owner: 'customer_service',
        impact: 'حفظ باشگاه مشتریان', kpi: 'نرخ تمدید رضایت', outcome: 'ثبت رضایت تازه در مراجعه‌ی بعدی', to: '/crm',
      });
      const follow = followUpList(crm, today);
      if (follow.length) out.push({
        id: 'crm-follow', module: 'crm', urgency: 'later', title: 'پیگیری اعضایی که مدتی نیامده‌اند',
        reason: `${faNum(follow.length)} عضو با رضایت بازاریابی بیش از ۳۰ روز نیامده‌اند`, owner: 'marketing',
        impact: 'بازگشت مشتری', kpi: 'نرخ مراجعه‌ی دوباره', outcome: 'پیام فقط به همین اعضا و ثبت مراجعه‌ی بعدی', to: '/crm',
      });
      return out;
    },
  },
  {
    id: 'chat', title: 'گفتگو با مشتری', icon: '💬', route: '/chat', layer: 'module', status: 'live',
    statusNote: 'زنده روی سرور (D-73) — ورود عضو با شماره، حالت آزمایشی پیامک',
    summary: ({ chat }) => {
      if (!chat?.loggedIn) return [{ label: 'ورود عضو', value: 'لازم است' }];
      if (!chat.summary) return [{ label: 'گفتگوها', value: '—' }];
      if (chat.summary.sensitive) return [{ label: 'وضعیت', value: 'خاموش (حساس)' }];
      return [{ label: 'گفتگوها', value: faNum(chat.summary.conversations) }, { label: 'خوانده‌نشده', value: faNum(chat.summary.unreadMessages), tone: chat.summary.unreadMessages ? 'bad' : undefined }];
    },
    actions: ({ chat }) => {
      const u = chat?.summary;
      if (!u || !u.unreadConversations) return [];
      return [{
        id: 'chat-unread', module: 'chat', urgency: 'now', title: 'پاسخ به پیام مشتری‌ها',
        reason: `${faNum(u.unreadConversations)} گفتگو ${faNum(u.unreadMessages)} پیام خوانده‌نشده دارد`, owner: 'customer_service',
        impact: 'پاسخ به‌موقع و بازگشت مشتری', kpi: 'زمان پاسخ‌گویی به پیام', outcome: 'پاسخ در همان گفتگو، تا امروز', to: '/chat',
      }];
    },
  },
];

export function moduleById(id: ModuleId): ModuleManifest { return MODULES.find((m) => m.id === id)!; }

const URGENCY_RANK = { now: 0, soon: 1, later: 2 } as const;

/** Daily actions from every module, grouped by urgency only (no cross-source scoring — OD-06). */
export function dailyActions(s: Snapshot): DailyAction[] {
  return MODULES.flatMap((m) => { try { return [...m.actions(s)]; } catch { return []; } })
    .filter((a) => a.reason && a.owner && a.impact && a.kpi && a.outcome)
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
}

export function stockRows(inventory: Inventory) { return stockReport(inventory); }
