import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, chatErrorText, faDigits, type ChatConfig, type ChatMessage, type ChatPerson, type CustomerThread } from './chatApi';
import { tr, numberLocale, latinDigits } from '../i18n';
import { PhoneField } from '../i18n/PhoneField';
import { SMS_COUNTRIES, defaultCountry, internationalNumber, plausibleNumber, type Country } from '../i18n/countries';

// گفتگوی مشتری با کسب‌وکار (D-73). گفتگو را فقط مشتری شروع می‌کند؛ کسب‌وکار فقط نامی را می‌بیند که خودت می‌نویسی،
// نه شماره‌ات را. هیچ هوش مصنوعی پیام‌ها را نمی‌خواند. هر گفتگو ۹۰ روز پس از آخرین پیام واقعاً پاک می‌شود.

export type ChatTarget = { organizationId: string; name: string };

export const NAME_KEY = 'mlino.v2.chatName';
const time = (iso: string) => new Date(iso).toLocaleString(numberLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const clean = (name: string) => name.replace(/\s*\(آزمایشی\)/g, '');

export function ChatBubbleIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z" /><path d="M8.5 8.5h7M8.5 11.5h4.5" /></svg>;
}

export default function ChatPanel({ target, onClose }: { target: ChatTarget | null; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [person, setPerson] = useState<ChatPerson>(null);
  const [threads, setThreads] = useState<CustomerThread[] | null>(null);
  const [view, setView] = useState<{ kind: 'list' } | { kind: 'thread'; id: string } | { kind: 'new'; target: ChatTarget }>({ kind: 'list' });
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const list = (await chatApi<{ threads: CustomerThread[] }>('GET', '/chat/threads')).threads;
      setThreads(list);
      return list;
    } catch (e) { setError(chatErrorText(e)); return null; }
  }, []);

  const boot = useCallback(async () => {
    setError(null);
    try {
      const [cfg, me] = await Promise.all([chatApi<ChatConfig>('GET', '/auth/config'), chatApi<{ person: ChatPerson }>('GET', '/auth/me')]);
      setConfig(cfg); setPerson(me.person);
      if (me.person) {
        const list = await loadThreads();
        if (target) {
          const existing = list?.find((t) => t.organizationId === target.organizationId);
          setView(existing ? { kind: 'thread', id: existing.id } : { kind: 'new', target });
        }
      }
    } catch (e) { setError(chatErrorText(e)); } finally { setReady(true); }
  }, [loadThreads, target]);
  useEffect(() => { void boot(); }, [boot]);
  useEffect(() => {
    if (!person) return undefined;
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void loadThreads(); }, 15_000);
    return () => window.clearInterval(t);
  }, [person, loadThreads]);

  const logout = async () => { try { await chatApi('POST', '/auth/logout'); } catch { /* کوکی در سرور پاک می‌شود */ } setPerson(null); setThreads(null); setView({ kind: 'list' }); };
  const deleteAccount = async () => {
    if (!window.confirm(tr('حساب و همهٔ گفتگوهایت برای همیشه پاک شود؟ کسب‌وکارها هم دیگر آن‌ها را نمی‌بینند.'))) return;
    try { await chatApi('DELETE', '/auth/account'); setPerson(null); setThreads(null); setView({ kind: 'list' }); } catch (e) { setError(chatErrorText(e)); }
  };

  const title = view.kind === 'new' ? tr('پیام به {0}', clean(view.target.name)) : view.kind === 'thread' ? clean(threads?.find((t) => t.id === view.id)?.businessName ?? tr('گفتگو')) : !person && target ? tr('پیام به {0}', clean(target.name)) : tr('پیام‌های من');
  return <section className="panel chat-panel" aria-label={title}>
    <div className="panel-head">
      {view.kind !== 'list' && person && <button className="panel-close" onClick={() => { setView({ kind: 'list' }); void loadThreads(); }} aria-label={tr('بازگشت')}><span className="lv-dir" aria-hidden="true">→</span></button>}
      <h3>{title}</h3>
      <button className="panel-close" onClick={onClose} aria-label={tr('بستن')}>✕</button>
    </div>
    <div className="panel-body chat-body">
      {!ready ? <p className="chat-muted">{tr('در حال بررسی…')}</p>
        : !person ? <Login config={config} onDone={() => void boot()} />
        : view.kind === 'new' ? <NewMessage target={view.target} test={person.test} onSent={async (threadId) => { await loadThreads(); setView({ kind: 'thread', id: threadId }); }} />
        : view.kind === 'thread' ? <Thread id={view.id} thread={threads?.find((t) => t.id === view.id) ?? null} onChanged={() => void loadThreads()} onGone={() => { setView({ kind: 'list' }); void loadThreads(); }} />
        : <>
          {threads === null ? <p className="chat-muted">{tr('در حال خواندن…')}</p> : threads.length === 0 ? <p className="chat-muted">{tr('هنوز گفتگویی نداری. در صفحهٔ هر کسب‌وکار دکمهٔ «پیام» را بزن.')}</p> :
            <ul className="chat-threads">{threads.map((t) => <li key={t.id}><button onClick={() => setView({ kind: 'thread', id: t.id })}>
              <span className="chat-thread-copy"><strong>{clean(t.businessName)}</strong><small>{t.lastSender === 'customer' ? tr('تو: ') : ''}{t.lastBody}</small></span>
              <span className="chat-thread-side"><small>{time(t.lastMessageAt)}</small>{t.unread > 0 && <b className="chat-unread">{faDigits(t.unread)}</b>}</span>
            </button></li>)}</ul>}
          <div className="chat-account">
            <small>{tr('واردشده با …')}{faDigits(person.phoneHint)}{person.test ? tr(' (آزمایشی)') : ''}{tr('. شماره‌ات به هیچ کسب‌وکاری نشان داده نمی‌شود.')}</small>
            <div><button onClick={() => void logout()}>{tr('خروج')}</button><button className="danger" onClick={() => void deleteAccount()}>{tr('حذف حساب و گفتگوها')}</button></div>
          </div>
        </>}
      {error && <p className="chat-error" role="alert">{error}</p>}
    </div>
  </section>;
}

