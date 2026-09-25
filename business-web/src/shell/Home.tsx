import { usePack } from '../industry/context';
import { useMemo, useState } from 'react';
import { useWorkspace } from '../workspace';
import { MODULES, ROLE_LABEL, dailyActions, type DailyAction, type Snapshot } from '../modules/registry';
import type { PublishedBusiness } from '../published';
import { Link } from './Shell';
import { useChatSession } from '../chat/session';
import { JALALI_MONTHS, jalaliMonthRange, profitAndLoss, toJalali } from '../engine';
import { lowStock, displayQty } from '../inventoryEngine';
import { compactRial, faNum, jDateLong } from '../format';

// «امروز» in the «روشنای محله» design: greeting, today's tasks, two figures, shortcuts, the four-month trend and stock.
// Every number comes from this business's own data (the ledger and stock on this device, the chat summary from the
// server, the published offers); where there is nothing yet, the page says so instead of showing a made-up figure.

const URGENCY = { now: ['امروز', 'bad'], soon: ['این هفته', 'warn'], later: ['به‌زودی', 'info'] } as const;

function ActionCard({ a }: { a: DailyAction }) {
  const [open, setOpen] = useState(false);
  const [label, tone] = URGENCY[a.urgency];
  const mod = MODULES.find((m) => m.id === a.module)!;
  return <li className="action">
    <button type="button" className="action-head" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="action-main"><strong>{a.title}</strong><small>{a.reason}</small></span>
      <span className={`badge ${tone}`}>{label}</span>
    </button>
    {open && <div className="action-body">
      <dl>
        <div><dt>مسئول</dt><dd>{ROLE_LABEL[a.owner]}</dd></div>
        <div><dt>اثر انتظاری</dt><dd>{a.impact}</dd></div>
        <div><dt>شاخص</dt><dd>{a.kpi}</dd></div>
        <div><dt>نتیجه‌ی قابل‌سنجش</dt><dd>{a.outcome}</dd></div>
      </dl>
      <Link to={a.to} className="btn small">رفتن به {mod.title}</Link>
    </div>}
  </li>;
}

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'صبح بخیر' : h < 16 ? 'ظهر بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
}

/** The last four Jalali months up to this one, with net sales from the ledger. */
function monthlySales(ledger: Snapshot['ledger'], today: string) {
  const t = toJalali(today);
  return [3, 2, 1, 0].map((back) => {
    let jy = t.jy; let jm = t.jm - back;
    while (jm < 1) { jm += 12; jy -= 1; }
    const range = jalaliMonthRange(jy, jm);
    const p = profitAndLoss(ledger, { from: range.from, to: back === 0 ? today : range.to });
    return { label: JALALI_MONTHS[jm - 1], value: Math.max(0, p.netSales) };
  });
}

