import { usePack } from '../../industry/context';
import { useMemo, useState } from 'react';
import { crmSummary, expiredConsents, expiringConsents, followUpList, MAX_CONSENT_MONTHS, POLICY_VERSION, type Consent, type Customer } from '../../crmEngine';
import { jalaliMonthRange, toJalali } from '../../engine';
import { useWorkspace, DEMO_MEMBER } from '../../workspace';
import { compactRial, faNum, jDate } from '../../format';
import { AmountInput, Badge, Card, Field, Segmented, Sheet } from '../../ui';
import { consentFor } from './data';

type Tab = 'summary' | 'members' | 'register' | 'ledger';
const TABS: readonly (readonly [Tab, string, string])[] = [['summary', '📊', 'خلاصه'], ['members', '👥', 'اعضا'], ['register', '➕', 'عضو تازه'], ['ledger', '🛡️', 'رضایت و حذف']];
const sourceLabels = (place: string) => ({ in_store_form: `فرم در ${place}`, qr_form: 'فرم QR', phone_recorded: 'تلفنی، ثبت‌شده' }) as const;
const REASON = { withdrawn: 'لغو رضایت عضویت', request: 'درخواست حذف', expired: 'پایان رضایت' } as const;
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export default function CrmModule({ tab: raw }: { tab: string }) {
  const ws = useWorkspace();
  const tab: Tab = (TABS.some(([k]) => k === raw) ? raw : 'summary') as Tab;
  const [openId, setOpenId] = useState<string | null>(null);
  const go = (t: Tab) => ws.navigate(t === 'summary' ? '/crm' : `/crm/${t}`);

  const { pack } = usePack();
  if (!ws.crm.enabled || pack.sensitive) return <Card title="مشتریان (CRM)"><p className="empty">در کسب‌وکارهای حوزه‌ی سلامت، فهرست مشتریان خاموش است تا اطلاعات حساس کسی نگه داشته نشود.</p></Card>;

  const open = (id: string) => { ws.commitCrm({ k: 'view', input: { customerId: id, by: DEMO_MEMBER.name, at: new Date().toISOString() } }, ''); setOpenId(id); };

  return <div className="module">
    <header className="page-head"><h1>مشتریان (CRM)</h1><span className="badge info">فقط با رضایت مشتری</span></header>
    <nav className="subnav scroll-x" aria-label="بخش‌های CRM">
      {TABS.map(([key, icon, label]) => <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => go(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </nav>
    {tab === 'summary' && <SummaryTab onOpen={open} />}
    {tab === 'members' && <MembersTab onOpen={open} />}
    {tab === 'register' && <RegisterForm done={() => go('members')} />}
    {tab === 'ledger' && <LedgerTab />}
    {openId && <ProfileSheet id={openId} onClose={() => setOpenId(null)} />}
  </div>;
}

function SummaryTab({ onOpen }: { onOpen: (id: string) => void }) {
  const ws = useWorkspace();
  const t = toJalali(ws.today);
  const month = jalaliMonthRange(t.jy, t.jm);
  const s = crmSummary(ws.crm, ws.today, month.from);
  const expiring = expiringConsents(ws.crm, ws.today);
  const expired = expiredConsents(ws.crm, ws.today);
  const follow = followUpList(ws.crm, ws.today);
  return <div className="stack">
    <p className="policy-note">فقط مشتریانی که خودشان با رضایت عضو باشگاه شده‌اند اینجا هستند؛ هیچ داده‌ای از شبکه‌های اجتماعی یا پیام‌ها برداشته نمی‌شود، هر عضو تاریخ پایان رضایت دارد و حذف واقعی است.</p>
    <div className="kpis">
      <div className="kpi"><span>اعضای فعال</span><strong>{faNum(s.members)}</strong><small>{faNum(s.newThisMonth)} عضو تازه این ماه</small></div>
      <div className="kpi"><span>مراجعه‌ی این ماه</span><strong>{faNum(s.visitsThisMonth)}</strong><small>از {faNum(s.returningThisMonth)} عضو</small></div>
      <div className="kpi"><span>رضایت بازاریابی</span><strong>{faNum(s.marketingOptIn)}</strong><small>از {faNum(s.members)} عضو</small></div>
      <div className={`kpi ${s.inactive30 ? 'bad' : 'good'}`}><span>بیش از ۳۰ روز نیامده</span><strong>{faNum(s.inactive30)}</strong><small>عضو فعال</small></div>
    </div>
    {s.byTag.length > 0 && <Card title="ترکیب اعضا (تجمیعی)"><div className="chips">{s.byTag.map(([tag, n]) => <span key={tag} className="chip">{tag} ({faNum(n)})</span>)}</div></Card>}
    <Card title="رضایت‌هایی که تمام می‌شوند">
      {expiring.length + expired.length === 0 ? <p className="empty">رضایت هیچ عضوی در دو هفته‌ی آینده تمام نمی‌شود.</p> :
        <ul className="rows">
          {expired.map((c) => <li key={c.id}><span>{c.displayName}<small> — تمام‌شده {jDate(c.consent.expiresAt)}</small></span><span className="row-end"><Badge tone="bad">تمدید یا حذف</Badge><button type="button" className="btn small" onClick={() => onOpen(c.id)}>باز کردن</button></span></li>)}
          {expiring.map((c) => <li key={c.id}><span>{c.displayName}<small> — تا {jDate(c.consent.expiresAt)}</small></span><span className="row-end"><Badge tone="warn">به‌زودی</Badge><button type="button" className="btn small" onClick={() => onOpen(c.id)}>باز کردن</button></span></li>)}
        </ul>}
    </Card>
    <Card title="پیگیری اعضایی که پیام تبلیغاتی را پذیرفته‌اند">
      {follow.length === 0 ? <p className="empty">عضوی با رضایت بازاریابی که بیش از ۳۰ روز نیامده باشد نیست.</p> :
        <ul className="rows">{follow.slice(0, 6).map((c) => <li key={c.id}><span>{c.displayName}<small> — {faNum(c.daysAway)} روز{c.lastVisit ? '' : ' از عضویت'}</small></span><button type="button" className="btn small" onClick={() => onOpen(c.id)}>باز کردن</button></li>)}</ul>}
      <p className="note">فقط به اعضایی که بازاریابی را پذیرفته‌اند؛ بقیه در این فهرست نمی‌آیند.</p>
    </Card>
  </div>;
}

function consentBadge(c: Omit<Customer, 'phone' | 'note'>, today: string) {
  if (c.consent.expiresAt < today) return <Badge tone="bad">رضایت تمام‌شده</Badge>;
  return c.consent.purposes.includes('marketing') ? <Badge tone="ok">عضو + بازاریابی</Badge> : <Badge tone="info">عضو</Badge>;
}

function MembersTab({ onOpen }: { onOpen: (id: string) => void }) {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const visits = useMemo(() => { const m = new Map<string, { n: number; last: string }>(); for (const v of ws.crm.allVisits()) { const e = m.get(v.customerId) ?? { n: 0, last: '' }; m.set(v.customerId, { n: e.n + 1, last: v.date > e.last ? v.date : e.last }); } return m; }, [ws.crm]);
  const rows = ws.crm.listCustomers().filter((c) => !q.trim() || c.displayName.includes(q.trim()) || c.tags.some((t) => t.includes(q.trim())));
  return <div className="stack">
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در نام یا برچسب" aria-label="جست‌وجوی عضو" />
    <Card>
      {rows.length === 0 ? <p className="empty">عضوی پیدا نشد.</p> :
        <ul className="rows">{rows.map((c) => { const v = visits.get(c.id); return <li key={c.id}>
          <button type="button" className="member-row" onClick={() => onOpen(c.id)}>
            <strong>{c.displayName}</strong>
            <small>{v ? `${faNum(v.n)} مراجعه، آخرین ${jDate(v.last)}` : 'هنوز مراجعه‌ای ثبت نشده'}{c.tags.length ? `، ${c.tags.join('، ')}` : ''}</small>
          </button>
          {consentBadge(c, ws.today)}
        </li>; })}</ul>}
      <p className="note">تلفن و یادداشت در فهرست نمی‌آید؛ فقط با باز کردن پرونده دیده می‌شود و هر باز کردن در «رضایت و حذف» ثبت می‌شود.</p>
    </Card>
  </div>;
}

function ConsentFields({ value, onChange }: { value: { agreed: boolean; marketing: boolean; source: Consent['source']; months: string }; onChange: (v: { agreed: boolean; marketing: boolean; source: Consent['source']; months: string }) => void }) {
  const place = usePack().pack.place;
  return <fieldset className="consent-box">
    <legend>رضایت مشتری (الزامی)</legend>
    <label className="check"><input type="checkbox" checked={value.agreed} onChange={(e) => onChange({ ...value, agreed: e.target.checked })} /> مشتری خودش عضویت در باشگاه مشتریان و نگه‌داری نام و مراجعه‌هایش را پذیرفت</label>
    <label className="check"><input type="checkbox" checked={value.marketing} onChange={(e) => onChange({ ...value, marketing: e.target.checked })} /> پیام‌های تبلیغاتی و تخفیف را هم پذیرفت (اختیاری، جدا)</label>
    <div className="row2">
      <Field label="چطور ثبت شد">{(id) => <select id={id} value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value as Consent['source'] })}>{Object.entries(sourceLabels(place)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</Field>
      <Field label="مدت رضایت">{() => <Segmented label="مدت رضایت" value={value.months} onChange={(months) => onChange({ ...value, months })} options={[['6', '۶ ماه'], ['12', '۱۲ ماه'], ['24', '۲۴ ماه']]} />}</Field>
    </div>
    <small>نسخه‌ی سیاست: {POLICY_VERSION}، حداکثر {faNum(MAX_CONSENT_MONTHS)} ماه؛ بعد از آن یا رضایت تازه یا حذف.</small>
  </fieldset>;
}

function RegisterForm({ done }: { done: () => void }) {
  const ws = useWorkspace();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [tags, setTags] = useState('');
  const [consent, setConsent] = useState({ agreed: false, marketing: false, source: 'in_store_form' as Consent['source'], months: '12' });
  const [error, setError] = useState<string | null>(null);
  const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s/g, '');
  return <Card title="عضو تازه‌ی باشگاه مشتریان">
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!consent.agreed) return setError('بدون رضایت خود مشتری، هیچ اطلاعاتی ثبت نمی‌شود.');
      const err = ws.commitCrm({ k: 'register', input: {
        id: `m-${Date.now().toString(36)}`, displayName: name.trim(), createdAt: ws.today,
        ...(phone.trim() ? { phone: latin(phone) } : {}), ...(birthMonth ? { birthMonth: Number(birthMonth) } : {}),
        tags: tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean),
        consent: consentFor(ws.today, Number(consent.months), consent.marketing ? ['membership', 'marketing'] : ['membership'], consent.source, DEMO_MEMBER.name),
      } }, 'عضو تازه با رضایت ثبت شد.');
      setError(err); if (!err) done();
    }}>
      <Field label="نام (همان‌قدر که مشتری می‌خواهد، مثلاً «سارا م.»)">{(id) => <input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
      <div className="row2">
        <Field label="تلفن (اختیاری)">{(id) => <input id={id} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09…" />}</Field>
        <Field label="ماه تولد (اختیاری)">{(id) => <select id={id} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}><option value="">—</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>}</Field>
      </div>
      <Field label="برچسب‌ها (با ویرگول)" hint="مثلاً لاته‌دوست، صبحگاهی — سلیقه، نه اطلاعات حساس">{(id) => <input id={id} value={tags} onChange={(e) => setTags(e.target.value)} />}</Field>
      <ConsentFields value={consent} onChange={setConsent} />
      <p className="note">هرگز ثبت نکن: سلامت، مذهب، سیاست، وضعیت مالی یا اطلاعات کودکان.</p>
      <div className="submit">{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="btn primary wide" disabled={!consent.agreed}>ثبت عضو</button></div>
    </form>
  </Card>;
}

function ProfileSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const ws = useWorkspace();
  const c = ws.crm.listCustomers().find((x) => x.id === id);
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renew, setRenew] = useState({ agreed: false, marketing: false, source: 'in_store_form' as Consent['source'], months: '12' });
  const place = usePack().pack.place;
  if (!c) return null;
  // Full profile read (phone, note) — this very open was logged in the access log.
  const full = (() => { try { return ws.crm.readLogged(id, DEMO_MEMBER.name, new Date()); } catch { return null; } })();
  const active = ws.crm.consentActive(id, ws.today);
  const visits = [...ws.crm.visitsOf(id)].reverse();
  return <Sheet title={c.displayName} onClose={onClose}>
    <div className="stack">
      <div className="profile-head">{consentBadge(c, ws.today)}<small>عضو از {jDate(c.createdAt)}، رضایت تا {jDate(c.consent.expiresAt)}، {sourceLabels(place)[c.consent.source]}</small></div>
      {full?.phone && <p className="calc">تلفن: <span dir="ltr">{full.phone}</span></p>}
      {full?.note && <p className="calc">یادداشت: {full.note}</p>}
      {c.tags.length > 0 && <div className="chips">{c.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
      {active ? <>
        <div className="row2">
          <Field label="ثبت مراجعه‌ی امروز (مبلغ اختیاری)">{(fid) => <AmountInput id={fid} value={amount} onChange={setAmount} />}</Field>
          <div className="field"><label>&nbsp;</label><button type="button" className="btn primary" onClick={() => { const err = ws.commitCrm({ k: 'visit', input: { customerId: id, date: ws.today, ...(amount ? { amount } : {}) } }, 'مراجعه ثبت شد.'); setError(err); if (!err) setAmount(null); }}>ثبت مراجعه</button></div>
        </div>
        {c.consent.purposes.includes('marketing') && <button type="button" className="btn small ghost" onClick={() => setError(ws.commitCrm({ k: 'withdraw-marketing', input: { customerId: id, date: ws.today } }, 'رضایت بازاریابی لغو شد.'))}>مشتری دیگر پیام تبلیغاتی نمی‌خواهد</button>}
      </> : <div className="consent-renew">
        <p className="form-error">رضایت این عضو تمام شده؛ تا تمدید با رضایت تازه، هیچ ثبتی ممکن نیست. اگر مشتری تمدید نمی‌خواهد، اطلاعاتش را حذف کن.</p>
        <ConsentFields value={renew} onChange={setRenew} />
        <button type="button" className="btn primary" disabled={!renew.agreed} onClick={() => setError(ws.commitCrm({ k: 'renew', input: { customerId: id, consent: consentFor(ws.today, Number(renew.months), renew.marketing ? ['membership', 'marketing'] : ['membership'], renew.source, DEMO_MEMBER.name) } }, 'رضایت با تاریخ تازه ثبت شد.'))}>تمدید با رضایت تازه</button>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <Card title="مراجعه‌ها">
        {visits.length === 0 ? <p className="empty">مراجعه‌ای ثبت نشده.</p> :
          <ul className="rows">{visits.slice(0, 12).map((v) => <li key={v.id}><span>{jDate(v.date)}<small>{v.source === 'invoice' ? ' — از فاکتور' : ''}</small></span><span>{v.amount !== undefined ? compactRial(v.amount) : '—'}</span></li>)}</ul>}
      </Card>
      <button type="button" className="btn small ghost danger" onClick={() => {
        if (!window.confirm(`همه‌ی اطلاعات «${c.displayName}» (نام، تلفن، یادداشت، مراجعه‌ها و سابقه‌ی دیدن پرونده) برای همیشه حذف شود؟ این کار برگشت ندارد.`)) return;
        const err = ws.eraseCustomer(id, 'request'); if (err) setError(err); else onClose();
      }}>حذف کامل به درخواست مشتری</button>
    </div>
  </Sheet>;
}

function LedgerTab() {
  const ws = useWorkspace();
  const erasures = [...ws.crm.erasureLog()].reverse();
  const access = [...ws.crm.accessLog()].reverse().slice(0, 30);
  const names = new Map(ws.crm.listCustomers().map((c) => [c.id, c.displayName]));
  return <div className="stack">
    <Card title="سیاست اجراشده">
      <ul className="points">
        <li>فقط داده‌ای که خود کسب‌وکار با رضایت مشتری جمع کرده؛ بدون برداشت نظر، پیام یا پروفایل از شبکه‌ها.</li>
        <li>هر عضو تاریخ پایان رضایت دارد (حداکثر {faNum(MAX_CONSENT_MONTHS)} ماه)؛ پس از آن فقط تمدید با رضایت تازه یا حذف.</li>
        <li>رضایت بازاریابی جداست و جدا لغو می‌شود. لغو عضویت یا درخواست حذف یعنی حذف واقعی، نه پنهان کردن.</li>
        <li>هر باز کردن پرونده‌ی یک نفر ثبت می‌شود. گزارش‌ها تجمیعی‌اند.</li>
        <li>هیچ داده‌ی مشتری به هوش مصنوعی بیرونی فرستاده نمی‌شود؛ دستیار ملینو فقط عدد تجمیعی می‌گوید.</li>
        <li>برای کسب‌وکارهای حساس (مثل سلامت) CRM خاموش است.</li>
      </ul>
    </Card>
    <Card title="دفتر حذف">
      {erasures.length === 0 ? <p className="empty">هنوز حذفی انجام نشده.</p> :
        <ul className="rows">{erasures.map((e, i) => <li key={i}><span>{jDate(e.date)} — {REASON[e.reason]}</span><small dir="ltr">{e.ref}</small></li>)}</ul>}
      <p className="note">در این دفتر فقط یک شناسه‌ی بی‌نام می‌ماند؛ خود فرد و همه‌ی سابقه‌اش پاک شده است.</p>
    </Card>
    <Card title="دفعاتی که پرونده‌ها باز شد">
      {access.length === 0 ? <p className="empty">هنوز پرونده‌ای باز نشده.</p> :
        <ul className="rows">{access.map((a, i) => <li key={i}><span>{names.get(a.customerId) ?? '—'}<small> — {a.by}</small></span><small>{new Date(a.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</small></li>)}</ul>}
    </Card>
  </div>;
}
