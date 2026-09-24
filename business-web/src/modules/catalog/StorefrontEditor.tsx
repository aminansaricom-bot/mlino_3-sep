import { useCallback, useEffect, useState } from 'react';
import { api, apiErrorText } from '../../chat/api';
import { useChatSession } from '../../chat/session';
import { Badge, Field } from '../../ui';

// Storefront editing (Core business profile). Saved changes wait for «انتشار» (D-52). The name is not edited here:
// changing a business's public name goes with checking who the business is (D-61).

type Interval = { open: string; close: string };
type Hours = { weekly: { day: number; intervals: Interval[] }[] } | null;
type Profile = {
  id: string; name: string; description: string | null; addressText: string | null; publicPhone: string | null;
  website: string | null; social: string[]; businessHours: Hours; status: 'UNPUBLISHED' | 'PUBLISHED' | 'WITHDRAWN'; changed: boolean;
};
type DayRow = { day: number; open: boolean; from: string; to: string };

const DAYS = ['', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function rowsFrom(h: Hours): DayRow[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => {
    const iv = h?.weekly.find((w) => w.day === day)?.intervals[0];
    return { day, open: !!iv, from: iv?.open ?? '09:00', to: iv?.close ?? '22:00' };
  });
}

export default function StorefrontEditor() {
  const s = useChatSession();
  const orgId = s.org?.organizationId ?? null;
  const canPublish = s.can('publication.manage');
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [form, setForm] = useState({ description: '', addressText: '', publicPhone: '', website: '', instagram: '' });
  const [days, setDays] = useState<DayRow[]>(rowsFrom(null));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const r = await api<{ profile: Profile | null }>('GET', `/biz/${orgId}/profile`);
      setP(r.profile);
      if (r.profile) {
        setForm({ description: r.profile.description ?? '', addressText: r.profile.addressText ?? '', publicPhone: r.profile.publicPhone ?? '', website: r.profile.website ?? '', instagram: r.profile.social[0] ?? '' });
        setDays(rowsFrom(r.profile.businessHours));
      }
    } catch (e) { setNote(apiErrorText(e)); setP(null); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  if (p === undefined) return <p className="empty">در حال خواندن ویترین…</p>;
  if (p === null) return <p className="empty">برای این کسب‌وکار هنوز ویترینی ساخته نشده است.</p>;

  const save = async () => {
    setBusy(true); setNote(null);
    try {
      await api('POST', `/biz/${orgId}/profile/${p.id}`, {
        description: form.description, addressText: form.addressText, publicPhone: form.publicPhone, website: form.website,
        social: form.instagram.trim() ? [form.instagram.trim()] : [],
        businessHours: { weekly: days.map((d) => ({ day: d.day, intervals: d.open ? [{ open: d.from, close: d.to }] : [] })) },
      });
      await load();
      setNote(p.status === 'PUBLISHED' || p.status === 'WITHDRAWN' ? 'ذخیره شد؛ برای دیده شدن، «انتشار ویترین» را بزن.' : 'ذخیره شد.');
    } catch (e) { setNote(apiErrorText(e)); } finally { setBusy(false); }
  };
  const publish = async () => {
    setBusy(true); setNote(null);
    try { await api('POST', `/biz/${orgId}/profile/${p.id}/publish`, {}); await load(); setNote('ویترین منتشر شد؛ تا حدود یک دقیقه‌ی دیگر مشتری‌ها می‌بینند.'); }
    catch (e) { setNote(apiErrorText(e)); } finally { setBusy(false); }
  };
  const set = (day: number, patch: Partial<DayRow>) => setDays(days.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  const copyFirst = () => { const first = days.find((d) => d.open) ?? days[0]; setDays(days.map((d) => ({ ...d, open: first.open, from: first.from, to: first.to }))); };
  const dirty = p.status !== 'PUBLISHED' || p.changed;

  return <section className="card sf-editor">
    <header className="card-head"><h3>ویرایش ویترین</h3>
      {p.status === 'PUBLISHED' ? (p.changed ? <Badge tone="warn">تغییرها منتشر نشده</Badge> : <Badge tone="ok">منتشرشده</Badge>) : <Badge tone="info">منتشر نشده</Badge>}</header>
    {!open ? <div className="row-end"><button type="button" className="btn small" onClick={() => setOpen(true)}>ویرایش توضیح، ساعت کاری و راه‌های تماس</button>
      {canPublish && dirty && <button type="button" className="btn small primary" onClick={() => void publish()} disabled={busy}>انتشار ویترین</button>}</div>
      : <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <p className="muted">نام «{p.name.replace(/\s*\(آزمایشی\)/, '')}» از اینجا عوض نمی‌شود؛ تغییر نام با بررسی هویت کسب‌وکار است.</p>
        <Field label="توضیح کوتاه ویترین">{(id) => <textarea id={id} rows={3} maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثلاً «برگر و ساندویچ با نان تازه، هر روز»" />}</Field>
        <Field label="نشانی">{(id) => <input id={id} maxLength={200} value={form.addressText} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />}</Field>
        <Field label="تلفن عمومی" hint="همین شماره برای مشتری‌ها با دکمه‌ی «تماس» نشان داده می‌شود.">{(id) => <input id={id} dir="ltr" inputMode="tel" maxLength={20} value={form.publicPhone} onChange={(e) => setForm({ ...form, publicPhone: e.target.value })} placeholder="021…" />}</Field>
        <Field label="وب‌سایت (اختیاری)">{(id) => <input id={id} dir="ltr" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />}</Field>
        <Field label="اینستاگرام (اختیاری)">{(id) => <input id={id} dir="ltr" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/…" />}</Field>
        <fieldset className="hours-edit">
          <legend>ساعت کاری</legend>
          {days.map((d) => <div key={d.day} className={`hours-row${d.open ? '' : ' closed'}`}>
            <label className="check"><input type="checkbox" checked={d.open} onChange={(e) => set(d.day, { open: e.target.checked })} /> {DAYS[d.day]}</label>
            {d.open ? <span className="hours-times">
              <input type="time" aria-label={`شروع ${DAYS[d.day]}`} value={d.from} onChange={(e) => set(d.day, { from: e.target.value })} />
              <span aria-hidden="true">تا</span>
              <input type="time" aria-label={`پایان ${DAYS[d.day]}`} value={d.to} onChange={(e) => set(d.day, { to: e.target.value })} />
            </span> : <span className="muted">تعطیل</span>}
          </div>)}
          <button type="button" className="link" onClick={copyFirst}>همین ساعت برای همه‌ی روزها</button>
        </fieldset>
        <div className="row-end">
          <button type="submit" className="btn primary" disabled={busy}>ذخیره</button>
          {canPublish && <button type="button" className="btn" onClick={() => void publish()} disabled={busy || !dirty}>انتشار ویترین</button>}
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>بستن</button>
        </div>
        <p className="muted">ذخیره فقط پیش‌نویس است؛ مشتری‌ها بعد از «انتشار ویترین» تغییر را می‌بینند.</p>
      </form>}
    {note && <p className="note" role="status">{note}</p>}
  </section>;
}
