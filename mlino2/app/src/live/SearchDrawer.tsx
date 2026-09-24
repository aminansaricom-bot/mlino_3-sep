import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import LiveIcon from './icons';
import { CATEGORY_GROUPS, searchProducts, type CategoryGroup, type SearchHit } from './liveData';

// «چی می‌خوای پیدا کنی؟» — opens from the right (RTL). Search text is shared with the map; choosing a result only
// selects it (no purchase, no message). Focus stays inside while open; Escape or ✕ closes and focus goes back.

export default function SearchDrawer({ records, catalogs, query, onQuery, group, onGroup, onPick, onClose }: {
  records: readonly PublicUiRecord[]; catalogs: ReadonlyMap<string, CatalogRecord>;
  query: string; onQuery: (q: string) => void; group: CategoryGroup; onGroup: (g: CategoryGroup) => void;
  onPick: (hit: SearchHit) => void; onClose: () => void;
}) {
  const [text, setText] = useState(query);
  const [debounced, setDebounced] = useState(query);
  const panel = useRef<HTMLDivElement | null>(null);
  const back = useRef<Element | null>(null);

  useEffect(() => { const t = window.setTimeout(() => setDebounced(text), 250); return () => window.clearTimeout(t); }, [text]);
  const hits = useMemo(() => searchProducts(records, catalogs, debounced, group), [records, catalogs, debounced, group]);

  useEffect(() => {
    back.current = document.activeElement;
    panel.current?.querySelector<HTMLInputElement>('input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input')];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); (back.current as HTMLElement | null)?.focus?.(); };
  }, [onClose]);

  const apply = () => { onQuery(text); onClose(); };

  return <div className="lv-scrim" onClick={onClose}>
    <div ref={panel} className="lv-drawer" role="dialog" aria-modal="true" aria-labelledby="lv-drawer-title" onClick={(e) => e.stopPropagation()}>
      <header className="lv-drawer-head">
        <h2 id="lv-drawer-title">چی می‌خوای پیدا کنی؟</h2>
        <button type="button" className="lv-iconbtn plain" onClick={onClose} aria-label="بستن منو"><LiveIcon name="close" /></button>
      </header>
      <label className="lv-search">
        <LiveIcon name="search" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً قهوه، کیک، کتاب…" aria-label="جست‌وجوی محصول" enterKeyHint="search"
          onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} />
        {text && <button type="button" className="lv-clear" onClick={() => { setText(''); onQuery(''); }} aria-label="پاک کردن جست‌وجو"><LiveIcon name="close" size={16} /></button>}
      </label>

      <h3 className="lv-drawer-sub">دسته‌بندی کسب‌وکارها</h3>
      <div className="lv-cats" role="group" aria-label="دسته‌بندی کسب‌وکارها">
        {CATEGORY_GROUPS.map((c) => <button key={c.id} type="button" className={`lv-cat${group === c.id ? ' on' : ''}`} aria-pressed={group === c.id} onClick={() => onGroup(c.id)}>
          <LiveIcon name={c.icon} /><span>{c.label}</span>
        </button>)}
      </div>

      <h3 className="lv-drawer-sub">محصولات مرتبط</h3>
      <ul className="lv-hits" aria-live="polite">
        {hits.length === 0 && <li className="lv-empty-row">محصولی برای این انتخاب پیدا نشد.{(text || group !== 'all') && <button type="button" className="lv-linkbtn" onClick={() => { setText(''); onGroup('all'); }}>پاک کردن فیلتر</button>}</li>}
        {hits.slice(0, 12).map((hit) => <li key={`${hit.businessId}:${hit.item.catalog_item_id}`}>
          <button type="button" className="lv-hit" onClick={() => { onQuery(text); onPick(hit); }}>
            <span className="lv-hit-img">{hit.item.media[0] ? <CatalogImage media={hit.item.media[0]} load /> : <img src="/icons/placeholder-product.svg" alt="" />}</span>
            <span className="lv-hit-copy"><strong>{hit.item.name.replace(/\s*\(آزمایشی\)/g, '')}</strong><small>{hit.businessName}</small></span>
          </button>
        </li>)}
      </ul>
      <button type="button" className="lv-primary wide" onClick={apply}>نمایش روی دوربین</button>
    </div>
  </div>;
}