export function Login({ config, onDone }: { config: ChatConfig | null; onDone: () => void }) {
  const [country, setCountry] = useState<Country>(() => defaultCountry());
  const [phone, setPhone] = useState('');
  const canSend = SMS_COUNTRIES.has(country.iso);
  const [challenge, setChallenge] = useState<{ id: string; testCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true); setError(null);
    try { const r = await chatApi<{ challengeId: string; testCode?: string }>('POST', '/auth/otp/start', { phone: internationalNumber(country, phone) }); setChallenge({ id: r.challengeId, testCode: r.testCode }); setCode(''); }
    catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!challenge) return;
    setBusy(true); setError(null);
    try { await chatApi('POST', '/auth/otp/verify', { challengeId: challenge.id, code }); onDone(); } catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  return <div className="chat-login">
    <p>{tr('برای پیام دادن به کسب‌وکارها با شمارهٔ موبایل وارد شو. کسب‌وکار فقط نامی را می‌بیند که خودت می‌نویسی، نه شماره‌ات را.')}</p>
    {config?.delivery === 'test' && config.testNumbers && <p className="chat-test-note">{tr('حالت آزمایشی: پیامکی فرستاده نمی‌شود. فقط شماره‌های {0} تا {1} پذیرفته می‌شوند و کد همین‌جا نشان داده می‌شود. پیام‌های آزمایشی ۲۴ ساعت پس از آخرین پیام پاک می‌شوند؛ اطلاعات واقعی ننویس.', faDigits(config.testNumbers.from), faDigits(config.testNumbers.to))}</p>}
    {config?.delivery === 'sms' && <p className="chat-test-note">{tr('کد ورود با پیامک به شماره‌ات فرستاده می‌شود. شماره‌ات به هیچ کسب‌وکاری نشان داده نمی‌شود.')}</p>}
    {!challenge ? <form onSubmit={(e) => { e.preventDefault(); void start(); }}>
      <div className="chat-phone"><span>{tr('شمارهٔ موبایل')}</span><PhoneField country={country} onCountry={setCountry} national={phone} onNational={setPhone} />
        {!canSend && <p className="phone-unsupported">{tr('ورود با شماره‌ی خارج از ایران هنوز فعال نیست؛ فعلاً بدون ورود از نقشه و ویترین استفاده کن.')}</p>}</div>
      <button type="submit" className="chat-primary" disabled={busy || !canSend || !plausibleNumber(country, phone)}>{busy ? tr('در حال ارسال…') : tr('گرفتن کد')}</button>
    </form> : <form onSubmit={(e) => { e.preventDefault(); void verify(); }}>
      {!challenge.testCode && <p className="chat-muted" role="status">{tr('کد ۶ رقمی به {0} پیامک شد. تا ۲ دقیقه معتبر است.', faDigits(internationalNumber(country, phone)))}</p>}
      {challenge.testCode && <p className="chat-test-code">{tr('کد آزمایشی:')} <b dir="ltr">{faDigits(challenge.testCode)}</b></p>}
      <label>{tr('کد ۶ رقمی')}<input dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(latinDigits(e.target.value))} /></label>
      <button type="submit" className="chat-primary" disabled={busy || code.trim().length < 6}>{busy ? tr('در حال بررسی…') : tr('ورود')}</button>
      <button type="button" className="chat-link" onClick={() => setChallenge(null)}>{tr('تغییر شماره')}</button>
    </form>}
    {error && <p className="chat-error" role="alert">{error}</p>}
  </div>;
}

