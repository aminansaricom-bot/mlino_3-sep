import { useEffect, useRef, useState } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { openNow } from '../publicExport/businessHours';
import { Icon } from '../design/Icon';
import ShareBusinessAction from '../experience/ShareBusinessAction';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { CatalogImage, catalogPrice } from '../publicExport/catalogCards';
import type { LocalExperience } from '../experience/useLocalExperience';
import { activeOffersFor, offerPriceLabel } from '../ar/ArGlassCard';
import { demoBusinessRating, displayName } from '../demo/demoSocial';
import { formatDistance } from '../uiFormat';
import Stars from './Stars';
import { ChatBubbleIcon } from '../chat/ChatPanel';

interface Props {
  record: PublicUiRecord;
  catalog?: CatalogRecord;
  now: number;
  distanceMeters?: number;
  experience: LocalExperience;
  onClose: () => void;
  onToggle: (key: 'saved' | 'later' | 'liked' | 'hidden', id: string) => void;
  onOpenItem: (item: CatalogItem) => void;
  /** گفتگو با کسب‌وکار (D-73)؛ فقط وقتی ساخت با VITE_CHAT=1 باشد. */
  onMessage?: () => void;
}

/** Directions in the phone's own map app (Neshan, Balad, Google…) on Android; a web map elsewhere. */
export function directionsUrl(lat: number, lng: number, label: string): string {
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  return android ? `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** «تا ۱۱ دی» — فقط روز و ماه؛ ساعت برای کاربر اهمیتی ندارد. */
export function offerUntil(iso: string | null): string {
  if (!iso) return 'بدون تاریخ پایان';
  try { return `تا ${new Date(iso).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })}`; }
  catch { return ''; }
}

/** ردیف منو: متن در سمت راست، عکس کوچک در سمت چپ؛ عکس فقط وقتی به صفحه نزدیک شد بار می‌شود. */
function MenuRow({ item, onOpen }: { item: CatalogItem; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: '240px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <button ref={ref} className="menu-row" onClick={onOpen}>
    <span className="menu-copy">
      <strong>{displayName(item.name)}</strong>
      {item.short_description && <span className="menu-desc">{item.short_description}</span>}
      <span className="menu-price">{catalogPrice(item)}</span>
    </span>
    <span className="menu-thumb"><CatalogImage media={item.media[0]} load={near} /></span>
  </button>;
}

export default function PublicBusinessDetails({ record, catalog, now, distanceMeters, experience, onClose, onToggle, onOpenItem, onMessage }: Props) {
  const hours = openNow(record, now);
  const rating = demoBusinessRating(record.id);
  const offers = activeOffersFor(record, now, 10);
  const items = catalog?.items ?? [];
  const groups: { label: string; items: CatalogItem[] }[] = [];
  for (const item of items) {
    const label = item.grouping_label ?? 'محصولات';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item); else groups.push({ label, items: [item] });
  }
  const saved = experience.saved.includes(record.id);
  return <section className="panel biz-page" aria-label={displayName(record.name)}>
    <header className="biz-hero">
      <button className="hero-btn" onClick={onClose} aria-label="بستن"><Icon name="close" /></button>
      <div className="hero-actions">
        <button className={`hero-btn${saved ? ' on' : ''}`} onClick={() => onToggle('saved', record.id)} aria-label={saved ? 'ذخیره شد' : 'ذخیره'} aria-pressed={saved}><Icon name="bookmark" /></button>
        <ShareBusinessAction record={record} />
      </div>
      <span className={`hero-coin coin-${record.category.key}`} aria-hidden="true">{displayName(record.name).trim().charAt(0)}</span>
      <h2>{displayName(record.name)}</h2>
      <div className="hero-meta">
        {rating && <Stars rating={rating} compact />}
        {record.category.key !== 'uncategorized' && <span>{record.category.label}</span>}
        {distanceMeters !== undefined && <span>{formatDistance(distanceMeters)}</span>}
        <span className={hours === 'open' ? 'open' : hours === 'closed' ? 'closed' : ''}>{hours === 'open' ? 'باز است' : hours === 'closed' ? 'بسته است' : 'ساعت نامشخص'}</span>
      </div>
      <div className="biz-cta">
        {onMessage && <button className="biz-message-btn" onClick={onMessage}><ChatBubbleIcon />پیام به کسب‌وکار</button>}
        {record.coordinates && <a className="biz-action" href={directionsUrl(record.coordinates.latitude, record.coordinates.longitude, displayName(record.name))} target="_blank" rel="noopener noreferrer"><Icon name="route" />مسیریابی</a>}
        {record.contactInformation?.public_phone && <a className="biz-action" href={`tel:${record.contactInformation.public_phone}`}>تماس</a>}
      </div>
    </header>

    <div className="panel-body biz-page-body">
      {offers.length > 0 && <section className="offer-strip" aria-label="پیشنهادها">
        {offers.map((offer) => <div className="offer-pill" key={offer.offer_version_id}>
          <span className="offer-pill-badge"><Icon name="gift" /></span>
          <span className="offer-pill-copy"><strong>{displayName(offer.name)}</strong>
            <small>{offerPriceLabel(offer)} · {offerUntil(offer.valid_until)}</small></span>
        </div>)}
      </section>}

      {groups.length > 0 ? groups.map((group) => <section key={group.label} className="menu-group">
        <h3>{group.label}</h3>
        {group.items.map((item) => <MenuRow key={item.catalog_item_id} item={item} onOpen={() => onOpenItem(item)} />)}
      </section>) : <>
        {record.description && <p className="biz-about">{record.description}</p>}
        {record.capabilities.length > 0 && <div className="biz-tags">{record.capabilities.map((item) => <span key={item.capability_id}>{item.name}</span>)}</div>}
      </>}

      {(record.addressText || record.contactInformation?.public_phone) && <section className="biz-info">
        {record.addressText && <p><Icon name="route" /> {record.addressText}</p>}
        {record.contactInformation?.public_phone && <p><a href={`tel:${record.contactInformation.public_phone}`}>{record.contactInformation.public_phone}</a></p>}
      </section>}
      {record.stale && <p className="biz-stale" role="status">این اطلاعات از آخرین نسخهٔ معتبر نمایش داده می‌شود.</p>}
    </div>
  </section>;
}
