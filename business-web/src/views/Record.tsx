import { useMemo, useState } from 'react';
import { invoiceTotals, partyBalances, vatInGross, vatOnNet, type Ledger, type TreasuryAmount } from '../engine';
import { docId, type Op, type Settings } from '../book';
import { DEMO_MENU } from '../sample';
import { addDays, faNum } from '../format';
import { AmountInput, DateInput, Field, Money, Segmented } from '../ui';

export type Commit = (op: Op, success: string) => string | null;
type FormProps = { ledger: Ledger; settings: Settings; today: string; commit: Commit; done: () => void };

export const FORMS = [
  ['daily', '💵', 'فروش روزانه', 'جمع فروش یک روز، نقد و کارت'],
  ['invoice', '🧾', 'فاکتور فروش', 'از روی منو، نقد، کارت، چک یا نسیه'],
  ['expense', '🛒', 'هزینه و خرید', 'اجاره، حقوق، مواد اولیه، قبض…'],
  ['receipt', '📥', 'دریافت از مشتری', 'تسویه‌ی طلب، نقد، کارت یا چک'],
  ['payment', '📤', 'پرداخت به تأمین‌کننده', 'تسویه‌ی بدهی، نقد، بانک یا چک'],
  ['transfer', '🔁', 'انتقال وجه', 'بین صندوق و حساب‌های بانکی'],
  ['owner', '👤', 'آورده و برداشت مالک', 'پولی که مالک می‌گذارد یا برمی‌دارد'],
  ['party', '➕', 'طرف حساب جدید', 'مشتری یا تأمین‌کننده'],
] as const;
export type FormKey = (typeof FORMS)[number][0];

export function RecordMenu({ onOpen }: { onOpen: (form: FormKey) => void }) {
  return <div className="tiles">
    {FORMS.map(([key, icon, title, hint]) => <button key={key} type="button" className="tile" onClick={() => onOpen(key)}>
      <span className="tile-icon" aria-hidden="true">{icon}</span><strong>{title}</strong><small>{hint}</small>
    </button>)}
  </div>;
}

export function RecordForm({ form, ...props }: FormProps & { form: FormKey }) {
  switch (form) {
    case 'daily': return <DailyForm {...props} />;
    case 'invoice': return <InvoiceForm {...props} />;
    case 'expense': return <ExpenseForm {...props} />;
    case 'receipt': return <SettleForm {...props} kind="receipt" />;
    case 'payment': return <SettleForm {...props} kind="payment" />;
    case 'transfer': return <TransferForm {...props} />;
    case 'owner': return <OwnerForm {...props} />;
    case 'party': return <PartyForm {...props} />;
  }
}

