import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../workspace';
import type { PublishedBusiness } from '../published';
import { docId, type Op } from '../book';
import { compactRial, jDate, toFaDigits } from '../format';
import { AmountInput, DateInput, Field, Segmented } from '../ui';
import { vatOnNet } from '../engine';
import Orb from './Orb';
import { useChatSession } from '../chat/session';
import { evaluate, understand, type CommandResult, type Money, type Proposal } from './brain';
import { qtyText } from '../modules/inventory/InventoryModule';
import type { InvOp } from '../modules/inventory/data';

const STATE_LABEL = { idle: 'آماده', thinking: 'در حال بررسی', happy: 'وضعیت خوب', concerned: 'نیاز به توجه', warning: 'هشدار', suggesting: 'یک پیشنهاد دارم', celebrating: 'خبر خوب!', processing: 'در حال انجام' } as const;
const EXAMPLES = ['سود این ماه چقدره؟', 'هزینه‌ی برق ۱۲ میلیون از بانک ملت', '۲۰ کیلو شیر وارد انبار شد به قیمت ۹ میلیون', 'چک‌های این هفته چیه؟'];

type SpeechCtor = new () => { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void };

export default function Assistant({ published }: { published: PublishedBusiness | null | undefined }) {
  const ws = useWorkspace();
  const surface = ws.path.split('/')[1] || 'home';
  const cs = useChatSession();
  const snapshot = { today: ws.today, book: ws.book, ledger: ws.ledger, inventory: ws.inventory, crm: ws.crm, published, chat: { loggedIn: !!cs.me, summary: cs.summary } };
  const ev = useMemo(() => { try { return evaluate(snapshot, surface); } catch { return null; } }, [ws.ledger, ws.inventory, ws.crm, published, surface, cs.me, cs.summary]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(() => { try { return localStorage.getItem('mlino.panel.voice') === 'ok'; } catch { return false; } });
  const inputRef = useRef<HTMLInputElement>(null);
  const state = busy ? 'processing' : result?.type === 'proposal' ? 'suggesting' : ev?.state ?? 'idle';
  const bubbleId = ev?.suggestions[0]?.id ?? ev?.message ?? '';
  // The bubble speaks on «امروز», or anywhere when something is urgent; otherwise the orb's dot is enough.
  const showBubble = !open && ev && ev.state !== 'idle' && !dismissed.has(bubbleId) && (surface === 'home' || ev.priority === 'high' || ev.priority === 'critical');

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setBusy(true);
    try { setResult(understand(t, snapshot)); } catch { setResult({ type: 'unknown', text: 'نتوانستم این را بفهمم.' }); }
    setBusy(false);
  };

  const speech = (): SpeechCtor | null => { const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null; };
  const listen = () => {
    const Ctor = speech();
    if (!Ctor) return;
    if (!voiceOk) {
      if (!window.confirm('برای تبدیل صدا به متن، صدایت به سرویس گفتار مرورگر (در کروم: گوگل) می‌رود. فهم فرمان روی همین دستگاه انجام می‌شود. موافقی؟')) return;
      try { localStorage.setItem('mlino.panel.voice', 'ok'); } catch { /* optional */ }
      setVoiceOk(true);
    }
    const r = new Ctor();
    r.lang = 'fa-IR'; r.interimResults = false;
    r.onresult = (e) => { const said = e.results[0]?.[0]?.transcript ?? ''; setText(said); ask(said); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  return <div className="assistant">
    {showBubble && <div className="assist-bubble" role="status">
      <p>{ev!.message}</p>
      <div className="assist-bubble-actions"><button type="button" className="link" onClick={() => setOpen(true)}>جزئیات</button>
        <button type="button" className="link muted" onClick={() => setDismissed(new Set(dismissed).add(bubbleId))} aria-label="بستن پیام">بستن</button></div>
    </div>}

    {open && <section className="assist-panel" aria-label="دستیار ملینو">
      <header className="assist-head"><Orb state={state} size={40} /><div><strong>ملینو</strong><small>{STATE_LABEL[state]}</small></div>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="کوچک کردن دستیار">–</button></header>

      <div className="assist-body">
        {!result && ev && <>
          <p className="assist-msg">{ev.message}</p>
          {ev.suggestions.length > 0 && <ul className="assist-suggest">{ev.suggestions.map((s) => <li key={s.id}>
            <button type="button" onClick={() => { ws.navigate(s.to); setOpen(false); }}>{s.label}<span aria-hidden="true">‹</span></button></li>)}</ul>}
        </>}
        {result && <ResultView result={result} onDone={(msg) => { setResult(msg ? { type: 'answer', text: msg } : null); setText(''); }} onNavigate={(to) => { ws.navigate(to); setOpen(false); }} />}
        {!result && <div className="assist-examples">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => { setText(e); ask(e); }}>{e}</button>)}</div>}
      </div>

      <form className="assist-input" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="بپرس یا بگو چه ثبت کنم…" aria-label="فرمان یا پرسش از ملینو" />
        {speech() && <button type="button" className={`assist-mic${listening ? ' on' : ''}`} onClick={listen} aria-label="گفتن با صدا" aria-pressed={listening}><img className="assist-mic-img" src="/icons/voice.png" alt="" aria-hidden="true" draggable={false} /></button>}
        <button type="submit" className="assist-send" aria-label="ارسال" disabled={!text.trim()}>➤</button>
      </form>
      <p className="assist-foot">هر ثبت فقط با تأیید تو انجام می‌شود. انتشار و دسترسی را خودت روی همان مورد تأیید می‌کنی.</p>
    </section>}

    <button type="button" className={`assist-fab${open ? ' open' : ''}`} onClick={() => setOpen(!open)} aria-label="دستیار ملینو" aria-expanded={open}>
      <Orb state={state} size={58} />
      {ev && ev.priority !== 'low' && !open && <i className={`assist-dot ${ev.priority}`} aria-hidden="true" />}
    </button>
  </div>;
}

