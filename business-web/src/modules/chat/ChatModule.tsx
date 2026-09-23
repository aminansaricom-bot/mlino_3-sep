import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../workspace';
import { useChatSession } from '../../chat/session';
import LoginCard from '../../chat/LoginCard';
import { api, apiErrorText, type Message, type Thread } from '../../chat/api';
import { faNum, toFaDigits } from '../../format';

// Customer ⇄ business chat (D-73), business side. A module with its own storage; every request is checked on the
// server against membership and the `chat.reply` grant. The assistant never reads these messages.

const TABS = [['', 'گفتگوها'], ['log', 'دفتر دسترسی'], ['rules', 'قواعد']] as const;
const ACTION = { list: 'فهرست گفتگوها دیده شد', read: 'گفتگو باز شد', reply: 'پاسخ فرستاده شد', block: 'مسدود شد', unblock: 'از مسدودی درآمد', erase: 'گفتگو حذف شد', enable: 'گفتگو روشن شد', disable: 'گفتگو خاموش شد' } as Record<string, string>;

const time = (iso: string) => toFaDigits(new Date(iso).toLocaleString('fa-IR-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400_000));
const hoursLeft = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 3600_000));

export default function ChatModule({ tab }: { tab: string }) {
  const ws = useWorkspace();
  const s = useChatSession();

  return <div className="stack">
    <header className="page-head"><h1>گفتگو با مشتری</h1><span className="badge ok">ماژول</span><span className="badge info">D-73</span></header>
    {!s.ready ? <p className="empty">در حال بررسی ورود…</p>
      : !s.me ? <LoginCard config={s.config} onDone={() => void s.refresh()} hint="شماره‌ی آزمایشیِ عضو کسب‌وکارهای نمایشی: ۰۹۰۰۰۰۰۰۰۹۰." />
      : <>
        <section className="card chat-bar">
          <span>واردشده با شماره‌ی …{toFaDigits(s.me.phoneHint)}{s.me.test ? ' (آزمایشی)' : ''}</span>
          {s.organizations.length > 1 && <select aria-label="کسب‌وکار" value={s.orgId ?? ''} onChange={(e) => s.setOrgId(e.target.value)}>
            {s.organizations.map((o) => <option key={o.organizationId} value={o.organizationId}>{o.name.replace(/\s*\(آزمایشی\)/, '')}</option>)}</select>}
          <span className="chat-bar-actions">
            <button type="button" className="btn small ghost" onClick={() => void s.logout()}>خروج</button>
            <button type="button" className="btn small ghost" onClick={() => { if (window.confirm('همه‌ی ورودهای این شماره در همه‌ی دستگاه‌ها بسته شود؟ عضویت و اجازه‌ها تغییری نمی‌کنند.')) void s.logout(true); }}>خروج از همه‌ی دستگاه‌ها</button>
          </span>
        </section>
        {!s.org ? <p className="empty">این شماره عضو هیچ کسب‌وکار منتشرشده‌ای با اجازه‌ی گفتگو نیست. اجازه را عضوی از همان کسب‌وکار می‌دهد، نه پلتفرم (D-57).</p> : <>
          <nav className="segmented" aria-label="بخش‌های گفتگو">
            {TABS.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => ws.navigate(id ? `/chat/${id}` : '/chat')}>{label}</button>)}
          </nav>
          {tab === 'log' ? <AccessLog orgId={s.org.organizationId} /> : tab === 'rules' ? <Rules /> : <Inbox orgId={s.org.organizationId} />}
        </>}
      </>}
  </div>;
}

