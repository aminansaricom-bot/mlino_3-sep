import { useEffect } from 'react';
import type { CatalogItem } from './catalog';
import { CatalogImage, catalogPrice } from './catalogCards';
import { demoProductReviews, displayName } from '../demo/demoSocial';
import Stars from '../components/Stars';
import { Icon } from '../design/Icon';

/**
 * صفحه‌ی محصول: عکس بزرگ، نام، قیمت، توضیح، و زیر آن نظرهای کاربران
 * (در ساخت نمایشی، نظرهای نمونه با برچسب روشن). عکس همان مسیر سنجیده‌شده‌ی
 * کاتالوگ را دارد؛ هیچ تصویری بدون سنجش اثرانگشت نمایش داده نمی‌شود.
 */
export default function ProductPage({ item, businessName, onClose }: { item: CatalogItem; businessName: string; onClose: () => void }) {
  const { reviews, rating } = demoProductReviews(item.name);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <section className="product-page" role="dialog" aria-modal="true" aria-label={displayName(item.name)}>
    <div className="product-hero">
      <CatalogImage key={item.catalog_item_id} media={item.media[0]} load />
      <button className="product-back" onClick={onClose} aria-label="بازگشت"><Icon name="close" /></button>
    </div>
    <div className="product-body">
      <div className="product-from">{businessName}</div>
      <h2 className="product-title">{displayName(item.name)}</h2>
      <div className="product-meta">
        <span className="product-price">{catalogPrice(item)}</span>
        {item.grouping_label && <span className="product-group">{item.grouping_label}</span>}
      </div>
      {rating && <Stars rating={rating} />}
      {item.short_description && <p className="product-desc">{item.short_description}</p>}

      <h3 className="product-section">نظرها</h3>
      {reviews.length === 0 ? <p className="product-empty">هنوز نظری ثبت نشده است.</p> : <>
        <ul className="review-list">
          {reviews.map((review) => <li key={`${review.author}|${review.text}`} className="review">
            <span className="review-avatar" aria-hidden="true">{review.author.charAt(0)}</span>
            <div className="review-main">
              <div className="review-head"><strong>{review.author}</strong>
                <span className="review-stars" aria-label={`${review.stars.toLocaleString('fa-IR')} ستاره`}>{'★'.repeat(review.stars)}<i>{'★'.repeat(5 - review.stars)}</i></span>
              </div>
              <p>{review.text}</p>
            </div>
          </li>)}
        </ul>
        <p className="review-note">این نظرها نمونهٔ آزمایشی‌اند و از مشتری واقعی نیستند.</p>
      </>}
    </div>
  </section>;
}