function ResultView({ result, onDone, onNavigate }: { result: CommandResult; onDone: (msg?: string) => void; onNavigate: (to: string) => void }) {
  switch (result.type) {
    case 'answer': return <div className="assist-card">
      <p>{result.text}</p>
      <div className="assist-row">{result.to && <button type="button" className="btn small" onClick={() => onNavigate(result.to!)}>{result.linkLabel ?? 'دیدن'}</button>}<button type="button" className="btn small ghost" onClick={() => onDone()}>باشه</button></div>
    </div>;
    case 'navigate': return <div className="assist-card"><p>برویم به «{result.label}»؟</p>
      <div className="assist-row"><button type="button" className="btn small" onClick={() => onNavigate(result.to)}>برو</button><button type="button" className="btn small ghost" onClick={() => onDone()}>نه</button></div></div>;
    case 'governance': return <div className="assist-card gov"><p>🔒 {result.text}</p>
      <div className="assist-row"><button type="button" className="btn small" onClick={() => onNavigate(result.to)}>{result.linkLabel}</button><button type="button" className="btn small ghost" onClick={() => onDone()}>باشه</button></div></div>;
    case 'refuse': return <div className="assist-card gov"><p>✋ {result.text}</p><div className="assist-row"><button type="button" className="btn small ghost" onClick={() => onDone()}>باشه</button></div></div>;
    case 'unknown': return <div className="assist-card"><p>{result.text}</p><div className="assist-row"><button type="button" className="btn small ghost" onClick={() => onDone()}>باشه</button></div></div>;
    case 'proposal': return <ProposalCard title={result.title} initial={result.proposal} onDone={onDone} />;
  }
}

function MoneyField({ label, value, onChange }: { label: string; value: Money | null; onChange: (m: Money) => void }) {
  return <Field label={label} hint={value?.assumedToman ? `«${toFaDigits(value.spoken)}» را تومان گرفتم = ${compactRial(value.rial)}؛ اگر ریال بود، اصلاح کن.` : undefined}>
    {(id) => <AmountInput id={id} value={value?.rial ?? null} onChange={(v) => onChange({ rial: v ?? 0, assumedToman: false, spoken: '' })} />}
  </Field>;
}

