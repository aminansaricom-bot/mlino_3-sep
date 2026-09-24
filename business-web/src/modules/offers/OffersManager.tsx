import { useCallback, useEffect, useState } from 'react';
import { useChatSession } from '../../chat/session';
import LoginCard from '../../chat/LoginCard';
import { api, apiErrorText } from '../../chat/api';
import { faNum, jDate } from '../../format';
import { AmountInput, Field } from '../../ui';
import { TIER_LABEL, usePlan } from '../plan/PlanPage';

// Offers with a radius (D-77). Created as a draft; nothing reaches V2 until a person presses «انتشار» (D-52).
// V2 shows a radius offer only to viewers inside it (measured on their phone); PRO/MAX also notify opted-in viewers.

type Offer = { offerId: string; versionId: string; name: string; shortDescription: string | null; priceAmount: string | null; validFrom: string; validUntil: string | null; status: string; publishedAt: string | null; radiusMeters: number | null; expired: boolean };

const RADII: ReadonlyArray<readonly [number | null, string]> = [[300, '۳۰۰ متر'], [500, '۵۰۰ متر'], [1000, '۱ کیلومتر'], [2000, '۲ کیلومتر'], [5000, '۵ کیلومتر'], [null, 'همه، بدون محدودیت فاصله']];
const radiusText = (m: number | null) => (m === null ? 'همه' : m >= 1000 ? `${faNum(m / 1000)} کیلومتر` : `${faNum(m)} متر`);

