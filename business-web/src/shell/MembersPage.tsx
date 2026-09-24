import { useCallback, useEffect, useState } from 'react';
import { api, apiErrorText } from '../chat/api';
import { useChatSession } from '../chat/session';
import LoginCard from '../chat/LoginCard';
import { faNum, jDate } from '../format';
import { ADMIN_KEYS, keyLabel } from '../chat/permissions';

// Members and their permissions (D-57). The panel only asks; Core decides every change under its own rules:
// adding needs «افزودن عضو», granting needs «دادن دسترسی» and holding that same permission, nobody grants
// themself, and the last person who can grant can never be removed. Only the last four digits are ever shown.

type Grant = { grantId: string; key: string; founding: boolean };
type Member = { membershipId: string; phoneHint: string | null; test: boolean; founding: boolean; isMe: boolean; since: string; grants: Grant[] };
type Directory = { me: string; myKeys: string[]; grantable: string[]; members: Member[] };

const digits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

export default function MembersPage() {
  const s = useChatSession();
  const orgId = s.org?.organizationId ?? null;
  const [dir, setDir] = useState<Directory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    if (!orgId) return;
    try { setDir(await api<Directory>('GET', `/biz/${orgId}/members`)); setError(null); } catch (e) { setDir(null); setError(apiErrorText(e)); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (what: () => Promise<unknown>, done: string) => {
    setBusy(true); setNote(null);
    try { await what(); setNote(done); await load(); await s.refresh(); } catch (e) { setNote(apiErrorText(e)); } finally { setBusy(false); }
  };

  const can = (k: string) => dir?.myKeys.includes(k) ?? false;
  const who = (m: Member) => m.phoneHint ? `شماره‌ی …${digits(m.phoneHint)}` : 'عضو بنیان‌گذار';

  return <div className="stack">
    <header className="page-head"><h1>اعضا و دسترسی‌ها</h1><span className="badge info">هسته — عضویت و اجازه</span></header>
    {!s.ready ? <p className="empty">در حال بررسی ورود…</p>
      : !s.me ? <LoginCard config={s.config} onDone={() => void s.refresh()} hint="شماره‌ی آزمایشیِ مدیر کسب‌وکارهای نمایشی: ۰۹۰۰۰۰۰۰۰۹۰." />
      : !s.org ? <p className="empty">این شماره عضو هیچ کسب‌وکار منتشرشده‌ای نیست.</p>
      : !ADMIN_KEYS.some((k) => s.can(k)) ? <p className="empty">دیدن و تغییر اعضا فقط برای کسی است که اجازه‌ی مدیریت اعضا دارد.</p>
      : <>
        <p className="policy-note">هر کس با شماره‌ی خودش وارد می‌شود و فقط کارهایی را می‌تواند که اینجا به او داده شده؛ اجازه در لحظه‌ی هر کار سنجیده می‌شود، پس گرفتنش از همان درخواست بعدی اثر دارد. فقط کسی که یک اجازه را دارد می‌تواند آن را به دیگری بدهد و هیچ‌کس به خودش اجازه نمی‌دهد.</p>
        {error && <p className="note bad">{error}</p>}

        {can('membership.create') && <form className="card member-add" onSubmit={(e) => { e.preventDefault(); if (phone.trim()) void run(() => api('POST', `/biz/${orgId}/members`, { phone }), 'عضو اضافه شد؛ حالا اجازه‌هایش را بده.').then(() => setPhone('')); }}>
          <header className="card-head"><h3>افزودن عضو</h3></header>
          <label className="sr-only" htmlFor="member-phone">شماره‌ی موبایل عضو تازه</label>
          <div className="row-end">
            <input id="member-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="submit" className="btn primary" disabled={busy || phone.trim().length < 11}>افزودن</button>
          </div>
          {s.config?.delivery === 'test' && <small className="muted">تا وصل شدن پیامک فقط شماره‌های آزمایشی ۰۹۰۰۰۰۰۰۰۰۱ تا ۰۹۰۰۰۰۰۰۰۹۹ پذیرفته می‌شوند.</small>}
        </form>}

        {dir && <ul className="member-list">{dir.members.map((m) => {
          const missing = dir.grantable.filter((k) => !m.grants.some((g) => g.key === k));
          return <li key={m.membershipId} className="card">
            <header className="card-head">
              <h3>{who(m)}{m.isMe && <small className="muted"> (خودت)</small>}</h3>
              <small className="muted">عضو از {jDate(m.since.slice(0, 10))}{m.test ? ' · آزمایشی' : ''}</small>
            </header>
            <div className="grant-chips">
              {m.grants.length === 0 && <span className="muted">هنوز هیچ اجازه‌ای ندارد.</span>}
              {m.grants.map((g) => <span key={g.grantId} className={`grant-chip${g.founding ? ' founding' : ''}`}>
                {keyLabel(g.key)}
                {!g.founding && !m.isMe && can('permission_grant.revoke') && <button type="button" aria-label={`گرفتن اجازه‌ی ${keyLabel(g.key)}`} disabled={busy}
                  onClick={() => { if (window.confirm(`اجازه‌ی «${keyLabel(g.key)}» از ${who(m)} گرفته شود؟`)) void run(() => api('POST', `/biz/${orgId}/grants/${g.grantId}/revoke`, {}), 'اجازه گرفته شد.'); }}>×</button>}
              </span>)}
            </div>
            {!m.isMe && !m.founding && <div className="member-actions">
              {missing.length > 0 && <select aria-label={`دادن اجازه به ${who(m)}`} value="" disabled={busy} onChange={(e) => { const k = e.target.value; if (k) void run(() => api('POST', `/biz/${orgId}/members/${m.membershipId}/grants`, { key: k }), `اجازه‌ی «${keyLabel(k)}» داده شد.`); }}>
                <option value="">+ دادن اجازه…</option>
                {missing.map((k) => <option key={k} value={k}>{keyLabel(k)}</option>)}
              </select>}
              {can('membership.revoke') && <button type="button" className="btn small ghost danger" disabled={busy}
                onClick={() => { if (window.confirm(`${who(m)} از اعضای این کسب‌وکار حذف شود؟ همه‌ی اجازه‌هایش از همان لحظه بی‌اثر می‌شود.`)) void run(() => api('POST', `/biz/${orgId}/members/${m.membershipId}/revoke`, {}), 'عضو حذف شد.'); }}>حذف عضو</button>}
            </div>}
          </li>;
        })}</ul>}
        {dir && <p className="muted">{faNum(dir.members.length)} عضو فعال.</p>}
        {note && <p className="note" role="status">{note}</p>}
      </>}
  </div>;
}
