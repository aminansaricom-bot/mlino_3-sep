import { usePack } from '../industry/context';
import { useMemo, useState } from 'react';
import { useWorkspace } from '../workspace';
import { MODULES, ROLE_LABEL, dailyActions, type DailyAction, type Snapshot } from '../modules/registry';
import type { PublishedBusiness } from '../published';
import { Link } from './Shell';
import { useChatSession } from '../chat/session';

const URGENCY = { now: ['امروز', 'bad'], soon: ['این هفته', 'warn'], later: ['به‌زودی', 'info'] } as const;

function ActionCard({ a }: { a: DailyAction }) {
  const [open, setOpen] = useState(false);
  const [label, tone] = URGENCY[a.urgency];
  const mod = MODULES.find((m) => m.id === a.module)!;
  return <li className="action">
    <button type="button" className="action-head" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="action-icon" aria-hidden="true">{mod.icon}</span>
      <span className="action-main"><strong>{a.title}</strong><small>{a.reason}</small></span>
      <span className={`badge ${tone}`}>{label}</span>
    </button>
    {open && <div className="action-body">
      <dl>
        <div><dt>مسئول</dt><dd>{ROLE_LABEL[a.owner]}</dd></div>
        <div><dt>اثر انتظاری</dt><dd>{a.impact}</dd></div>
        <div><dt>KPI</dt><dd>{a.kpi}</dd></div>
        <div><dt>نتیجه‌ی قابل‌سنجش</dt><dd>{a.outcome}</dd></div>
      </dl>
      <Link to={a.to} className="btn small">رفتن به {mod.title}</Link>
    </div>}
  </li>;
}

export default function Home({ published }: { published: PublishedBusiness | null | undefined }) {
  const { pack } = usePack();
  const ws = useWorkspace();
  const cs = useChatSession();
  const snapshot: Snapshot = { today: ws.today, book: ws.book, ledger: ws.ledger, inventory: ws.inventory, crm: ws.crm, published, chat: { loggedIn: !!cs.me, summary: cs.summary }, pack };
  const actions = useMemo(() => dailyActions(snapshot), [ws.ledger, ws.inventory, ws.crm, published, ws.today, cs.me, cs.summary, pack]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="stack">
    <section className="hero-today">
      <h1>امروز در {ws.book.settings.businessName}</h1>
      <p>کارهایی که بیشترین اثر را دارند، با دلیل، مسئول و نتیجه‌ای که باید سنجیده شود. هر مورد از داده‌ی واقعی همین ماژول‌ها آمده است.</p>
    </section>

    <section className="card">
      <header className="card-head"><h3>اقدام‌های امروز</h3><small className="muted">{actions.length ? `${actions.length.toLocaleString('fa-IR')} مورد` : ''}</small></header>
      {actions.length === 0 ? <p className="empty">فعلاً کار فوری‌ای نیست؛ همه‌چیز مرتب است.</p> :
        <ul className="actions">{actions.map((a) => <ActionCard key={a.id} a={a} />)}</ul>}
    </section>

    <section>
      <h2 className="section-title">ماژول‌ها</h2>
      <div className="module-grid">
        {MODULES.map((m) => {
          let stats: ReturnType<typeof m.summary> = [];
          try { stats = m.summary(snapshot); } catch { stats = [{ label: 'داده', value: '—' }]; }
          return <Link key={m.id} to={m.route} className={`module-card ${m.status}`}>
            <div className="module-top"><span className="module-icon" aria-hidden="true">{m.icon}</span><strong>{m.title}</strong>
              <span className={`badge ${m.status === 'blocked' ? 'bad' : m.status === 'design' ? 'muted' : m.layer === 'core' ? 'info' : 'ok'}`}>{m.layer === 'core' ? 'هسته' : 'ماژول'}</span></div>
            <div className="module-stats">{stats.map((s) => <div key={s.label}><span>{s.label}</span><b className={s.tone ?? ''}>{s.value}</b></div>)}</div>
            <small className="module-note">{m.statusNote}</small>
          </Link>;
        })}
      </div>
    </section>

    {ws.audit.length > 0 && <section className="card">
      <header className="card-head"><h3>ثبت‌های این جلسه</h3></header>
      <ul className="rows">{ws.audit.slice(0, 6).map((a, i) => <li key={i}><span>{a.summary}<small> — {a.module}</small></span><span className={`badge ${a.executedVia === 'assistant' ? 'info' : 'muted'}`}>{a.executedVia === 'assistant' ? `با دستیار، تأیید ${a.authorizedBy}` : 'دستی'}</span></li>)}</ul>
    </section>}
  </div>;
}