function NewMessage({ target, test, onSent }: { target: ChatTarget; test: boolean; onSent: (threadId: string) => void }) {
  const [available, setAvailable] = useState<{ ok: boolean; sensitive: boolean; auto: boolean } | null>(null);
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } });
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    chatApi<{ available: boolean; sensitive: boolean; autoReply?: boolean }>('GET', `/chat/business?organizationId=${encodeURIComponent(target.organizationId)}`)
      .then((r) => setAvailable({ ok: r.available, sensitive: r.sensitive, auto: r.autoReply === true }), (e) => setError(chatErrorText(e)));
  }, [target.organizationId]);
  const send = async () => {
    setBusy(true); setError(null);
    try {
      const r = await chatApi<{ threadId: string }>('POST', '/chat/threads', { organizationId: target.organizationId, name, body });
      try { localStorage.setItem(NAME_KEY, name); } catch { /* فقط برای راحتی */ }
      onSent(r.threadId);
    } catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  if (available && !available.ok) return <p className="chat-muted">{available.sensitive ? tr('برای کسب‌وکارهای حوزهٔ سلامت و مانند آن، گفتگو خاموش است تا اطلاعات حساس کسی جایی نماند.') : tr('این کسب‌وکار فعلاً پیام نمی‌پذیرد.')}</p>;
  return <form className="chat-new" onSubmit={(e) => { e.preventDefault(); void send(); }}>
    <label>{tr('نامی که کسب‌وکار می‌بیند')}<input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={tr('مثلاً سارا')} /></label>
    <label>{tr('پیام')}<textarea value={body} maxLength={1000} rows={4} onChange={(e) => setBody(e.target.value)} placeholder={tr('مثلاً «امروز تا چه ساعتی باز هستید؟»')} /></label>
    {available?.auto && <p className="chat-auto-note">{tr('این کسب‌وکار پاسخ‌گوی خودکار دارد: فقط با جواب‌هایی که خود کسب‌وکار تأیید کرده یا اطلاعات منتشرشده‌اش پاسخ می‌دهد، پاسخ‌هایش علامت «پاسخ خودکار» دارند، و سؤالی را که نمی‌داند به خود کسب‌وکار می‌دهد و حدس نمی‌زند.')}</p>}
    <p className="chat-muted">{tr('شماره‌ات نشان داده نمی‌شود. این گفتگو')} {test ? tr('(آزمایشی) ۲۴ ساعت') : tr('۹۰ روز')} {tr('پس از آخرین پیام خودکار پاک می‌شود و هر وقت بخواهی خودت می‌توانی پاکش کنی.')}</p>
    <button type="submit" className="chat-primary" disabled={busy || !available || name.trim().length < 2 || !body.trim()}>{busy ? tr('در حال ارسال…') : tr('فرستادن')}</button>
    {error && <p className="chat-error" role="alert">{error}</p>}
  </form>;
}

