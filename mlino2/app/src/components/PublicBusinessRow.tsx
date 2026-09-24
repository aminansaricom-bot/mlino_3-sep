import { useEffect, useRef, useState } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import { openNow } from '../publicExport/businessHours';
import { activeOffersFor } from '../ar/ArGlassCard';
import { demoBusinessRating, displayName } from '../demo/demoSocial';
import { formatDistance } from '../uiFormat';
import Stars from './Stars';

const GLYPH: Record<string, string> = { cafe: '☕', restaurant: '🍽', retail_shop: '🛍', dental_clinic: '🦷', beauty_clinic: '💠' };

/**
 * ردیف فهرست اصلی: فقط چیزهایی که برای تصمیم کاربر مهم است — عکس، نام، امتیاز،
 * فاصله، باز/بسته و پیشنهاد فعال. کل ردیف یک دکمه است.
 */
export default function PublicBusinessRow({ record, catalog, distanceMeters, now, selected, featured, onOpen }: {
  record: PublicUiRecord; catalog?: CatalogRecord; distanceMeters?: number; now: number; selected?: boolean;
  /** D-78: paid placement while searching — always labelled, never hidden. */
  featured?: boolean; onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const cover = catalog?.items.find((item) => item.media.length > 0)?.media[0];
  const rating = demoBusinessRating(record.id);
  const offer = activeOffersFor(record, now, 1)[0];
  const hours = openNow(record, now);
  return <button ref={ref} className={`biz-row${selected ? ' selected' : ''}`} onClick={onOpen}>
    <span className="biz-row-media">
      {cover ? <CatalogImage media={cover} load={near} /> : <span className={`biz-row-glyph coin-${record.category.key}`} aria-hidden="true">{GLYPH[record.category.key] ?? '📍'}</span>}
      {offer && <span className="biz-row-offer">پیشنهاد</span>}
    </span>
    <span className="biz-row-copy">
      <strong>{displayName(record.name)}{featured && <span className="biz-row-featured" title="جایگاه ویژه‌ی پولی">ویژه</span>}</strong>
      <span className="biz-row-meta">
        {rating && <Stars rating={rating} compact />}
        {record.category.key !== 'uncategorized' && <span>{record.category.label}</span>}
        {distanceMeters !== undefined && <span>{formatDistance(distanceMeters)}</span>}
      </span>
      <span className="biz-row-meta">
        <span className={hours === 'open' ? 'open' : hours === 'closed' ? 'closed' : ''}>{hours === 'open' ? 'باز است' : hours === 'closed' ? 'بسته است' : 'ساعت نامشخص'}</span>
        {offer && <span className="biz-row-deal">{displayName(offer.name)}</span>}
      </span>
    </span>
  </button>;
}
