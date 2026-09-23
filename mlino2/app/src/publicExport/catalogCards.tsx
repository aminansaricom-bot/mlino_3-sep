import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../uiFormat';
import type { CatalogItem, CatalogMedia, CatalogRecord } from './catalog';
import { loadCatalogMedia } from './catalogMedia';

export function visiblePlusNext(visible: readonly number[], total: number): number[] {
  const selected = new Set<number>();
  for (const index of visible) {
    if (index >= 0 && index < total) selected.add(index);
    if (index + 1 < total) selected.add(index + 1);
  }
  return [...selected].sort((a, b) => a - b);
}

export function CatalogImage({ media, load }: { media?: CatalogMedia; load: boolean }) {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null);
  // هر به‌روزرسانی فایل کاتالوگ (هر ۶۰ ثانیه) شیء media تازه‌ای می‌سازد. اگر اثر به خود
  // شیء وابسته باشد، تصویر هر بار دوباره بار می‌شود و چشمک می‌زند؛ پس کلید، مسیر
  // محتواآدرس‌پذیر است که با هر تغییر بایت‌ها عوض می‌شود و در غیر این صورت ثابت است.
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const mediaKey = media ? `${media.path}|${media.byte_size}` : null;
  useEffect(() => {
    const current = mediaRef.current;
    if (!current || !load) return;
    let alive = true;
    let objectUrl: string | null = null;
    void loadCatalogMedia(current).then((result) => {
      objectUrl = result.url;
      if (alive) setLoaded(result.url ? { path: current.path, url: result.url } : null);
      else if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaKey, load]);
  const src = loaded && loaded.path === media?.path ? loaded.url : null;
  if (!src) return <div className="catalog-image-placeholder" role="img" aria-label={media?.alt_text ?? 'تصویر ثبت نشده'}>
    <span aria-hidden="true">◇</span><small>{media?.alt_text ?? 'تصویر ثبت نشده'}</small>
  </div>;
  return <img className="catalog-image" src={src} alt={media?.alt_text ?? ''} />;
}

export function catalogPrice(item: CatalogItem): string {
  if (item.on_request) return 'قیمت با درخواست';
  if (item.price_amount === null) return 'قیمت عمومی ثبت نشده';
  const amount = Number(item.price_amount);
  return Number.isFinite(amount) ? formatPrice(amount, item.price_currency) +
    (item.price_currency && item.price_currency !== 'IRR' ? ` ${item.price_currency}` : '') : 'قیمت عمومی ثبت نشده';
}

function CatalogCard({ item, index, shouldLoad }: { item: CatalogItem; index: number; shouldLoad: (index: number) => boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(index === 0); return; }
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)), { rootMargin: '100px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [index]);
  return <article ref={ref} className="catalog-card" data-catalog-index={index} data-visible={visible}>
    <CatalogImage media={item.media[0]} load={visible || shouldLoad(index)} />
    <div className="catalog-card-copy"><strong>{item.name}</strong>
      {item.short_description && <p>{item.short_description}</p>}
      <span className="catalog-price">{catalogPrice(item)}</span>
    </div>
  </article>;
}

export function CatalogSection({ record }: { record?: CatalogRecord }) {
  const [seen, setSeen] = useState<number[]>([]);
  const items = record?.items ?? [];
  // Visible-card tracking is centralized so only visible cards and their immediate successor load.
  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      setSeen((old) => {
        const next = new Set(old);
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.catalogIndex);
          if (entry.isIntersecting) next.add(index); else next.delete(index);
        }
        return [...next];
      });
    }, { rootMargin: '100px' });
    for (const element of document.querySelectorAll('[data-catalog-index]')) observer.observe(element);
    return () => observer.disconnect();
  }, [items.length]);
  if (!items.length) return null;
  const loads = visiblePlusNext(typeof IntersectionObserver === 'undefined' ? [0] : seen, items.length);
  let previous: string | null | undefined;
  return <section className="catalog-section" aria-label="کاتالوگ کسب‌وکار">
    <h3 className="section-title">کاتالوگ</h3>
    {items.map((item, index) => {
      const label = item.grouping_label;
      const heading = label !== previous;
      previous = label;
      return <div key={item.catalog_item_id}>
        {heading && label && <h4 className="catalog-group-heading">{label}</h4>}
        <CatalogCard item={item} index={index} shouldLoad={(i) => loads.includes(i)} />
      </div>;
    })}
  </section>;
}
