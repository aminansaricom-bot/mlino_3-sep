import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, apiErrorText } from '../../chat/api';
import { useChatSession } from '../../chat/session';
import { usePack } from '../../industry/context';
import { Badge, Field, Sheet } from '../../ui';
import { faNum } from '../../format';

// Products editing (Core catalog service). Everything made or changed here stays invisible to customers until a
// member with «انتشار» presses it (D-52); the list shows exactly what is live and what is waiting.

type Media = { id: string; path: string; alt: string };
type Item = {
  id: string; name: string; shortDescription: string | null; priceAmount: string | null; onRequest: boolean; groupingLabel: string | null;
  status: 'UNPUBLISHED' | 'PUBLISHED' | 'WITHDRAWN'; changed: boolean; media: Media[];
};
type Catalog = { items: Item[]; published: number; limit: number | null; photosEnabled: boolean };
type Draft = { name: string; shortDescription: string; priceAmount: string; groupingLabel: string };

const fa = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const rial = (v: string | null) => (v ? `${fa(Number(v).toLocaleString('en-US'))} ریال` : 'قیمت با پرسش');
const PHOTO_TEXT: Record<string, string> = {
  CATALOG_MEDIA_TYPE: 'فقط عکس JPG، PNG یا WebP پذیرفته می‌شود.',
  CATALOG_MEDIA_DIMENSIONS: 'عکس باید دست‌کم ۳۲۰ پیکسل در هر ضلع باشد.',
  CATALOG_MEDIA_SIZE: 'حجم عکس زیاد است.',
  CATALOG_MEDIA_METADATA: 'این عکس اطلاعات دوربین (مثل مکان) دارد و پذیرفته نشد.',
};

/**
 * Re-draws the photo on this device: at most 1600 px on the long side, JPEG. Drawing through a canvas drops every
 * piece of camera metadata (EXIF, including GPS position) before anything leaves the phone.
 */
async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('این فایل عکس خوانده نشد.'); });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale); const h = Math.round(bitmap.height * scale);
  if (w < 320 || h < 320) throw new Error('عکس باید دست‌کم ۳۲۰ پیکسل در هر ضلع باشد.');
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('این مرورگر عکس را آماده نمی‌کند.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  for (const q of [0.86, 0.78, 0.68, 0.58]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= 1_450_000) return blob;
  }
  throw new Error('حجم عکس زیاد است؛ عکس کوچک‌تری انتخاب کن.');
}