function Inbox({ orgId }: { orgId: string }) {
  const s = useChatSession();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setThreads((await api<{ threads: Thread[] }>('GET', `/biz/${orgId}/chat/threads`)).threads); setError(null); } catch (e) { setError(apiErrorText(e)); }
  }, [orgId]);
  useEffect(() => {
    setThreads(null); setOpenId(null); void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  const toggle = async () => {
    if (!s.summary) return;
    try { await api('POST', `/biz/${orgId}/chat/settings`, { enabled: !s.summary.enabled }); await s.refreshSummary(); } catch (e) { setError(apiErrorText(e)); }
  };

  const open = threads?.find((t) => t.id === openId) ?? null;
  return <>
    {s.summary && <section className="card chat-status">
      <div><strong>{s.summary.sensitive ? 'گفتگو برای این کسب‌وکار خاموش است' : s.summary.enabled ? 'مشتری‌ها می‌توانند از V2 پیام بدهند' : 'پیام تازه پذیرفته نمی‌شود'}</strong>
        <small>{s.summary.sensitive ? 'کسب‌وکارهای حوزه‌ی سلامت و مانند آن از گفتگو مستثنا هستند (R8-a §۳٫۱۰).' : `${faNum(s.summary.conversations)} گفتگو، ${faNum(s.summary.unreadMessages)} پیام خوانده‌نشده`}</small></div>
      {!s.summary.sensitive && <button type="button" className="btn small ghost" onClick={() => void toggle()}>{s.summary.enabled ? 'خاموش کردن' : 'روشن کردن'}</button>}
    </section>}
    {error && <p className="note bad" role="alert">{error}</p>}
    <div className={`chat-layout${open ? ' has-open' : ''}`}>
      <section className="card chat-list">
        {threads === null ? <p className="empty">در حال خواندن…</p> : threads.length === 0 ? <p className="empty">هنوز پیامی نیامده. گفتگو را همیشه مشتری از V2 شروع می‌کند.</p> :
          <ul>{threads.map((t) => <li key={t.id}><button type="button" className={`thread-row${t.id === openId ? ' on' : ''}`} onClick={() => setOpenId(t.id)}>
            <span className="thread-main"><strong>{t.customerName}</strong><small>{t.lastSender === 'business' ? 'شما: ' : ''}{t.lastBody}</small></span>
            <span className="thread-side"><small>{time(t.lastMessageAt)}</small>{t.unread > 0 ? <span className="unread">{faNum(t.unread)}</span> : t.blockedBy ? <span className="badge muted">مسدود</span> : null}</span>
          </button></li>)}</ul>}
      </section>
      {open && <Conversation key={open.id} orgId={orgId} thread={open} onBack={() => setOpenId(null)} onChanged={() => { void load(); void s.refreshSummary(); }} onGone={() => { setOpenId(null); void load(); void s.refreshSummary(); }} />}
    </div>
  </>;
}

function Conversation({ orgId, thread, onBack, onChanged, onGone }: { orgId: string; thread: Thread; onBack: () => void; onChanged: () => void; onGone: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSeq = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const base = `/biz/${orgId}/chat/threads/${thread.id}`;

  const pull = useCallback(async () => {
    try {
      const r = await api<{ messages: Message[] }>('GET', `${base}/messages?after=${lastSeq.current}`);
      if (r.messages.length) {
        lastSeq.current = r.messages[r.messages.length - 1].seq;
        setMessages((m) => [...m, ...r.messages]);
      }
    } catch (e) { setError(apiErrorText(e)); }
  }, [base]);
  useEffect(() => {
    lastSeq.current = 0; setMessages([]);
    void pull().then(onChanged);
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void pull(); }, 4000);
    return () => window.clearInterval(t);
  }, [pull]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const sendReply = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError(null);
    try { await api('POST', `${base}/messages`, { body }); setText(''); await pull(); onChanged(); } catch (e) { setError(apiErrorText(e)); } finally { setBusy(false); }
  };
  const act = async (method: 'POST' | 'DELETE', path: string, gone = false) => {
    setError(null);
    try { await api(method, `${base}${path}`); if (gone) onGone(); else onChanged(); } catch (e) { setError(apiErrorText(e)); }
  };

  const blocked = thread.blockedBy;
  return <section className="card chat-thread" aria-label={`گفتگو با ${thread.customerName}`}>
    <header className="chat-thread-head">
      <button type="button" className="icon-btn chat-back" onClick={onBack} aria-label="بازگشت به فهرست">→</button>
      <div><strong>{thread.customerName}</strong><small>{thread.test ? `حذف خودکار: ${faNum(hoursLeft(thread.expiresAt))} ساعت دیگر (آزمایشی)` : `حذف خودکار: ${faNum(daysLeft(thread.expiresAt))} روز پس از آخرین پیام`}</small></div>
      <span className="chat-thread-actions">
        {blocked === 'business' ? <button type="button" className="btn small ghost" onClick={() => void act('POST', '/unblock')}>رفع مسدودی</button>
          : !blocked && <button type="button" className="btn small ghost" onClick={() => { if (window.confirm('این گفتگو مسدود شود؟ هیچ‌کدام از دو طرف نمی‌توانند پیام تازه بفرستند.')) void act('POST', '/block'); }}>مسدود</button>}
        <button type="button" className="btn small ghost danger" onClick={() => { if (window.confirm('این گفتگو برای هر دو طرف واقعاً حذف شود؟ برگشت ندارد.')) void act('DELETE', '', true); }}>حذف</button>
      </span>
    </header>
    <div className="chat-messages" aria-live="polite">
      {messages.map((m) => <div key={m.id} className={`bubble ${m.sender === 'business' ? 'mine' : 'theirs'}`}><p>{m.body}</p><small>{time(m.createdAt)}</small></div>)}
      <div ref={end} />
    </div>
    {blocked ? <p className="note">{blocked === 'business' ? 'شما این گفتگو را مسدود کرده‌اید.' : 'مشتری این گفتگو را مسدود کرده است.'}</p> :
      <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); void sendReply(); }}>
        <textarea value={text} maxLength={1000} rows={2} onChange={(e) => setText(e.target.value)} placeholder="پاسخ به مشتری…" aria-label="متن پاسخ"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); } }} />
        <button type="submit" className="btn primary" disabled={busy || !text.trim()}>ارسال</button>
      </form>}
    {error && <p className="note bad" role="alert">{error}</p>}
  </section>;
}

