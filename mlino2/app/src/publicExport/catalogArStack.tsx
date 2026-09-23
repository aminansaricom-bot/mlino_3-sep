import { useEffect, useRef, useState } from 'react';
import type { CatalogItem, CatalogRecord } from './catalog';
import { CatalogImage, catalogPrice } from './catalogCards';

export function swipeIndex(current: number, direction: number, length: number): number {
  return length < 1 ? 0 : Math.max(0, Math.min(length - 1, current + Math.sign(direction)));
}

export default function CatalogArStack({ record, onOpenItem }: { record?: CatalogRecord; onOpenItem?: (item: CatalogItem) => void }) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => setIndex(0), [record?.organization_id]);
  const items = record?.items ?? [];
  if (!items.length) return null;
  const active = Math.min(index, items.length - 1);
  const item = items[active];
  return <div className="catalog-ar-stack" role="region" tabIndex={0} aria-label="ویترین کاتالوگ"
    onPointerDown={(event) => { start.current = event.clientX; }}
    onPointerUp={(event) => {
      if (start.current !== null && Math.abs(event.clientX - start.current) > 35)
        setIndex((value) => swipeIndex(value, event.clientX < start.current! ? 1 : -1, items.length));
      start.current = null;
    }}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((value) => swipeIndex(value, event.key === 'ArrowLeft' ? 1 : -1, items.length));
      }
    }}>
    <div className="catalog-ar-image"><CatalogImage key={item.catalog_item_id} media={item.media[0]} load /></div>
    <button type="button" className="catalog-ar-open" onClick={() => onOpenItem?.(item)} disabled={!onOpenItem} aria-label={`مشاهدهٔ ${item.name}`}>
    <div className="catalog-ar-copy"><strong>{item.name.replace('(آزمایشی)', '').trim()}</strong>
      <span>{catalogPrice(item)}</span>
      <small>{(active + 1).toLocaleString('fa-IR')} از {items.length.toLocaleString('fa-IR')} · برای جزئیات بزن</small>
    </div>
    </button>
    <div className="catalog-ar-controls">
      <button type="button" aria-label="مورد قبلی" disabled={active === 0} onClick={() => setIndex((value) => swipeIndex(value, -1, items.length))}>→</button>
      <button type="button" aria-label="مورد بعدی" disabled={active === items.length - 1} onClick={() => setIndex((value) => swipeIndex(value, 1, items.length))}>←</button>
    </div>
    {items[active + 1] && <div hidden><CatalogImage media={items[active + 1].media[0]} load /></div>}
  </div>;
}