async function uploadPhoto(orgId: string, itemId: string, blob: Blob, alt: string): Promise<void> {
  const res = await fetch(`/api/biz/${orgId}/catalog/${itemId}/media`, {
    method: 'POST', credentials: 'same-origin', body: blob,
    headers: { 'content-type': 'application/octet-stream', 'x-mlino-csrf': '1', 'x-alt-text': encodeURIComponent(alt.slice(0, 190)) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string; reason?: string };
    throw new Error(PHOTO_TEXT[data.reason ?? ''] ?? apiErrorText(new ApiError(data.error ?? 'HTTP', res.status, data)));
  }
}

export default function ProductEditor() {
  const s = useChatSession();
  const { pack } = usePack();
  const orgId = s.org?.organizationId ?? null;
  const canPublish = s.can('publication.manage');
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    try { setData(await api<Catalog>('GET', `/biz/${orgId}/catalog`)); setError(null); } catch (e) { setError(apiErrorText(e)); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (what: () => Promise<unknown>, done: string) => {
    setBusy(true); setNote(null);
    try { await what(); setNote(done); await load(); } catch (e) { setNote(e instanceof Error && !(e instanceof ApiError) ? e.message : apiErrorText(e)); } finally { setBusy(false); }
  };

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of data?.items ?? []) map.set(it.groupingLabel ?? 'سایر', [...(map.get(it.groupingLabel ?? 'سایر') ?? []), it]);
    return [...map.entries()];
  }, [data]);
  const groupNames = groups.map(([g]) => g).filter((g) => g !== 'سایر');
  const current = editing && editing !== 'new' ? data?.items.find((i) => i.id === editing.id) ?? editing : null;

  return <div className="stack">
    <header className="page-head"><h1>{pack.catalogTitle}</h1>
      <button type="button" className="btn primary" onClick={() => setEditing('new')} disabled={busy}>+ افزودن {pack.item}</button></header>
    <p className="policy-note">هر تغییری اینجا اول پیش‌نویس است و مشتری‌ها نمی‌بینند؛ با «انتشار» روی همان مورد، تا حدود یک دقیقه در ملینو دیده می‌شود.{data?.limit != null ? ` پلن شما: ${faNum(data.published)} از ${faNum(data.limit)} ${pack.item} منتشرشده.` : ''}</p>
    {error && <p className="note bad">{error}</p>}
    {note && <p className="note" role="status">{note}</p>}
    {data && data.items.length === 0 && <p className="empty">هنوز {pack.item}ی ندارید. با «افزودن {pack.item}» شروع کن.</p>}
    {groups.map(([group, items]) => <section key={group} className="card">
      <header className="card-head"><h3>{group}</h3><small className="muted">{faNum(items.length)} مورد</small></header>
      <ul className="product-edit-list">{items.map((it) => <li key={it.id}>
        <button type="button" className="pe-thumb" onClick={() => setEditing(it)} aria-label={`ویرایش ${it.name}`}>
          {it.media[0] ? <img src={`/api/biz/${orgId}/${it.media[0].path}`} alt="" loading="lazy" /> : <span aria-hidden="true">📷</span>}
        </button>
        <div className="pe-body">
          <strong>{it.name}</strong>
          <small className="muted">{rial(it.priceAmount)}{it.shortDescription ? ` · ${it.shortDescription}` : ''}</small>
          <span className="pe-status">{it.status === 'PUBLISHED' ? (it.changed ? <Badge tone="warn">تغییرها منتشر نشده</Badge> : <Badge tone="ok">منتشرشده</Badge>) : it.status === 'WITHDRAWN' ? <Badge tone="muted">برداشته شده</Badge> : <Badge tone="info">پیش‌نویس</Badge>}</span>
        </div>
        <div className="pe-actions">
          <button type="button" className="btn small ghost" onClick={() => setEditing(it)} disabled={busy}>ویرایش</button>
          {canPublish && (it.status !== 'PUBLISHED' || it.changed) && <button type="button" className="btn small" disabled={busy}
            onClick={() => void run(() => api('POST', `/biz/${orgId}/catalog/${it.id}/publish`, {}), `«${it.name}» منتشر شد؛ تا حدود یک دقیقه‌ی دیگر مشتری‌ها می‌بینند.`)}>{it.status === 'PUBLISHED' ? 'انتشار تغییرها' : 'انتشار'}</button>}
          {canPublish && it.status === 'PUBLISHED' && <button type="button" className="btn small ghost" disabled={busy}
            onClick={() => { if (window.confirm(`«${it.name}» از دید مشتری‌ها برداشته شود؟`)) void run(() => api('POST', `/biz/${orgId}/catalog/${it.id}/withdraw`, {}), 'برداشته شد.'); }}>برداشتن</button>}
        </div>
      </li>)}</ul>
    </section>)}

    {editing && <ItemSheet key={editing === 'new' ? 'new' : editing.id} orgId={orgId!} item={editing === 'new' ? null : current} groups={groupNames} photos={!!data?.photosEnabled} itemWord={pack.item}
      onClose={() => setEditing(null)} onChanged={load} onDone={(msg) => { setEditing(null); setNote(msg); void load(); }} />}
  </div>;
}