function Thread({ id, thread, onChanged, onGone }: { id: string; thread: CustomerThread | null; onChanged: () => void; onGone: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const pull = useCallback(async () => {
    try {
      const r = await chatApi<{ messages: ChatMessage[] }>('GET', `/chat/threads/${id}/messages?after=${last.current}`);
      if (r.messages.length) { last.current = r.messages[r.messages.length - 1].seq; setMessages((m) => [...m, ...r.messages]); }
    } catch (e) { setError(chatErrorText(e)); }
  }, [id]);
  useEffect(() => {
    last.current = 0; setMessages([]); void pull().then(onChanged);
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void pull(); }, 4000);
    return () => window.clearInterval(t);
  }, [pull]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError(null);
    try { await chatApi('POST', `/chat/threads/${id}/messages`, { body }); setText(''); await pull(); onChanged(); } catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  const act = async (method: 'POST' | 'DELETE', path: string, gone = false) => {
    try { await chatApi(method, `/chat/threads/${id}${path}`); if (gone) onGone(); else onChanged(); } catch (e) { setError(chatErrorText(e)); }
  };
  const blocked = thread?.blockedBy ?? null;
  return <div className="chat-thread">
    <div className="chat-thread-tools">
      <small>{thread?.test ? tr('آزمایشی: ۲۴ ساعت پس از آخرین پیام پاک می‌شود') : tr('پاک شدن خودکار: ۹۰ روز پس از آخرین پیام')}</small>
      {blocked === 'customer' ? <button onClick={() => void act('POST', '/unblock')}>{tr('رفع مسدودی')}</button>
        : !blocked && <button onClick={() => { if (window.confirm(tr('این گفتگو مسدود شود؟'))) void act('POST', '/block'); }}>{tr('مسدود')}</button>}
      <button className="danger" onClick={() => { if (window.confirm(tr('این گفتگو برای هر دو طرف پاک شود؟ برگشت ندارد.'))) void act('DELETE', '', true); }}>{tr('حذف')}</button>
    </div>
    <div className="chat-messages" aria-live="polite">
      {messages.map((m) => <div key={m.id} className={`chat-msg ${m.sender === 'customer' ? 'mine' : 'theirs'}${m.auto ? ' auto' : ''}`}><p>{m.body}</p><small>{m.auto ? tr('پاسخ خودکار — ') : ''}{time(m.createdAt)}</small></div>)}
      <div ref={end} />
    </div>
    {blocked ? <p className="chat-muted">{blocked === 'customer' ? tr('تو این گفتگو را مسدود کرده‌ای.') : tr('کسب‌وکار این گفتگو را مسدود کرده است.')}</p> :
      <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea value={text} maxLength={1000} rows={2} onChange={(e) => setText(e.target.value)} placeholder={tr('پیام…')} aria-label={tr('متن پیام')} />
        <button type="submit" className="chat-primary" disabled={busy || !text.trim()}>{tr('ارسال')}</button>
      </form>}
    {error && <p className="chat-error" role="alert">{error}</p>}
  </div>;
}

/** دکمهٔ «پیام‌های من» در نوار بالا، با شمار خوانده‌نشده‌ها (فقط وقتی واردشده است). */
export function ChatInboxButton({ onOpen, refreshKey }: { onOpen: () => void; refreshKey: number }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    let timer = 0;
    const poll = async () => {
      try {
        const me = await chatApi<{ person: ChatPerson }>('GET', '/auth/me');
        if (!me.person) { if (active) setUnread(0); return; }
        const r = await chatApi<{ threads: CustomerThread[] }>('GET', '/chat/threads');
        if (active) setUnread(r.threads.reduce((s, t) => s + t.unread, 0));
      } catch { /* نشانه فقط برای راحتی است */ }
    };
    void poll();
    timer = window.setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refreshKey]);
  return <button className="profile-btn chat-inbox-btn" onClick={onOpen} aria-label={unread ? tr('پیام‌های من، {0} خوانده‌نشده', faDigits(unread)) : tr('پیام‌های من')}>
    <ChatBubbleIcon />{unread > 0 && <b className="chat-unread badge-dot">{faDigits(unread)}</b>}
  </button>;
}
