import { useEffect, useRef, useState } from 'react';
import { addAttachments, attachmentBlob, listAttachments, removeAttachment, ATTACHMENT_LIMITS, type AttachmentMeta } from '../../../attachments';
import { faNum } from '../../../format';

const kb = (n: number) => (n >= 1024 * 1024 ? `${faNum(Math.round((n / 1024 / 1024) * 10) / 10)} مگابایت` : `${faNum(Math.max(1, Math.round(n / 1024)))} کیلوبایت`);

/** File chooser used inside the record forms; files are saved only after the document posts. */
export function AttachPicker({ files, onChange }: { files: readonly File[]; onChange: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="attach-picker">
    <div className="attach-row">
      <button type="button" className="btn small" onClick={() => input.current?.click()} disabled={files.length >= ATTACHMENT_LIMITS.maxFiles}>📎 افزودن پیوست</button>
      <small>عکس فاکتور، رسید یا چک، یا PDF (حداکثر {faNum(ATTACHMENT_LIMITS.maxFiles)} فایل)</small>
    </div>
    <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden
      onChange={(e) => { const picked = [...(e.target.files ?? [])]; onChange([...files, ...picked].slice(0, ATTACHMENT_LIMITS.maxFiles)); e.target.value = ''; }} />
    {files.length > 0 && <ul className="attach-chips">
      {files.map((f, i) => <li key={`${f.name}-${i}`}>
        <span>{f.type === 'application/pdf' ? '📄' : '🖼️'} {f.name}</span><small>{kb(f.size)}</small>
        <button type="button" aria-label={`حذف ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}>✕</button>
      </li>)}
    </ul>}
  </div>;
}

/** Attachments of a posted document: preview, open, add more, remove. */
export function AttachmentList({ docId, onChanged, readOnly = false }: { docId: string; onChanged: () => void; readOnly?: boolean }) {
  const [items, setItems] = useState<AttachmentMeta[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const list = await listAttachments(docId);
    setItems(list);
    const urls: Record<string, string> = {};
    for (const a of list) {
      if (!a.type.startsWith('image/')) continue;
      const blob = await attachmentBlob(a.id);
      if (blob) urls[a.id] = URL.createObjectURL(blob);
    }
    setThumbs((old) => { Object.values(old).forEach((u) => URL.revokeObjectURL(u)); return urls; });
  };
  useEffect(() => { void reload(); return () => setThumbs((old) => { Object.values(old).forEach((u) => URL.revokeObjectURL(u)); return {}; }); }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (a: AttachmentMeta) => {
    const blob = await attachmentBlob(a.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.target = '_blank'; link.rel = 'noopener';
    if (a.type === 'application/pdf') link.download = a.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (items === null) return <p className="note">در حال خواندن پیوست‌ها…</p>;
  return <div className="attachments">
    <div className="attach-row"><strong>📎 پیوست‌ها ({faNum(items.length)})</strong>
      {!readOnly && items.length < ATTACHMENT_LIMITS.maxFiles && <button type="button" className="btn small" disabled={busy} onClick={() => input.current?.click()}>افزودن</button>}
    </div>
    <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={async (e) => {
      const picked = [...(e.target.files ?? [])]; e.target.value = '';
      if (!picked.length) return;
      setBusy(true);
      try {
        const r = await addAttachments(docId, picked);
        setMessage(r.rejected.length ? r.rejected.join(' — ') : `${faNum(r.added.length)} پیوست اضافه شد.`);
      } catch { setMessage('ذخیره‌ی پیوست روی این مرورگر ممکن نشد.'); }
      setBusy(false); await reload(); onChanged();
    }} />
    {items.length === 0 ? <p className="empty">این سند پیوستی ندارد.</p> :
      <ul className="attach-grid">
        {items.map((a) => <li key={a.id}>
          <button type="button" className="attach-thumb" onClick={() => void open(a)} aria-label={`باز کردن ${a.name}`}>
            {thumbs[a.id] ? <img src={thumbs[a.id]} alt="" /> : <span aria-hidden="true">📄</span>}
          </button>
          <span className="attach-name" title={a.name}>{a.name}</span>
          <small>{kb(a.size)}</small>
          {!readOnly && <button type="button" className="link danger" onClick={async () => {
            if (!window.confirm(`پیوست «${a.name}» حذف شود؟ خود سند تغییری نمی‌کند.`)) return;
            await removeAttachment(a.id); await reload(); onChanged();
          }}>حذف</button>}
        </li>)}
      </ul>}
    {message && <p className="note">{message}</p>}
  </div>;
}