function ItemSheet({ orgId, item, groups, photos, itemWord, onClose, onChanged, onDone }: {
  orgId: string; item: Item | null; groups: string[]; photos: boolean; itemWord: string;
  onClose: () => void; onChanged: () => Promise<void>; onDone: (msg: string) => void;
}) {
  const [d, setD] = useState<Draft>({ name: item?.name ?? '', shortDescription: item?.shortDescription ?? '', priceAmount: item?.priceAmount ? fa(Number(item.priceAmount).toLocaleString('en-US')) : '', groupingLabel: item?.groupingLabel ?? '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement | null>(null);
  const valid = d.name.trim().length >= 2;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const body = { name: d.name, shortDescription: d.shortDescription, priceAmount: d.priceAmount.trim(), groupingLabel: d.groupingLabel };
      if (item) { await api('POST', `/biz/${orgId}/catalog/${item.id}`, body); onDone(`تغییرها ذخیره شد${item.status === 'PUBLISHED' ? '؛ برای دیده شدن، «انتشار تغییرها» را بزن.' : '.'}`); }
      else { await api('POST', `/biz/${orgId}/catalog`, body); onDone(`«${d.name.trim()}» به‌صورت پیش‌نویس ساخته شد؛ عکس بگذار و بعد منتشرش کن.`); }
    } catch (e) { setMsg(apiErrorText(e)); } finally { setBusy(false); }
  };
  const addPhoto = async (f: File | undefined) => {
    if (!f || !item) return;
    setBusy(true); setMsg('در حال آماده کردن عکس…');
    try { const blob = await preparePhoto(f); await uploadPhoto(orgId, item.id, blob, item.name); await onChanged(); setMsg('عکس اضافه شد.'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'عکس اضافه نشد.'); }
    finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const removePhoto = async (m: Media) => {
    if (!item || !window.confirm('این عکس برداشته شود؟')) return;
    setBusy(true);
    try { await api('POST', `/biz/${orgId}/catalog/${item.id}/media/${m.id}/remove`, {}); await onChanged(); setMsg('عکس برداشته شد.'); } catch (e) { setMsg(apiErrorText(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!item || !window.confirm(`«${item.name}» از فهرست حذف شود؟ اگر منتشر شده، اول از دید مشتری‌ها برداشته می‌شود.`)) return;
    setBusy(true);
    try { await api('POST', `/biz/${orgId}/catalog/${item.id}/retire`, {}); onDone(`«${item.name}» حذف شد.`); } catch (e) { setMsg(apiErrorText(e)); setBusy(false); }
  };

  return <Sheet title={item ? `ویرایش ${item.name}` : `${itemWord} تازه`} onClose={onClose}>
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (valid) void save(); }}>
      <Field label="نام">{(id) => <input id={id} value={d.name} maxLength={120} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Field>
      <Field label="توضیح کوتاه (اختیاری)">{(id) => <textarea id={id} rows={3} value={d.shortDescription} maxLength={400} onChange={(e) => setD({ ...d, shortDescription: e.target.value })} />}</Field>
      <Field label="قیمت (ریال)" hint="خالی بگذاری، «قیمت با پرسش» نشان داده می‌شود.">{(id) => <input id={id} inputMode="numeric" dir="ltr" value={d.priceAmount} onChange={(e) => setD({ ...d, priceAmount: e.target.value })} placeholder="مثلاً ۲۹۰٬۰۰۰" />}</Field>
      <Field label="دسته (اختیاری)">{(id) => <><input id={id} list="pe-groups" value={d.groupingLabel} maxLength={60} onChange={(e) => setD({ ...d, groupingLabel: e.target.value })} /><datalist id="pe-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist></>}</Field>
      <div className="submit"><button type="submit" className="btn primary wide" disabled={busy || !valid}>{item ? 'ذخیره‌ی تغییرها' : 'ساختن پیش‌نویس'}</button></div>
    </form>

    {item && photos && <section className="pe-photos">
      <h4>عکس‌ها</h4>
      <p className="muted">عکس روی همین گوشی کوچک و بازسازی می‌شود و اطلاعات دوربین (مثل مکان) از آن پاک می‌شود. اولین عکس، عکس اصلی است.</p>
      <div className="pe-photo-grid">
        {item.media.map((m) => <figure key={m.id}><img src={`/api/biz/${orgId}/${m.path}`} alt={m.alt} /><button type="button" onClick={() => void removePhoto(m)} disabled={busy} aria-label="برداشتن عکس">×</button></figure>)}
        {item.media.length < 8 && <label className={`pe-photo-add${busy ? ' busy' : ''}`}><input ref={file} type="file" accept="image/*" onChange={(e) => void addPhoto(e.target.files?.[0])} disabled={busy} /><span>+ عکس</span></label>}
      </div>
    </section>}
    {!item && <p className="muted">بعد از ساختن، می‌توانی عکس هم اضافه کنی.</p>}
    {msg && <p className="note" role="status">{msg}</p>}
    {item && <button type="button" className="btn small ghost danger" onClick={() => void remove()} disabled={busy}>حذف {itemWord} از فهرست</button>}
  </Sheet>;
}
