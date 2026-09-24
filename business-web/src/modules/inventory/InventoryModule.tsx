import { usePack } from '../../industry/context';
import { useState } from 'react';
import { displayQty, lowStock, stockReport, stockValue, type BaseUnit, type Inventory, type StockItem } from '../../inventoryEngine';
import { useWorkspace } from '../../workspace';
import { faNum, jDate } from '../../format';
import { AmountInput, Badge, Card, DateInput, Field, Money, Segmented, Sheet } from '../../ui';
import { DEMO_MENU } from '../../sample';
import type { InvOp } from './data';

type Tab = 'stock' | 'record' | 'recipes' | 'history';
const TABS: readonly (readonly [Tab, string, string])[] = [['stock', '📦', 'موجودی'], ['record', '✚', 'ثبت'], ['recipes', '🧪', 'دستور مصرف'], ['history', '📜', 'گردش']];

export function qtyText(qty: number, unit: BaseUnit): string {
  const d = displayQty(qty, unit);
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(d.value)} ${d.label}`;
}

/** Input in the display unit (kg / L / pcs) → whole base units. */
function toBase(value: number, unit: BaseUnit, big: boolean): number {
  return Math.round(unit === 'pcs' ? value : big ? value * 1000 : value);
}

type Form = 'receive' | 'issue' | 'count' | 'item';

export default function InventoryModule({ tab: raw }: { tab: string }) {
  const ws = useWorkspace();
  const { pack } = usePack();
  // Recipes (each sold item consumes stock) exist only for trades that make what they sell.
  const tabs = TABS.filter(([k]) => k !== 'recipes' || pack.recipes);
  const tab: Tab = (tabs.some(([k]) => k === raw) ? raw : 'stock') as Tab;
  const [form, setForm] = useState<{ kind: Form; itemId?: string } | null>(null);
  const inv = ws.inventory;
  const go = (t: Tab) => ws.navigate(t === 'stock' ? '/inventory' : `/inventory/${t}`);

  return <div className="module">
    <header className="page-head"><h1>موجودی مواد و کالا</h1></header>
    <nav className="subnav scroll-x" aria-label="بخش‌های انبار">
      {tabs.map(([key, icon, label]) => <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => go(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </nav>
    {tab === 'stock' && <StockTab inv={inv} onForm={(kind, itemId) => setForm({ kind, itemId })} />}
    {tab === 'record' && <div className="tiles">
      {([['receive', '📥', 'ورود کالا', 'خرید یا دریافت، با بهای تمام‌شده'], ['issue', '📤', 'مصرف یا ضایعات', 'برداشت از انبار با دلیل'], ['count', '🔢', 'شمارش انبار', 'ثبت موجودی واقعی؛ فقط اختلاف ثبت می‌شود'], ['item', '➕', 'کالای تازه', 'ماده‌ی اولیه یا کالای آماده']] as const).map(([k, icon, title, hint]) =>
        <button key={k} type="button" className="tile" onClick={() => setForm({ kind: k })}><span className="tile-icon" aria-hidden="true">{icon}</span><strong>{title}</strong><small>{hint}</small></button>)}
    </div>}
    {tab === 'recipes' && <RecipesTab inv={inv} item={pack.item} />}
    {tab === 'history' && <HistoryTab inv={inv} />}
    {form && <Sheet title={{ receive: 'ورود کالا', issue: 'مصرف یا ضایعات', count: 'شمارش انبار', item: 'کالای تازه' }[form.kind]} onClose={() => setForm(null)}>
      <InventoryForm kind={form.kind} itemId={form.itemId} done={() => setForm(null)} />
    </Sheet>}
  </div>;
}

function StockTab({ inv, onForm }: { inv: Inventory; onForm: (kind: Form, itemId: string) => void }) {
  const rows = stockReport(inv);
  const low = lowStock(inv);
  return <div className="stack">
    <div className="kpis two">
      <div className="kpi"><span>ارزش موجودی</span><strong><Money value={stockValue(inv)} compact /></strong><small>به میانگین بهای خرید</small></div>
      <div className={`kpi ${low.length ? 'bad' : 'good'}`}><span>زیر حد سفارش</span><strong>{faNum(low.length)} قلم</strong><small>{low.length ? low.map((r) => r.name).slice(0, 2).join('، ') : 'همه کافی'}</small></div>
    </div>
    <Card>
      <ul className="stock-list">{rows.map((r) => <li key={r.id} className={r.negative ? 'negative' : r.low ? 'low' : ''}>
        <div className="stock-main"><strong>{r.name}</strong><small>{r.kind === 'goods' ? 'کالای آماده' : 'ماده‌ی اولیه'}، حد سفارش {qtyText(r.reorderLevel, r.unit)}</small></div>
        <div className="stock-side"><b>{qtyText(r.qty, r.unit)}</b><small><Money value={Math.max(0, r.value)} compact /></small>
          <span className="badges">{r.negative ? <Badge tone="bad">منفی — شمارش کن</Badge> : r.low ? <Badge tone="warn">کم</Badge> : <Badge tone="ok">کافی</Badge>}</span></div>
        <div className="ch-actions">
          <button type="button" className="btn small" onClick={() => onForm('receive', r.id)}>ورود</button>
          <button type="button" className="btn small ghost" onClick={() => onForm('issue', r.id)}>مصرف</button>
          <button type="button" className="btn small ghost" onClick={() => onForm('count', r.id)}>شمارش</button>
        </div>
      </li>)}</ul>
    </Card>
  </div>;
}

function RecipesTab({ inv, item }: { inv: Inventory; item: string }) {
  const recipes = [...inv.listRecipes().entries()];
  return <Card title={`دستور مصرف هر ${item}`}>
    <p className="muted">با ثبت فاکتور فروش در حسابداری، مواد همین دستورها خودکار از انبار کم می‌شود (جریان یک‌طرفه‌ی اعلام‌شده: حسابداری ← انبار). فروش یکجای روزانه قلم ندارد، پس مصرفش با شمارش هفتگی دیده می‌شود.</p>
    <ul className="rows">{recipes.map(([menuId, lines]) => <li key={menuId}>
      <span><strong>{DEMO_MENU.find((m) => m.id === menuId)?.name ?? menuId}</strong></span>
      <span className="recipe-lines">{lines.map((l) => `${inv.item(l.itemId).name} ${qtyText(l.qty, inv.item(l.itemId).unit)}`).join(' + ')}</span>
    </li>)}</ul>
  </Card>;
}

const TYPE_LABEL = { receive: 'ورود', issue: 'مصرف', sale: 'فروش', count: 'شمارش' } as const;

function HistoryTab({ inv }: { inv: Inventory }) {
  const [limit, setLimit] = useState(40);
  const moves = [...inv.listMovements()].reverse();
  return <Card>
    <ul className="journal">{moves.slice(0, limit).map((m) => {
      const item = inv.item(m.itemId);
      return <li key={m.id}><div className="j-head static">
        <span className="j-date">{jDate(m.date)}</span>
        <span className="j-desc"><strong>{item.name} — {TYPE_LABEL[m.type]}</strong><small>{m.note ?? ''}</small></span>
        <span className="j-amt"><b className={m.qty < 0 ? 'neg' : 'pos'}>{m.qty > 0 ? '+' : '−'}{qtyText(Math.abs(m.qty), item.unit)}</b><small><Money value={Math.abs(m.value)} compact /></small></span>
      </div></li>;
    })}</ul>
    {moves.length > limit && <button type="button" className="btn ghost wide" onClick={() => setLimit(limit + 40)}>گردش بیشتر</button>}
  </Card>;
}

function InventoryForm({ kind, itemId, done }: { kind: Form; itemId?: string; done: () => void }) {
  const ws = useWorkspace();
  const items = ws.inventory.listItems();
  const [id, setId] = useState(itemId ?? items[0]?.id ?? '');
  const [date, setDate] = useState(ws.today);
  const [amount, setAmount] = useState('');
  const [big, setBig] = useState<'big' | 'small'>('big');
  const [cost, setCost] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{ name: string; unit: BaseUnit; kind: StockItem['kind']; reorder: string }>({ name: '', unit: 'g', kind: 'material', reorder: '' });
  const item = items.find((i) => i.id === id);
  const unitWord = (u: BaseUnit, b: boolean) => (u === 'pcs' ? 'عدد' : u === 'g' ? (b ? 'کیلوگرم' : 'گرم') : b ? 'لیتر' : 'میلی‌لیتر');
  const num = Number(amount.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٫,]/g, '.'));

  const submit = () => {
    if (kind === 'item') {
      if (!newItem.name.trim()) return setError('نام کالا را وارد کن.');
      const reorder = Number(newItem.reorder || '0');
      const op: InvOp = { k: 'item', input: { id: `item-${Date.now().toString(36)}`, name: newItem.name.trim(), unit: newItem.unit, kind: newItem.kind, reorderLevel: toBase(reorder, newItem.unit, newItem.unit !== 'pcs') } };
      const err = ws.commitInventory(op, 'کالا تعریف شد.'); setError(err); if (!err) done(); return;
    }
    if (!item) return setError('کالا را انتخاب کن.');
    if (!Number.isFinite(num) || num < 0 || (kind !== 'count' && num === 0)) return setError('مقدار را درست وارد کن.');
    const qty = toBase(num, item.unit, big === 'big');
    let op: InvOp;
    if (kind === 'receive') {
      if (cost === null) return setError('بهای خرید را وارد کن.');
      op = { k: 'receive', input: { itemId: item.id, qty, totalCost: cost, date, ...(note.trim() ? { note: note.trim() } : {}) } };
    } else if (kind === 'issue') {
      op = { k: 'issue', input: { itemId: item.id, qty, date, note: note.trim() || 'مصرف' } };
    } else {
      op = { k: 'count', input: { itemId: item.id, countedQty: qty, date, note: note.trim() || 'شمارش انبار' } };
    }
    const err = ws.commitInventory(op, kind === 'receive' ? 'ورود کالا ثبت شد.' : kind === 'issue' ? 'مصرف ثبت شد.' : 'شمارش ثبت شد.');
    setError(err); if (!err) done();
  };

  return <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
    {kind === 'item' ? <>
      <Field label="نام">{(fid) => <input id={fid} value={newItem.name} maxLength={80} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="مثلاً خامه" />}</Field>
      <Field label="نوع">{() => <Segmented label="نوع" value={newItem.kind} onChange={(v) => setNewItem({ ...newItem, kind: v })} options={[['material', 'ماده‌ی اولیه'], ['goods', 'کالای آماده']]} />}</Field>
      <Field label="واحد">{() => <Segmented label="واحد" value={newItem.unit} onChange={(v) => setNewItem({ ...newItem, unit: v })} options={[['g', 'وزن (کیلوگرم)'], ['ml', 'حجم (لیتر)'], ['pcs', 'عدد']]} />}</Field>
      <Field label={`حد سفارش (${unitWord(newItem.unit, true)})`}>{(fid) => <input id={fid} inputMode="decimal" dir="ltr" value={newItem.reorder} onChange={(e) => setNewItem({ ...newItem, reorder: e.target.value })} />}</Field>
    </> : <>
      <div className="row2">
        <Field label="کالا">{(fid) => <select id={fid} value={id} onChange={(e) => setId(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}</Field>
        <Field label="تاریخ">{(fid) => <DateInput id={fid} today={ws.today} value={date} onChange={setDate} />}</Field>
      </div>
      {item && <p className="calc">موجودی دفتری: {qtyText(ws.inventory.onHand(item.id).qty, item.unit)}</p>}
      <div className="row2">
        <Field label={kind === 'count' ? 'مقدار شمرده‌شده' : 'مقدار'}>{(fid) => <input id={fid} inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
        {item && item.unit !== 'pcs' && <Field label="واحد">{() => <Segmented label="واحد" value={big} onChange={setBig} options={[['big', unitWord(item.unit, true)], ['small', unitWord(item.unit, false)]]} />}</Field>}
      </div>
      {kind === 'receive' && <Field label="بهای کل خرید" hint="برای میانگین بهای موجودی. ثبت پرداختش در حسابداری جداست.">{(fid) => <AmountInput id={fid} value={cost} onChange={setCost} />}</Field>}
      <Field label="توضیح">{(fid) => <input id={fid} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'issue' ? 'مثلاً ضایعات' : ''} />}</Field>
    </>}
    <div className="submit">{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="btn primary wide">ثبت</button></div>
  </form>;
}