function AccessLog({ orgId }: { orgId: string }) {
  const [entries, setEntries] = useState<Array<{ at: string; action: string; byMe: boolean; threadId: string | null }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<{ entries: NonNullable<typeof entries> }>('GET', `/biz/${orgId}/chat/access-log`).then((r) => setEntries(r.entries), (e) => setError(apiErrorText(e))); }, [orgId]);
  return <section className="card">
    <header className="card-head"><h3>دفتر دسترسی</h3><small className="muted">۵۰ مورد آخر</small></header>
    <p className="policy-note">هر بار که عضوی فهرست یا یک گفتگو را می‌بیند، پاسخ می‌دهد، مسدود یا حذف می‌کند، اینجا ثبت می‌شود (R8-a §۳٫۵). باز شدن دوباره‌ی همان گفتگو در ده دقیقه یک بار ثبت می‌شود.</p>
    {error && <p className="note bad">{error}</p>}
    {entries && (entries.length === 0 ? <p className="empty">هنوز چیزی ثبت نشده.</p> :
      <ul className="rows">{entries.map((e, i) => <li key={i}><span>{ACTION[e.action] ?? e.action}</span><small>{e.byMe ? 'خودتان' : 'عضو دیگر'}، {time(e.at)}</small></li>)}</ul>)}
  </section>;
}

function Rules() {
  return <section className="card">
    <header className="card-head"><h3>قواعد گفتگو (D-73)</h3></header>
    <ul className="points">
      <li>گفتگو را فقط مشتری از V2 شروع می‌کند؛ کسب‌وکار داخل همان گفتگو پاسخ می‌دهد.</li>
      <li>شماره‌ی مشتری هرگز به کسب‌وکار نشان داده نمی‌شود؛ فقط نامی که خودش انتخاب کرده.</li>
      <li>فقط متن، حداکثر ۱۰۰۰ نویسه.</li>
      <li>هیچ هوش مصنوعی پیام‌ها را نمی‌خواند و پیام‌ها خودکار به CRM نمی‌روند. دستیار فقط شمار پیام‌های خوانده‌نشده را می‌داند.</li>
      <li>هر گفتگو ۹۰ روز پس از آخرین پیام واقعاً حذف می‌شود (در حالت آزمایشی ۲۴ ساعت). هر طرف زودتر هم می‌تواند حذف کند، که برای هر دو طرف حذف می‌شود.</li>
      <li>هر طرف می‌تواند مسدود کند؛ فقط همان طرف مسدودی را برمی‌دارد.</li>
      <li>برای کسب‌وکارهای حساس (مثل حوزه‌ی سلامت) خاموش است.</li>
      <li>پاسخ دادن اجازه‌ی <code>chat.reply</code> می‌خواهد که عضوی از خود کسب‌وکار به عضو دیگر می‌دهد، نه پلتفرم.</li>
    </ul>
  </section>;
}
