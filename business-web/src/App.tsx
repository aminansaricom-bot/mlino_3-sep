import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearBook, loadBook, replay, saveBook, type BookData, type Op, type Settings } from './book';
import { generateSample } from './sample';
import { errorText, faNum, jDateLong, todayIso } from './format';
import { Field, Segmented, Sheet } from './ui';
import Dashboard from './views/Dashboard';
import Cheques from './views/Cheques';
import Reports from './views/Reports';
import Journal from './views/Journal';
import { FORMS, RecordForm, RecordMenu, type FormKey } from './views/Record';

type Tab = 'home' | 'record' | 'cheques' | 'reports' | 'journal';
const TABS: readonly (readonly [Tab, string, string])[] = [
  ['home', '🏠', 'خانه'], ['record', '✚', 'ثبت'], ['cheques', '🧾', 'چک‌ها'], ['reports', '📊', 'گزارش'], ['journal', '📚', 'اسناد'],
];

function initialBook(today: string): BookData {
  const stored = loadBook();
  if (stored) {
    try { replay(stored); return stored; } catch { /* corrupted or from an older engine: start over */ }
  }
  const fresh = generateSample(today);
  saveBook(fresh);
  return fresh;
}

export default function App() {
  const today = useMemo(() => todayIso(), []);
  const [data, setData] = useState<BookData>(() => initialBook(today));
  const ledger = useMemo(() => replay(data), [data]);
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'home');
  const [form, setForm] = useState<FormKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { history.replaceState(null, '', `#${tab}`); window.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const commit = useCallback((op: Op, success: string): string | null => {
    const next: BookData = { ...data, ops: [...data.ops, op] };
    try { replay(next); } catch (error) { return errorText(error); }
    setData(next); saveBook(next); setToast(success);
    return null;
  }, [data]);

  const updateSettings = (settings: Settings) => { const next = { ...data, settings }; setData(next); saveBook(next); };
  const reset = () => {
    if (!window.confirm('همه‌ی ثبت‌های تو پاک می‌شود و دفتر نمونه از نو ساخته می‌شود. ادامه؟')) return;
    clearBook(); const fresh = generateSample(today); saveBook(fresh); setData(fresh); setTab('home'); setToast('دفتر نمونه از نو ساخته شد.');
  };
  const formTitle = form ? FORMS.find((f) => f[0] === form)![2] : '';

  return <div className="app">
    <header className="top">
      <a className="back" href="https://business.mlino.site/" aria-label="بازگشت به پنل کسب‌وکار"><img src="/accounting/logo.png" alt="" width="36" height="26" /></a>
      <div className="title"><strong>{data.settings.businessName}</strong><small>حسابداری — {jDateLong(today)}</small></div>
      <span className="demo-tag">نمایشی</span>
      <button type="button" className="icon-btn" onClick={() => setShowSettings(true)} aria-label="تنظیمات">⚙️</button>
    </header>
    <nav className="tabs" aria-label="بخش‌ها">
      {TABS.map(([key, icon, label]) => <button key={key} type="button" className={tab === key ? 'on' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
        <span aria-hidden="true">{icon}</span>{label}
      </button>)}
    </nav>
    <main className="content">
      <p className="demo-banner">این یک دفتر نمونه است: عددها ساختگی‌اند و ثبت‌های تو فقط روی همین مرورگر می‌ماند. <button type="button" className="link" onClick={reset}>شروع دوباره</button></p>
      {tab === 'home' && <Dashboard ledger={ledger} today={today} onRecord={(f) => setForm(f as FormKey)} onTab={(t) => setTab(t as Tab)} />}
      {tab === 'record' && <RecordMenu onOpen={setForm} />}
      {tab === 'cheques' && <Cheques ledger={ledger} today={today} commit={commit} />}
      {tab === 'reports' && <Reports ledger={ledger} today={today} />}
      {tab === 'journal' && <Journal ledger={ledger} today={today} commit={commit} />}
    </main>
    {form && <Sheet title={formTitle} onClose={() => setForm(null)}>
      <RecordForm form={form} ledger={ledger} settings={data.settings} today={today} commit={commit} done={() => setForm(null)} />
    </Sheet>}
    {showSettings && <Sheet title="تنظیمات" onClose={() => setShowSettings(false)}>
      <SettingsForm settings={data.settings} onSave={(s) => { updateSettings(s); setShowSettings(false); setToast('تنظیمات ذخیره شد.'); }} />
    </Sheet>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function SettingsForm({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [name, setName] = useState(settings.businessName);
  const [rate, setRate] = useState(String(settings.vatRateBp / 100));
  const [inclusive, setInclusive] = useState(settings.pricesIncludeVat ? 'yes' : 'no');
  const pct = Number(rate.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  const valid = Number.isFinite(pct) && pct >= 0 && pct <= 50 && Number.isInteger(pct * 100);
  return <form onSubmit={(e) => { e.preventDefault(); if (valid && name.trim()) onSave({ businessName: name.trim().slice(0, 60), vatRateBp: Math.round(pct * 100), pricesIncludeVat: inclusive === 'yes' }); }}>
    <Field label="نام کسب‌وکار">{(id) => <input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
    <Field label="نرخ مالیات بر ارزش افزوده (درصد)" hint="پیش‌فرض ۱۰٪. روی سندهای بعدی اعمال می‌شود، سندهای قبلی عوض نمی‌شوند." error={valid ? null : 'نرخ باید عددی بین ۰ تا ۵۰ باشد.'}>
      {(id) => <input id={id} inputMode="decimal" dir="ltr" value={rate} onChange={(e) => setRate(e.target.value)} />}
    </Field>
    <Field label="قیمت‌های منو">{() => <Segmented label="قیمت‌های منو" value={inclusive} onChange={setInclusive} options={[['yes', 'با ارزش افزوده'], ['no', 'بدون ارزش افزوده']]} />}</Field>
    <p className="note">نرخ فعلی: {faNum(settings.vatRateBp / 100)}٪</p>
    <div className="submit"><button type="submit" className="btn primary wide" disabled={!valid}>ذخیره</button></div>
  </form>;
}