function Submit({ error, label = 'ثبت' }: { error: string | null; label?: string }) {
  return <div className="submit">{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="btn primary wide">{label}</button></div>;
}

type Method = 'cash' | 'bank' | 'credit' | 'cheque';
type ChequeFields = { number: string; bank: string; due: string };

function MethodPicker({ ledger, value, onChange, bankId, onBank, allowCredit, cheque, onCheque, today }: {
  ledger: Ledger; value: Method; onChange: (m: Method) => void; bankId: string; onBank: (id: string) => void; allowCredit: boolean;
  cheque: ChequeFields; onCheque: (c: ChequeFields) => void; today: string;
}) {
  const banks = ledger.listTreasuries().filter((t) => t.kind === 'bank');
  const options: [Method, string][] = [['cash', 'نقد'], ['bank', 'کارت / بانک'], ...(allowCredit ? [['credit', 'نسیه'] as [Method, string]] : []), ['cheque', 'چک']];
  return <>
    <Field label="روش پرداخت">{() => <Segmented label="روش پرداخت" value={value} onChange={onChange} options={options} />}</Field>
    {value === 'bank' && <Field label="حساب بانکی">{(id) => <select id={id} value={bankId} onChange={(e) => onBank(e.target.value)}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}</Field>}
    {value === 'cheque' && <div className="row3">
      <Field label="شماره‌ی چک">{(id) => <input id={id} dir="ltr" value={cheque.number} onChange={(e) => onCheque({ ...cheque, number: e.target.value })} />}</Field>
      <Field label="بانک">{(id) => <input id={id} value={cheque.bank} onChange={(e) => onCheque({ ...cheque, bank: e.target.value })} placeholder="مثلاً ملت" />}</Field>
      <Field label="سررسید">{(id) => <DateInput id={id} today={today} value={cheque.due} onChange={(due) => onCheque({ ...cheque, due })} />}</Field>
    </div>}
  </>;
}

function settlement(ledger: Ledger, method: Method, bankId: string, amount: number, cheque: ChequeFields): { payments?: TreasuryAmount[]; cheque?: { id: string; number: string; bank?: string; dueDate: string; amount: number } } {
  const cash = ledger.listTreasuries().find((t) => t.kind === 'cash');
  if (method === 'cash' && cash) return { payments: [{ treasuryId: cash.id, amount }] };
  if (method === 'bank') return { payments: [{ treasuryId: bankId, amount }] };
  if (method === 'cheque') return { cheque: { id: docId('chq'), number: cheque.number.trim() || '—', ...(cheque.bank.trim() ? { bank: cheque.bank.trim() } : {}), dueDate: cheque.due, amount } };
  return {};
}

function useCommon(ledger: Ledger, today: string) {
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>('cash');
  const [bankId, setBankId] = useState(ledger.listTreasuries().find((t) => t.kind === 'bank')?.id ?? '');
  const [cheque, setCheque] = useState<ChequeFields>({ number: '', bank: '', due: addDays(today, 30) });
  return { date, setDate, error, setError, method, setMethod, bankId, setBankId, cheque, setCheque };
}

function DailyForm({ ledger, settings, today, commit, done }: FormProps) {
  const c = useCommon(ledger, today);
  const [total, setTotal] = useState<number | null>(null);
  const [card, setCard] = useState<number | null>(null);
  const cashBox = ledger.listTreasuries().find((t) => t.kind === 'cash')!;
  const cash = (total ?? 0) - (card ?? 0);
  const vat = total ? (settings.pricesIncludeVat ? vatInGross(total, settings.vatRateBp) : 0) : 0;
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!total) return c.setError('جمع فروش را وارد کن.');
    if (cash < 0) return c.setError('مبلغ کارت از جمع فروش بیشتر است.');
    const payments = [...(cash > 0 ? [{ treasuryId: cashBox.id, amount: cash }] : []), ...((card ?? 0) > 0 ? [{ treasuryId: c.bankId, amount: card! }] : [])];
    const err = commit({ k: 'daily', input: { id: docId('day'), date: c.date, amount: total, vat: { rateBp: settings.vatRateBp, pricesIncludeVat: settings.pricesIncludeVat }, payments } }, 'فروش روز ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
    <Field label="جمع فروش روز" hint={settings.pricesIncludeVat && vat > 0 ? <>شامل <Money value={vat} /> ارزش افزوده</> : undefined}>{(id) => <AmountInput id={id} value={total} onChange={setTotal} />}</Field>
    <div className="row2">
      <Field label="از این مبلغ، کارت‌خوان">{(id) => <AmountInput id={id} value={card} onChange={setCard} />}</Field>
      <Field label="به حساب">{(id) => <select id={id} value={c.bankId} onChange={(e) => c.setBankId(e.target.value)}>{ledger.listTreasuries().filter((t) => t.kind === 'bank').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}</Field>
    </div>
    <p className="calc">نقد به صندوق: <Money value={Math.max(0, cash)} /></p>
    <Submit error={c.error} />
  </form>;
}

function InvoiceForm({ ledger, settings, today, commit, done }: FormProps) {
  const c = useCommon(ledger, today);
  const [customerId, setCustomerId] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState<number | null>(null);
  const customers = ledger.listParties().filter((p) => p.role !== 'supplier');
  const lines = DEMO_MENU.filter((m) => (qty[m.id] ?? 0) > 0).map((m) => ({ name: m.name, quantity: qty[m.id], unitPrice: m.price, catalogItemId: m.id }));
  const vat = { rateBp: settings.vatRateBp, pricesIncludeVat: settings.pricesIncludeVat };
  const totals = useMemo(() => { try { return lines.length ? invoiceTotals({ lines, discount: discount ?? 0, vat }) : null; } catch { return null; } }, [lines, discount, vat]);
  const step = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(999, (q[id] ?? 0) + d)) }));
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!totals) return c.setError('دست‌کم یک قلم به فاکتور اضافه کن.');
    const pay = settlement(ledger, c.method, c.bankId, totals.total, c.cheque);
    const err = commit({ k: 'invoice', input: { id: docId('inv'), date: c.date, ...(customerId ? { customerId } : {}), lines, discount: discount ?? 0, vat, ...pay } }, 'فاکتور ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <div className="row2">
      <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
      <Field label="مشتری" hint="برای نسیه یا چک لازم است">{(id) => <select id={id} value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">مشتری عمومی</option>{customers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
    </div>
    <div className="menu-pick" role="group" aria-label="اقلام منو">
      {DEMO_MENU.map((m) => <div key={m.id} className={`menu-row${qty[m.id] ? ' on' : ''}`}>
        <span><strong>{m.name}</strong><small><Money value={m.price} /></small></span>
        <span className="stepper">
          <button type="button" onClick={() => step(m.id, -1)} aria-label={`یکی کمتر ${m.name}`} disabled={!qty[m.id]}>−</button>
          <b>{faNum(qty[m.id] ?? 0)}</b>
          <button type="button" onClick={() => step(m.id, 1)} aria-label={`یکی بیشتر ${m.name}`}>+</button>
        </span>
      </div>)}
    </div>
    <Field label="تخفیف">{(id) => <AmountInput id={id} value={discount} onChange={setDiscount} />}</Field>
    {totals && <dl className="totals">
      <div><dt>جمع اقلام</dt><dd><Money value={totals.gross} /></dd></div>
      {totals.discount > 0 && <div><dt>تخفیف</dt><dd><Money value={-totals.discount} /></dd></div>}
      <div><dt>ارزش افزوده ({faNum(settings.vatRateBp / 100)}٪{settings.pricesIncludeVat ? '، داخل قیمت' : ''})</dt><dd><Money value={totals.vat} /></dd></div>
      <div className="grand"><dt>مبلغ فاکتور</dt><dd><Money value={totals.total} /></dd></div>
    </dl>}
    <MethodPicker ledger={ledger} value={c.method} onChange={c.setMethod} bankId={c.bankId} onBank={c.setBankId} allowCredit cheque={c.cheque} onCheque={c.setCheque} today={today} />
    <Submit error={c.error} label="ثبت فاکتور" />
  </form>;
}

function ExpenseForm({ ledger, settings, today, commit, done }: FormProps) {
  const c = useCommon(ledger, today);
  const categories = ledger.listAccounts().filter((a) => a.kind === 'expense' && a.userSelectable && a.active);
  const [account, setAccount] = useState(categories[0]?.code ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  const [withVat, setWithVat] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const suppliers = ledger.listParties().filter((p) => p.role !== 'customer');
  const inputVat = withVat && amount ? vatOnNet(amount, settings.vatRateBp) : 0;
  const total = (amount ?? 0) + inputVat;
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!amount) return c.setError('مبلغ را وارد کن.');
    const pay = settlement(ledger, c.method, c.bankId, total, c.cheque);
    const err = commit({ k: 'expense', input: { id: docId('exp'), date: c.date, account, amount, inputVat, ...(supplierId ? { supplierId } : {}), ...pay, ...(note.trim() ? { note: note.trim() } : {}) } }, 'هزینه ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <div className="row2">
      <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
      <Field label="نوع هزینه">{(id) => <select id={id} value={account} onChange={(e) => setAccount(e.target.value)}>{categories.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</select>}</Field>
    </div>
    <Field label="مبلغ (بدون ارزش افزوده)">{(id) => <AmountInput id={id} value={amount} onChange={setAmount} />}</Field>
    <label className="check"><input type="checkbox" checked={withVat} onChange={(e) => setWithVat(e.target.checked)} /> فاکتور رسمی با ارزش افزوده دارد {withVat && amount ? <>(<Money value={inputVat} /> قابل کسر)</> : null}</label>
    <Field label="تأمین‌کننده" hint="برای نسیه یا چک لازم است">{(id) => <select id={id} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">—</option>{suppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
    <Field label="توضیح">{(id) => <input id={id} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً قبض برق مهر" />}</Field>
    <p className="calc">جمع پرداختنی: <Money value={total} /></p>
    <MethodPicker ledger={ledger} value={c.method} onChange={c.setMethod} bankId={c.bankId} onBank={c.setBankId} allowCredit cheque={c.cheque} onCheque={c.setCheque} today={today} />
    <Submit error={c.error} />
  </form>;
}

function SettleForm({ ledger, today, commit, done, kind }: FormProps & { kind: 'receipt' | 'payment' }) {
  const c = useCommon(ledger, today);
  const balances = partyBalances(ledger, today);
  const parties = ledger.listParties().filter((p) => (kind === 'receipt' ? p.role !== 'supplier' : p.role !== 'customer'));
  const owed = (id: string) => { const b = balances.find((x) => x.id === id); return kind === 'receipt' ? b?.receivable ?? 0 : b?.payable ?? 0; };
  const first = [...parties].sort((a, b) => owed(b.id) - owed(a.id))[0];
  const [partyId, setPartyId] = useState(first?.id ?? '');
  const [amount, setAmount] = useState<number | null>(first ? owed(first.id) || null : null);
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!partyId) return c.setError(kind === 'receipt' ? 'مشتری را انتخاب کن.' : 'تأمین‌کننده را انتخاب کن.');
    if (!amount) return c.setError('مبلغ را وارد کن.');
    const pay = settlement(ledger, c.method, c.bankId, amount, c.cheque);
    const err = commit({ k: kind, input: { id: docId(kind === 'receipt' ? 'rcpt' : 'pay'), date: c.date, partyId, ...pay } }, kind === 'receipt' ? 'دریافت ثبت شد.' : 'پرداخت ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <div className="row2">
      <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
      <Field label={kind === 'receipt' ? 'مشتری' : 'تأمین‌کننده'}>{(id) => <select id={id} value={partyId} onChange={(e) => { setPartyId(e.target.value); setAmount(owed(e.target.value) || null); }}>
        {parties.map((p) => <option key={p.id} value={p.id}>{p.name}{owed(p.id) ? ` — ${kind === 'receipt' ? 'طلب' : 'بدهی'} ${faNum(owed(p.id))}` : ''}</option>)}
      </select>}</Field>
    </div>
    <Field label="مبلغ">{(id) => <AmountInput id={id} value={amount} onChange={setAmount} />}</Field>
    <MethodPicker ledger={ledger} value={c.method} onChange={c.setMethod} bankId={c.bankId} onBank={c.setBankId} allowCredit={false} cheque={c.cheque} onCheque={c.setCheque} today={today} />
    <Submit error={c.error} />
  </form>;
}

function TransferForm({ ledger, today, commit, done }: FormProps) {
  const c = useCommon(ledger, today);
  const all = ledger.listTreasuries();
  const [from, setFrom] = useState(all[0]?.id ?? '');
  const [to, setTo] = useState(all[1]?.id ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!amount) return c.setError('مبلغ را وارد کن.');
    const err = commit({ k: 'transfer', input: { id: docId('xfer'), date: c.date, fromTreasuryId: from, toTreasuryId: to, amount, fee: fee ?? 0 } }, 'انتقال ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
    <div className="row2">
      <Field label="از">{(id) => <select id={id} value={from} onChange={(e) => setFrom(e.target.value)}>{all.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</Field>
      <Field label="به">{(id) => <select id={id} value={to} onChange={(e) => setTo(e.target.value)}>{all.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</Field>
    </div>
    <div className="row2">
      <Field label="مبلغ">{(id) => <AmountInput id={id} value={amount} onChange={setAmount} />}</Field>
      <Field label="کارمزد">{(id) => <AmountInput id={id} value={fee} onChange={setFee} />}</Field>
    </div>
    <Submit error={c.error} />
  </form>;
}

function OwnerForm({ ledger, today, commit, done }: FormProps) {
  const c = useCommon(ledger, today);
  const all = ledger.listTreasuries();
  const [kind, setKind] = useState<'withdrawal' | 'contribution'>('withdrawal');
  const [treasuryId, setTreasuryId] = useState(all[0]?.id ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!amount) return c.setError('مبلغ را وارد کن.');
    const err = commit({ k: kind, input: { id: docId(kind === 'withdrawal' ? 'draw' : 'cap'), date: c.date, treasuryId, amount } }, kind === 'withdrawal' ? 'برداشت ثبت شد.' : 'آورده ثبت شد.');
    c.setError(err); if (!err) done();
  }}>
    <Field label="نوع">{() => <Segmented label="نوع" value={kind} onChange={setKind} options={[['withdrawal', 'برداشت مالک'], ['contribution', 'آورده‌ی مالک']]} />}</Field>
    <div className="row2">
      <Field label="تاریخ">{(id) => <DateInput id={id} today={today} value={c.date} onChange={c.setDate} />}</Field>
      <Field label={kind === 'withdrawal' ? 'از' : 'به'}>{(id) => <select id={id} value={treasuryId} onChange={(e) => setTreasuryId(e.target.value)}>{all.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</Field>
    </div>
    <Field label="مبلغ">{(id) => <AmountInput id={id} value={amount} onChange={setAmount} />}</Field>
    <Submit error={c.error} />
  </form>;
}

function PartyForm({ commit, done }: FormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'supplier'>('customer');
  const [error, setError] = useState<string | null>(null);
  return <form onSubmit={(e) => {
    e.preventDefault();
    if (!name.trim()) return setError('نام را وارد کن.');
    const err = commit({ k: 'party', input: { id: docId(role === 'customer' ? 'c' : 's'), name: name.trim(), role } }, 'طرف حساب اضافه شد.');
    setError(err); if (!err) done();
  }}>
    <Field label="نوع">{() => <Segmented label="نوع" value={role} onChange={setRole} options={[['customer', 'مشتری'], ['supplier', 'تأمین‌کننده']]} />}</Field>
    <Field label="نام">{(id) => <input id={id} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="مثلاً شرکت آرمان" />}</Field>
    <p className="note">شماره‌ی تلفن در نسخه‌ی نمایشی گرفته نمی‌شود.</p>
    <Submit error={error} label="افزودن" />
  </form>;
}
