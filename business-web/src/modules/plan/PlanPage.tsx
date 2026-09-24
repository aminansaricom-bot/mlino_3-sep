import { useCallback, useEffect, useState } from 'react';
import { useChatSession } from '../../chat/session';
import LoginCard from '../../chat/LoginCard';
import { api, apiErrorText } from '../../chat/api';
import { faNum } from '../../format';

// Plans (D-76). A plan is an entitlement — quotas and features — never authority: who may act is still decided by
// membership and grant. No payment gateway yet: switching is a labelled demo action.

export type Tier = 'FREE' | 'PRO' | 'MAX';
export type Limits = { publishedCatalogItems: number | null; offersPerMonth: number | null; chatAutoReply: boolean; searchPromotion: boolean; offerPush: boolean };
export type PlanView = { tier: Tier; limits: Limits; usage: { publishedCatalogItems: number; offersThisMonth: number }; tiers?: Array<{ tier: Tier; limits: Limits }> };

export const TIER_LABEL: Record<Tier, string> = { FREE: 'رایگان', PRO: 'پرو', MAX: 'مکس' };
const cap = (n: number | null, unit: string) => (n === null ? 'نامحدود' : `${faNum(n)} ${unit}`);

export function usePlan(orgId: string | null) {
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!orgId) return;
    try { setPlan(await api<PlanView>('GET', `/biz/${orgId}/plan`)); setError(null); } catch (e) { setError(apiErrorText(e)); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);
  return { plan, error, reload: load };
}

export default function PlanPage() {
  const s = useChatSession();
  const { plan, error, reload } = usePlan(s.org?.organizationId ?? null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const change = async (tier: Tier) => {
    if (!s.org || !plan || tier === plan.tier) return;
    if (!window.confirm(`پلن به «${TIER_LABEL[tier]}» تغییر کند؟ این نسخه‌ی نمایشی است و پرداختی انجام نمی‌شود.`)) return;
    setBusy(true); setNote(null);
    try { await api('POST', `/biz/${s.org.organizationId}/plan`, { tier }); await reload(); await s.refreshSummary(); setNote(`پلن «${TIER_LABEL[tier]}» فعال شد.`); }
    catch (e) { setNote(apiErrorText(e)); } finally { setBusy(false); }
  };

  return <div className="stack">
    <header className="page-head"><h1>پلن و اشتراک</h1><span className="badge info">هسته</span></header>
    {!s.ready ? <p className="empty">در حال بررسی ورود…</p>
      : !s.me ? <LoginCard config={s.config} onDone={() => void s.refresh()} hint="شماره‌ی آزمایشیِ عضو کسب‌وکارهای نمایشی: ۰۹۰۰۰۰۰۰۰۹۰." />
      : !s.org ? <p className="empty">این شماره عضو هیچ کسب‌وکار منتشرشده‌ای نیست.</p>
      : <>
        <p className="policy-note">پلن فقط سقف‌ها و امکانات را تعیین می‌کند؛ اینکه چه کسی می‌تواند کاری انجام دهد همچنان با عضویت و اجازه‌هاست. پرداخت هنوز وصل نیست؛ تغییر پلن در این نسخه نمایشی است.</p>
        {error && <p className="note bad">{error}</p>}
        {plan && <section className="card">
          <header className="card-head"><h3>مصرف این ماه</h3><span className="badge ok">پلن {TIER_LABEL[plan.tier]}</span></header>
          <ul className="rows">
            <li><span>آفر و تخفیف منتشرشده در این ماه</span><b>{faNum(plan.usage.offersThisMonth)} از {cap(plan.limits.offersPerMonth, '')}</b></li>
            <li><span>محصول منتشرشده</span><b>{faNum(plan.usage.publishedCatalogItems)} از {cap(plan.limits.publishedCatalogItems, '')}</b></li>
          </ul>
        </section>}
        {plan?.tiers && <div className="plan-grid">{plan.tiers.map((t) => <section key={t.tier} className={`card plan-card${t.tier === plan.tier ? ' current' : ''}`}>
          <header className="card-head"><h3>{TIER_LABEL[t.tier]}</h3>{t.tier === plan.tier && <span className="badge ok">فعلی</span>}</header>
          <ul className="points">
            <li>محصول: {cap(t.limits.publishedCatalogItems, 'قلم')}</li>
            <li>آفر و تخفیف: {cap(t.limits.offersPerMonth, 'در ماه')}</li>
            <li>پاسخ‌گوی خودکار در گفتگو: {t.limits.chatAutoReply ? 'دارد' : 'ندارد'}</li>
            <li>اولویت در جست‌وجوی V2 با برچسب «ویژه»: {t.limits.searchPromotion ? 'دارد' : 'ندارد'}</li>
            <li>اعلان آفر به کاربران داخل شعاع: {t.limits.offerPush ? 'دارد' : 'ندارد (فقط نمایش روی نقشه)'}</li>
          </ul>
          {t.tier !== plan.tier && s.can('plan.manage') && <button type="button" className="btn small" disabled={busy} onClick={() => void change(t.tier)}>انتخاب (نمایشی)</button>}
        </section>)}</div>}
        {!s.can('plan.manage') && <p className="note">تغییر پلن با کسی است که اجازه‌ی «تغییر پلن» دارد.</p>}
        {note && <p className="note" role="status">{note}</p>}
      </>}
  </div>;
}