/** Editable proposal. Nothing is written until «تأیید و ثبت»; then the module's own command runs. */
function ProposalCard({ title, initial, onDone }: { title: string; initial: Proposal; onDone: (msg?: string) => void }) {
  const ws = useWorkspace();
  const [p, setP] = useState<Proposal>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Proposal>) => setP({ ...p, ...patch } as Proposal);
  const treasuries = ws.ledger.listTreasuries();
  const banks = treasuries.filter((t) => t.kind === 'bank');
  const cash = treasuries.find((t) => t.kind === 'cash')!;
  const accountName = (code: string) => ws.ledger.account(code).name;
  const expenseAccounts = ws.ledger.listAccounts().filter((a) => a.kind === 'expense' && a.userSelectable);

  const confirm = () => {
    const id = docId('ai');
    let err: string | null = null;
    const acct = (op: Op, msg: string) => ws.commitAccounting(op, msg, 'assistant');
    const invc = (op: InvOp, msg: string) => ws.commitInventory(op, msg, 'assistant');
    switch (p.kind) {
      case 'daily': {
        const vat = { rateBp: ws.book.settings.vatRateBp, pricesIncludeVat: ws.book.settings.pricesIncludeVat };
        err = acct({ k: 'daily', input: { id, date: p.date, amount: p.amount.rial, vat, payments: [{ treasuryId: p.cardAll ? banks[0].id : cash.id, amount: p.amount.rial }] } }, 'فروش روز ثبت شد.');
        break;
      }
      case 'expense': {
        const inputVat = p.withVat ? vatOnNet(p.amount.rial, ws.book.settings.vatRateBp) : 0;
        const total = p.amount.rial + inputVat;
        const payments = p.pay === 'credit' ? [] : [{ treasuryId: p.pay === 'bank' ? (p.bankId ?? banks[0].id) : cash.id, amount: total }];
        err = acct({ k: 'expense', input: { id, date: p.date, account: p.account, amount: p.amount.rial, inputVat, ...(p.supplierId ? { supplierId: p.supplierId } : {}), payments, note: p.note } }, 'هزینه ثبت شد.');
        break;
      }
      case 'receipt': case 'payment':
        err = acct({ k: p.kind, input: { id, date: p.date, partyId: p.partyId, payments: [{ treasuryId: p.pay === 'bank' ? (p.bankId ?? banks[0].id) : cash.id, amount: p.amount.rial }] } }, p.kind === 'receipt' ? 'دریافت ثبت شد.' : 'پرداخت ثبت شد.');
        break;
      case 'transfer':
        err = acct({ k: 'transfer', input: { id, date: p.date, fromTreasuryId: p.fromId, toTreasuryId: p.toId, amount: p.amount.rial } }, 'انتقال ثبت شد.');
        break;
      case 'withdrawal': case 'contribution':
        err = acct({ k: p.kind, input: { id, date: p.date, treasuryId: p.treasuryId, amount: p.amount.rial } }, p.kind === 'withdrawal' ? 'برداشت ثبت شد.' : 'آورده ثبت شد.');
        break;
      case 'inv-receive':
        if (!p.cost) { setError('بهای خرید را وارد کن.'); return; }
        err = invc({ k: 'receive', input: { itemId: p.itemId, qty: p.qty, totalCost: p.cost.rial, date: p.date, note: 'ثبت با دستیار' } }, 'ورود کالا ثبت شد.');
        break;
      case 'inv-issue':
        err = invc({ k: 'issue', input: { itemId: p.itemId, qty: p.qty, date: p.date, note: 'مصرف — ثبت با دستیار' } }, 'مصرف ثبت شد.');
        break;
      case 'inv-count':
        err = invc({ k: 'count', input: { itemId: p.itemId, countedQty: p.qty, date: p.date, note: 'شمارش — ثبت با دستیار' } }, 'شمارش ثبت شد.');
        break;
    }
    if (err) setError(err); else onDone(`انجام شد: ${title}. در «ثبت‌های این جلسه» با نام تو به‌عنوان تأییدکننده آمده است.`);
  };

  const item = 'itemId' in p ? ws.inventory.item(p.itemId) : null;
  return <div className="assist-card proposal">
    <p className="proposal-title">📝 {title} — پیش‌نویس، هنوز ثبت نشده</p>
    <Field label="تاریخ">{(id) => <DateInput id={id} today={ws.today} value={p.date} onChange={(date) => set({ date })} />}</Field>
    {'amount' in p && <MoneyField label="مبلغ" value={p.amount} onChange={(amount) => set({ amount })} />}
    {p.kind === 'daily' && <Field label="دریافت">{() => <Segmented label="دریافت" value={p.cardAll ? 'card' : 'cash'} onChange={(v) => set({ cardAll: v === 'card' })} options={[['cash', 'نقد (صندوق)'], ['card', `کارت (${banks[0]?.name ?? 'بانک'})`]]} />}</Field>}
    {p.kind === 'expense' && <>
      <Field label="نوع هزینه">{(id) => <select id={id} value={p.account} onChange={(e) => set({ account: e.target.value })}>{expenseAccounts.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select>}</Field>
      <Field label="پرداخت">{() => <Segmented label="پرداخت" value={p.pay} onChange={(pay) => set({ pay })} options={[['cash', 'نقد'], ['bank', 'بانک'], ['credit', 'نسیه']]} />}</Field>
      {p.pay === 'bank' && <Field label="حساب">{(id) => <select id={id} value={p.bankId ?? banks[0]?.id} onChange={(e) => set({ bankId: e.target.value })}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}</Field>}
      <label className="check"><input type="checkbox" checked={p.withVat} onChange={(e) => set({ withVat: e.target.checked })} /> فاکتور رسمی با ارزش افزوده {p.withVat ? `(${compactRial(vatOnNet(p.amount.rial, ws.book.settings.vatRateBp))} قابل کسر)` : ''}</label>
    </>}
    {(p.kind === 'receipt' || p.kind === 'payment') && <>
      <p className="calc">{p.kind === 'receipt' ? 'از' : 'به'}: <b>{ws.ledger.party(p.partyId).name}</b></p>
      <Field label="روش">{() => <Segmented label="روش" value={p.pay} onChange={(pay) => set({ pay })} options={[['cash', 'نقد'], ['bank', 'بانک']]} />}</Field>
    </>}
    {p.kind === 'transfer' && <p className="calc">از <b>{ws.ledger.treasury(p.fromId).name}</b> به <b>{ws.ledger.treasury(p.toId).name}</b></p>}
    {(p.kind === 'withdrawal' || p.kind === 'contribution') && <Field label={p.kind === 'withdrawal' ? 'از' : 'به'}>{(id) => <select id={id} value={p.treasuryId} onChange={(e) => set({ treasuryId: e.target.value })}>{treasuries.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</Field>}
    {item && <>
      <p className="calc">کالا: <b>{item.name}</b> — {p.kind === 'inv-count' ? 'شمرده‌شده' : 'مقدار'}: <b>{qtyText((p as { qty: number }).qty, item.unit)}</b> (موجودی دفتری {qtyText(ws.inventory.onHand(item.id).qty, item.unit)})</p>
      {p.kind === 'inv-receive' && <MoneyField label="بهای کل خرید" value={p.cost} onChange={(cost) => set({ cost })} />}
    </>}
    {p.kind === 'expense' && <p className="calc">سند: {accountName(p.account)} {compactRial(p.amount.rial)}، {p.pay === 'credit' ? 'نسیه' : p.pay === 'bank' ? 'از بانک' : 'از صندوق'}، {jDate(p.date)}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="assist-row"><button type="button" className="btn primary" onClick={confirm}>تأیید و ثبت</button><button type="button" className="btn small ghost" onClick={() => onDone('ثبت نشد؛ چیزی تغییر نکرد.')}>انصراف</button></div>
    <p className="assist-foot">ثبت از همان مسیر فرم دستی می‌گذرد، با همان کنترل‌ها و با تأیید تو.</p>
  </div>;
}
