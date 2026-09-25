import { useEffect } from 'react';
import type { CatalogItem } from './catalog';
import { CatalogImage, catalogPrice } from './catalogCards';
import { demoProductReviews, displayName } from '../demo/demoSocial';
import { RateProduct, RatingBadge, useRatings } from '../ratings/ratings';
import { Icon } from '../design/Icon';
import { tr, numberLocale } from '../i18n';
import { Button } from '../design/ui';
import LiveIcon from '../live/icons';

/**
 * صفحه‌ی محصول: عکس بزرگ، نام، قیمت، توضیح، و زیر آن نظرهای کاربران
 * (در ساخت نمایشی، نظرهای نمونه با برچسب روشن). عکس همان مسیر سنجیده‌شده‌ی
 * کاتالوگ را دارد؛ هیچ تصویری بدون سنجش اثرانگشت نمایش داده نمی‌شود.
 */
export default function ProductPage({ item, businessName, organizationId, onClose, saved = false, onToggleSave, onAsk }: {
  item: CatalogItem; businessName: string; organizationId?: string; onClose: () => void;
  /** Saved on this phone («ذخیره‌ها»). */ saved?: boolean; onToggleSave?: () => void;
  /** Opens a conversation with the business (chat enabled only). */ onAsk?: () => void;
}) {
  const { reviews } = demoProductReviews(item.name);
  const ratings = useRatings(organizationId);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <section className="product-page" role="dialog" aria-modal="true" aria-label={displayName(item.name)}>
    <div className="product-hero">
      <CatalogImage key={item.catalog_item_id} media={item.media[0]} load />
      <button className="product-back" onClick={onClose} aria-label={tr('بازگشت')}><Icon name="close" /></button>
      <RatingBadge summary={ratings.items[item.catalog_item_id]} className="on-hero" />
      {onToggleSave && <button type="button" className={`product-save${saved ? ' on' : ''}`} onClick={onToggleSave} aria-pressed={saved}
        aria-label={saved ? tr('برداشتن از ذخیره‌ها') : tr('ذخیره')}><LiveIcon name="bookmark" size={22} /></button>}
    </div>
    <div className="product-body">
      <div className="product-from">{businessName}</div>
      <h2 className="product-title">{displayName(item.name)}</h2>
      <div className="product-meta">
        <span className="product-price">{catalogPrice(item)}</span>
        {item.grouping_label && <span className="product-group">{item.grouping_label}</span>}
      </div>
      {organizationId && <RateProduct orgId={organizationId} itemId={item.catalog_item_id} />}
      {item.short_description && <p className="product-desc">{item.short_description}</p>}
      {onAsk && <Button wide variant="secondary" icon="chat" onClick={onAsk}>{tr('پرسش از کسب‌وکار')}</Button>}

      <h3 className="product-section">{tr('نظرها')}</h3>
      {reviews.length === 0 ? <p className="product-empty">{tr('هنوز نظری ثبت نشده است.')}</p> : <>
        <ul className="review-list">
          {reviews.map((review) => <li key={`${review.author}|${review.text}`} className="review">
            <span className="review-avatar" aria-hidden="true">{review.author.charAt(0)}</span>
            <div className="review-main">
              <div className="review-head"><strong>{review.author}</strong>
                <span className="review-stars" aria-label={tr('{0} ستاره', review.stars.toLocaleString(numberLocale()))}>{'★'.repeat(review.stars)}<i>{'★'.repeat(5 - review.stars)}</i></span>
              </div>
              <p>{review.text}</p>
            </div>
          </li>)}
        </ul>
        <p className="review-note">{tr('این نظرها نمونهٔ آزمایشی‌اند و از مشتری واقعی نیستند.')}</p>
      </>}
    </div>
  </section>;
}