export default function OffersManager() {
  const s = useChatSession();
  const orgId = s.org?.organizationId ?? null;
  const { plan, reload: reloadPlan } = usePlan(orgId);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: null as number | null, days: 7, radius: 1000 as number | null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    try { setOffers((await api<{ offers: Offer[] }>('GET', `/biz/${orgId}/offers`)).offers); setError(null); } catch (e) { setError(apiErrorText(e)); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  if (!s.ready) return <p className="empty">در حال بررسی ورود…</p>;
  if (!s.me) return <LoginCard config={s.config} onDone={() => void s.refresh()} hint="شماره‌ی آزمایشیِ عضو کسب‌وکارهای نمایشی: ۰۹۰۰۰۰۰۰۰۹۰." />;
  if (!orgId) return <p className="empty">این شماره عضو هیچ کسب‌وکار منتشرشده‌ای نیست.</p>;

  const create = async () => {
    setBusy(true); setNote(null); setError(null);
    try {
      await api('POST', `/biz/${orgId}/offers`, { name: form.name, shortDescription: form.description || null, priceAmount: form.price, validDays: form.days, radiusMeters: form.radius });
      setForm({ ...form, name: '', description: '', price: null });
      setNote('پیش‌نویس ساخته شد. هنوز کسی آن را نمی‌بیند؛ برای نمایش در V2 «انتشار» را بزن.');
      await load();
    } catch (e) { setError(apiErrorText(e)); } finally { setBusy(false); }
  };
  const act = async (o: Offer, action: 'publish' | 'withdraw') => {
    if (action === 'publish' && !window.confirm(`«${o.name}» منتشر شود؟ ${o.radiusMeters ? `کاربرانی که تا ${radiusText(o.radiusMeters)} از کسب‌وکار فاصله دارند آن را در V2 می‌بینند${plan?.limits.offerPush ? ' و اگر اعلان را روشن کرده باشند، خبردار می‌شوند' : ''}.` : 'همه‌ی کاربران V2 آن را می‌بینند.'}`)) return;
    setBusy(true); setNote(null); setError(null);
    try {
      await api('POST', `/biz/${orgId}/offers/${o.versionId}/${action}`);
      setNote(action === 'publish' ? 'منتشر شد؛ تا حدود یک دقیقه‌ی دیگر در V2 دیده می‌شود.' : 'از V2 برداشته شد.');
      await Promise.all([load(), reloadPlan()]);
    } catch (e) {
      setError(e instanceof Error && e.message === 'PLAN_LIMIT' ? `سقف آفرهای این ماه در پلن «${plan ? TIER_LABEL[plan.tier] : ''}» پر شده است. برای آفر بیشتر پلن را ارتقا بده.` : apiErrorText(e));
    } finally { setBusy(false); }
  };

  const used = plan ? plan.usage.offersThisMonth : 0;
  const limit = plan?.limits.offersPerMonth ?? null;
  return <div className="stack">
    {plan && <section className="card chat-status">
      <div><strong>پلن {TIER_LABEL[plan.tier]}: {faNum(used)} از {limit === null ? 'نامحدود' : faNum(limit)} آفر این ماه</strong>
        <small>{plan.limits.offerPush ? 'آفرهای شعاع‌دار به کاربرانی که اعلان را روشن کرده‌اند و داخل شعاع‌اند خبر داده می‌شود.' : 'در این پلن آفر فقط روی نقشه و در تب «تخفیف‌ها»ی V2 دیده می‌شود؛ اعلان فعال در پلن پرو و مکس است.'}</small></div>
    </section>}

    <section className="card">
      <header className="card-head"><h3>آفر تازه</h3></header>
      <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <Field label="عنوان آفر">{(id) => <input id={id} value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً «۲۰٪ تخفیف ماچا لاته»" />}</Field>
        <Field label="توضیح (اختیاری)">{(id) => <input id={id} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="شرط‌ها، ساعت، …" />}</Field>
        <div className="form-row">
          <Field label="قیمت با تخفیف (اختیاری، ریال)">{(id) => <AmountInput id={id} value={form.price} onChange={(v) => setForm({ ...form, price: v })} />}</Field>
          <Field label="مدت اعتبار">{(id) => <select id={id} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}>{[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{faNum(d)} روز</option>)}</select>}</Field>
        </div>
        <Field label="به چه کسانی نشان داده شود؟" hint="فاصله از کسب‌وکار؛ روی گوشی خود کاربر سنجیده می‌شود و موقعیت کسی به کسب‌وکار داده نمی‌شود.">{(id) =>
          <select id={id} value={form.radius ?? ''} onChange={(e) => setForm({ ...form, radius: e.target.value === '' ? null : Number(e.target.value) })}>
            {RADII.map(([m, label]) => <option key={label} value={m ?? ''}>{m === null ? label : `کسانی که تا ${label} فاصله دارند`}</option>)}
          </select>}</Field>
        <button type="submit" className="btn primary wide" disabled={busy || form.name.trim().length < 3}>ساختن پیش‌نویس</button>
      </form>
      {note && <p className="note ok" role="status">{note}</p>}
      {error && <p className="note bad" role="alert">{error}</p>}
    </section>

    <section className="card">
      <header className="card-head"><h3>آفرها</h3></header>
      {offers === null ? <p className="empty">در حال خواندن…</p> : offers.length === 0 ? <p className="empty">هنوز آفری از پنل ساخته نشده.</p> :
        <ul className="offer-list">{offers.map((o) => {
          const live = o.status === 'PUBLISHED' && !o.expired;
          return <li key={o.versionId}>
            <div><strong>{o.name.replace(/\s*\(آزمایشی\)/, '')}</strong>{o.shortDescription && <small>{o.shortDescription}</small>}
              <small>{o.radiusMeters ? `شعاع ${radiusText(o.radiusMeters)}` : 'برای همه'}، {o.validUntil ? `تا ${jDate(o.validUntil.slice(0, 10))}` : 'بدون تاریخ پایان'}{o.priceAmount ? `، ${faNum(Number(o.priceAmount))} ریال` : ''}</small></div>
            <div className="offer-side">
              <span className={`badge ${live ? 'ok' : o.expired ? 'muted' : o.status === 'PUBLISHED' ? 'ok' : 'warn'}`}>{o.expired ? 'تمام‌شده' : o.status === 'PUBLISHED' ? 'منتشرشده' : o.status === 'WITHDRAWN' ? 'برداشته‌شده' : 'پیش‌نویس'}</span>
              {o.status !== 'PUBLISHED' && !o.expired && <button type="button" className="btn small" disabled={busy} onClick={() => void act(o, 'publish')}>انتشار</button>}
              {live && <button type="button" className="btn small ghost" disabled={busy} onClick={() => void act(o, 'withdraw')}>برداشتن</button>}
            </div>
          </li>;
        })}</ul>}
    </section>
  </div>;
}