export default function Home({ published }: { published: PublishedBusiness | null | undefined }) {
  const { pack } = usePack();
  const ws = useWorkspace();
  const cs = useChatSession();
  const snapshot: Snapshot = { today: ws.today, book: ws.book, ledger: ws.ledger, inventory: ws.inventory, crm: ws.crm, published, chat: { loggedIn: !!cs.me, summary: cs.summary }, pack };
  const actions = useMemo(() => dailyActions(snapshot), [ws.ledger, ws.inventory, ws.crm, published, ws.today, cs.me, cs.summary, pack]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (cs.org?.name ?? published?.name ?? ws.book.settings.businessName).replace(/\s*\(آزمایشی\)/, '');
  const salesToday = useMemo(() => profitAndLoss(ws.ledger, { from: ws.today, to: ws.today }).netSales, [ws.ledger, ws.today]);
  const trend = useMemo(() => monthlySales(ws.ledger, ws.today), [ws.ledger, ws.today]);
  const top = Math.max(...trend.map((m) => m.value), 0);
  const low = useMemo(() => lowStock(ws.inventory), [ws.inventory]);
  const nowMs = Date.parse(`${ws.today}T12:00:00Z`);
  const activeOffers = (published?.offers ?? []).filter((o) => (!o.valid_from || Date.parse(o.valid_from) <= nowMs) && (!o.valid_until || Date.parse(o.valid_until) >= nowMs));
  const [allTasks, setAllTasks] = useState(false);
  const pending = cs.summary?.pendingQuestions ?? 0;
  const todo = [pending ? `${faNum(pending)} پرسش بی‌جواب` : null, low.length ? `${faNum(low.length)} قلم زیر حد سفارش` : null,
    cs.summary?.unreadConversations ? `${faNum(cs.summary.unreadConversations)} گفتگوی خوانده‌نشده` : null].filter(Boolean).join(' · ');

  return <div className="stack today-rs">
    <section className="today-hello">
      <small>{jDateLong(ws.today)} · {name}</small>
      <h1>{greeting()}</h1>
    </section>

    <section className="rs-card feature">
      <strong>کارهای امروز</strong>
      <p>{todo || (actions.length ? `${faNum(actions.length)} کار با دلیلش` : 'فعلاً کار فوری‌ای نیست؛ همه‌چیز مرتب است.')}</p>
      {actions.length > 0 && <ul className="actions">{(allTasks ? actions : actions.slice(0, 3)).map((a) => <ActionCard key={a.id} a={a} />)}</ul>}
      {actions.length > 3 && <button type="button" className="btn small secondary tasks-more" aria-expanded={allTasks} onClick={() => setAllTasks(!allTasks)}>
        {allTasks ? 'کمتر' : `همه‌ی کارها (${faNum(actions.length)})`}</button>}
    </section>

    <div className="twocol">
      <section className="rs-card metric-card"><strong>فروش امروز</strong><p className="metric">{salesToday ? compactRial(salesToday) : '۰'}</p><small>ریال · دفتر همین دستگاه</small></section>
      <section className="rs-card metric-card"><strong>آفر فعال</strong><p className="metric">{faNum(activeOffers.length)}</p>
        <small>{activeOffers.length ? 'منتشرشده برای مشتری‌ها' : 'آفری منتشر نشده'}</small></section>
    </div>

    <section>
      <h2 className="section-title">میان‌برها</h2>
      <div className="tiles">
        <Link to="/products" className="btn secondary">افزودن محصول</Link>
        <Link to="/accounting/record" className="btn secondary">ثبت فروش</Link>
        <Link to="/storefront/offers" className="btn secondary">ساخت آفر</Link>
        <Link to="/storefront/chat" className="btn secondary">پاسخ پیام{cs.summary?.unreadMessages ? ` (${faNum(cs.summary.unreadMessages)})` : ''}</Link>
      </div>
    </section>

    <section>
      <h2 className="section-title">روند چهار ماه</h2>
      {top === 0 ? <p className="rs-card empty-note">هنوز فروشی در دفتر این دستگاه ثبت نشده؛ با «ثبت فروش» نمودار ساخته می‌شود.</p>
        : <figure className="trend" aria-label="فروش خالص ماهانه، ریال">
          {trend.map((m) => <div key={m.label} className="trend-col">
            <span className="trend-value">{compactRial(m.value)}</span>
            <span className="trend-bar" style={{ height: `${Math.max(4, Math.round((m.value / top) * 100))}%` }} />
            <span className="trend-label">{m.label}</span>
          </div>)}
          <figcaption>فروش خالص هر ماه (ریال)؛ ماه جاری تا امروز</figcaption>
        </figure>}
    </section>

    {low.length > 0 && <Link to="/inventory" className="rs-row-link">
      <span><b>انبار</b><small>{low.slice(0, 2).map((r) => { const q = displayQty(r.qty, r.unit); return `${r.name}: ${faNum(q.value)} ${q.label}`; }).join(' · ')} · زیر حد سفارش</small></span>
      <span className="end" aria-hidden="true">‹</span>
    </Link>}

    <section>
      <h2 className="section-title">همه‌ی بخش‌ها</h2>
      <div className="module-grid">
        {MODULES.map((m) => {
          let stats: ReturnType<typeof m.summary> = [];
          try { stats = m.summary(snapshot); } catch { stats = [{ label: 'داده', value: '—' }]; }
          return <Link key={m.id} to={m.route} className={`module-card ${m.status}`}>
            <div className="module-top"><strong>{m.title}</strong>
              {m.status === 'design' || m.status === 'blocked' ? <span className="badge muted">به‌زودی</span> : null}</div>
            <div className="module-stats">{stats.map((s) => <div key={s.label}><span>{s.label}</span><b className={s.tone ?? ''}>{s.value}</b></div>)}</div>
          </Link>;
        })}
      </div>
    </section>

    {ws.audit.length > 0 && <section className="rs-card">
      <strong>ثبت‌های این جلسه</strong>
      <ul className="rows">{ws.audit.slice(0, 6).map((a, i) => <li key={i}><span>{a.summary}<small> — {a.module}</small></span><span className={`badge ${a.executedVia === 'assistant' ? 'info' : 'muted'}`}>{a.executedVia === 'assistant' ? 'دستیار' : 'دستی'}</span></li>)}</ul>
    </section>}
  </div>;
}
