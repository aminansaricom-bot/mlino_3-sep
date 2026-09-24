import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, chatErrorText, faDigits, type ChatConfig, type ChatMessage, type ChatPerson, type CustomerThread } from '../chat/chatApi';
import { Login, NAME_KEY } from '../chat/ChatPanel';
import type { CatalogItem, CatalogMedia } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import LiveIcon from './icons';
import { clean } from './liveData';

// Chat sheet over the live storefront (D-73). The recipient is fixed when the sheet opens; swiping to another
// product does not change it. Suggested questions only fill the box — sending is always the person's own tap.
// Failed sends keep the text. The customer's number is never shown to the business.

const QUICK = ['این محصول موجوده؟', 'شرایط آفر؟', 'ساعت کاری؟'] as const;
const time = (iso: string) => { try { return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export type ChatContext = Readonly<{ organizationId: string; name: string; thumb?: CatalogMedia; item?: CatalogItem }>;

export default function ChatSheet({ context, onClose, onOpenItem, onRead }: {
  context: ChatContext; onClose: () => void; onOpenItem?: (item: CatalogItem) => void; onRead?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [person, setPerson] = useState<ChatPerson>(null);
  const [thread, setThread] = useState<CustomerThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [available, setAvailable] = useState<{ ok: boolean; sensitive: boolean } | null>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } });
  const [about, setAbout] = useState<CatalogItem | undefined>(context.item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef(0);
  const end = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);

  const pull = useCallback(async (id: string) => {
    const r = await chatApi<{ messages: ChatMessage[] }>('GET', `/chat/threads/${id}/messages?after=${last.current}`);
    if (r.messages.length) { last.current = r.messages[r.messages.length - 1].seq; setMessages((m) => [...m, ...r.messages]); onRead?.(); }
  }, [onRead]);

  const boot = useCallback(async () => {
    setError(null);
    try {
      const [cfg, me, biz] = await Promise.all([
        chatApi<ChatConfig>('GET', '/auth/config'),
        chatApi<{ person: ChatPerson }>('GET', '/auth/me'),
        chatApi<{ available: boolean; sensitive: boolean }>('GET', `/chat/business?organizationId=${encodeURIComponent(context.organizationId)}`),
      ]);
      setConfig(cfg); setPerson(me.person); setAvailable({ ok: biz.available, sensitive: biz.sensitive });
      if (me.person) {
        const list = (await chatApi<{ threads: CustomerThread[] }>('GET', '/chat/threads')).threads;
        const t = list.find((x) => x.organizationId === context.organizationId) ?? null;
        setThread(t); last.current = 0; setMessages([]);
        if (t) await pull(t.id);
      }
    } catch (e) { setError(chatErrorText(e)); } finally { setReady(true); }
  }, [context.organizationId, pull]);
  useEffect(() => { void boot(); }, [boot]);
  useEffect(() => {
    if (!thread) return undefined;
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void pull(thread.id).catch(() => undefined); }, 4000);
    return () => window.clearInterval(t);
  }, [thread, pull]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = async () => {
    const said = text.trim();
    if (!said || busy) return;
    const body = about ? `دربارهٔ «${clean(about.name)}»: ${said}` : said;
    setBusy(true); setError(null);
    try {
      if (thread) {
        await chatApi('POST', `/chat/threads/${thread.id}/messages`, { body });
        await pull(thread.id);
      } else {
        if (name.trim().length < 2) { setError('اول نامی را که کسب‌وکار ببیند بنویس.'); setBusy(false); return; }
        try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* convenience only */ }
        const r = await chatApi<{ threadId: string }>('POST', '/chat/threads', { organizationId: context.organizationId, name: name.trim(), body });
        const list = (await chatApi<{ threads: CustomerThread[] }>('GET', '/chat/threads')).threads;
        const t = list.find((x) => x.id === r.threadId) ?? null;
        setThread(t); last.current = 0; setMessages([]);
        if (t) await pull(t.id);
      }
      setText(''); setAbout(undefined);
    } catch (e) { setError(`${chatErrorText(e)} متن نگه داشته شد؛ دوباره بفرست.`); } finally { setBusy(false); }
  };

  const title = `گفتگو با ${clean(context.name)}`;
  const blocked = thread?.blockedBy ?? null;
  const closedForChat = available && (!available.ok || available.sensitive);

  return <section className="lv-chat" role="dialog" aria-modal="true" aria-label={title}>
    <header className="lv-chat-head">
      <button type="button" className="lv-iconbtn plain" onClick={onClose} aria-label="جمع کردن گفتگو"><LiveIcon name="chevron-down" /></button>
      <h2>{title}</h2>
      <span className="lv-chat-avatar">{context.thumb ? <CatalogImage media={context.thumb} load /> : <img src="/icons/placeholder-business.svg" alt="" />}</span>
    </header>

    {about && <div className="lv-context">
      <button type="button" className="lv-context-main" onClick={() => onOpenItem?.(about)} aria-label={`دیدن ${clean(about.name)}`}>
        <span className="lv-context-img">{about.media[0] ? <CatalogImage media={about.media[0]} load /> : <img src="/icons/placeholder-product.svg" alt="" />}</span>
        <span>دربارهٔ {clean(about.name)}</span>
        <LiveIcon name="chevron-left" size={18} />
      </button>
      <button type="button" className="lv-iconbtn plain small" onClick={() => setAbout(undefined)} aria-label="برداشتن موضوع محصول"><LiveIcon name="close" size={16} /></button>
    </div>}

    <div className="lv-chat-body" aria-live="polite">
      {!ready ? <p className="lv-muted center">در حال آماده شدن…</p>
        : !person ? <div className="lv-chat-login"><Login config={config} onDone={() => void boot()} /></div>
        : closedForChat ? <p className="lv-muted center">{available!.sensitive ? 'گفتگو برای کسب‌وکارهای حوزه‌ی سلامت خاموش است.' : 'این کسب‌وکار فعلاً پیام نمی‌پذیرد.'}</p>
        : <>
          {messages.length === 0 && <p className="lv-muted center">پیامت مستقیم به {clean(context.name)} می‌رسد. شماره‌ات به کسب‌وکار نشان داده نمی‌شود.</p>}
          {messages.map((m) => <div key={m.id} className={`lv-msg ${m.sender === 'customer' ? 'mine' : 'theirs'}`}>
            <p>{m.body}</p>
            <small>{faDigits(time(m.createdAt))}{m.auto ? ' · پاسخ خودکار' : ''}</small>
          </div>)}
          <div ref={end} />
        </>}
    </div>

    {person && !closedForChat && !blocked && <footer className="lv-chat-foot">
      <div className="lv-quick">{QUICK.map((q) => <button key={q} type="button" onClick={() => { setText(q); input.current?.focus(); }}>{q}</button>)}</div>
      {!thread && <input className="lv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="نامی که کسب‌وکار می‌بیند (مثلاً سارا)" aria-label="نامی که کسب‌وکار می‌بیند" />}
      <form className="lv-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea ref={input} rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={900} placeholder="پیامت را بنویس…" aria-label="متن پیام" />
        <button type="submit" className="lv-send" disabled={busy || !text.trim()} aria-label={busy ? 'در حال ارسال' : 'ارسال پیام'}><LiveIcon name="send" /></button>
      </form>
      {error && <p className="lv-error" role="alert">{error}</p>}
      <p className="lv-privacy"><LiveIcon name="lock" size={14} /> شماره‌ی شما نمایش داده نمی‌شود</p>
    </footer>}
    {blocked && <p className="lv-muted center">این گفتگو مسدود است.</p>}
    {error && !person && <p className="lv-error" role="alert">{error}</p>}
  </section>;
}
