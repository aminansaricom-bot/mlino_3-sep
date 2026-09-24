import { usePack } from '../../industry/context';
import { useState } from 'react';
import type { Settings } from '../../book';
import { faNum } from '../../format';
import { Field, Segmented, Sheet } from '../../ui';
import { useWorkspace } from '../../workspace';
import Dashboard from './views/Dashboard';
import Cheques from './views/Cheques';
import Reports from './views/Reports';
import Journal from './views/Journal';
import { FORMS, RecordForm, RecordMenu, type FormKey } from './views/Record';

type Tab = 'home' | 'record' | 'cheques' | 'reports' | 'journal';
const TABS: readonly (readonly [Tab, string, string])[] = [
  ['home', '🏠', 'خلاصه'], ['record', '✚', 'ثبت'], ['cheques', '🧾', 'چک‌ها'], ['reports', '📊', 'گزارش'], ['journal', '📚', 'اسناد'],
];

/** The accounting module inside the panel shell. Sub-route: /accounting/<tab>[:<report>]. */
export default function AccountingModule({ tab: rawTab }: { tab: string }) {
  const ws = useWorkspace();
  const [tabName, reportView] = rawTab.split(':');
  const tab: Tab = (TABS.some(([k]) => k === tabName) ? tabName : 'home') as Tab;
  const [form, setForm] = useState<FormKey | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const go = (t: string) => ws.navigate(t === 'home' ? '/accounting' : `/accounting/${t}`);
  const commit = (op: Parameters<typeof ws.commitAccounting>[0], success: string) => ws.commitAccounting(op, success, 'manual');
  const formTitle = form ? FORMS.find((f) => f[0] === form)![2] : '';

  return <div className="module">
    <header className="page-head"><h1>حسابداری</h1>
      <button type="button" className="icon-btn" onClick={() => setShowSettings(true)} aria-label="تنظیمات حسابداری">⚙️</button></header>
    <nav className="subnav scroll-x" aria-label="بخش‌های حسابداری">
      {TABS.map(([key, icon, label]) => <button key={key} type="button" className={tab === key ? 'on' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => go(key)}>
        <span aria-hidden="true">{icon}</span>{label}
      </button>)}
    </nav>
    {tab === 'home' && <Dashboard ledger={ws.ledger} today={ws.today} onRecord={(f) => setForm(f as FormKey)} onTab={(t) => go(t)} />}
    {tab === 'record' && <RecordMenu onOpen={setForm} />}
    {tab === 'cheques' && <Cheques ledger={ws.ledger} today={ws.today} commit={commit} />}
    {tab === 'reports' && <Reports key={reportView ?? 'default'} ledger={ws.ledger} today={ws.today} initial={reportView} />}
    {tab === 'journal' && <Journal ledger={ws.ledger} today={ws.today} commit={commit} attachVersion={ws.attachVersion} onAttachmentsChanged={ws.bumpAttachments} />}
    {form && <Sheet title={formTitle} onClose={() => setForm(null)}>
      <RecordForm form={form} ledger={ws.ledger} settings={ws.book.settings} today={ws.today} commit={commit} attach={ws.attach} done={() => setForm(null)} />
    </Sheet>}
    {showSettings && <Sheet title="تنظیمات حسابداری" onClose={() => setShowSettings(false)}>
      <SettingsForm settings={ws.book.settings} onSave={(s) => { ws.updateSettings(s); setShowSettings(false); }} />
    </Sheet>}
  </div>;
}

function SettingsForm({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [name, setName] = useState(settings.businessName);
  const [rate, setRate] = useState(String(settings.vatRateBp / 100));
  const [inclusive, setInclusive] = useState(settings.pricesIncludeVat ? 'yes' : 'no');
  const catalog = usePack().pack.catalog;
  const pct = Number(rate.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  const valid = Number.isFinite(pct) && pct >= 0 && pct <= 50 && Number.isInteger(pct * 100);
  return <form onSubmit={(e) => { e.preventDefault(); if (valid && name.trim()) onSave({ businessName: name.trim().slice(0, 60), vatRateBp: Math.round(pct * 100), pricesIncludeVat: inclusive === 'yes' }); }}>
    <Field label="نام کسب‌وکار">{(id) => <input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
    <Field label="نرخ مالیات بر ارزش افزوده (درصد)" hint="پیش‌فرض ۱۰٪. روی سندهای بعدی اعمال می‌شود، سندهای قبلی عوض نمی‌شوند." error={valid ? null : 'نرخ باید عددی بین ۰ تا ۵۰ باشد.'}>
      {(id) => <input id={id} inputMode="decimal" dir="ltr" value={rate} onChange={(e) => setRate(e.target.value)} />}
    </Field>
    <Field label={`قیمت‌های ${catalog}`}>{() => <Segmented label={`قیمت‌های ${catalog}`} value={inclusive} onChange={setInclusive} options={[['yes', 'با ارزش افزوده'], ['no', 'بدون ارزش افزوده']]} />}</Field>
    <p className="note">نرخ فعلی: {faNum(settings.vatRateBp / 100)}٪</p>
    <div className="submit"><button type="submit" className="btn primary wide" disabled={!valid}>ذخیره</button></div>
  </form>;
}
