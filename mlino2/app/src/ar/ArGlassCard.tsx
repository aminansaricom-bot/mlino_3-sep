// ArGlassCard.tsx — کارت شیشه‌ای (glassmorphism) پیشنهادهای کسب‌وکار روی تصویر دوربین.
// داده فقط از رکورد امضاشده و پذیرفته‌شده می‌آید؛ این کارت چیزی نمی‌سازد و فقط نمایش می‌دهد.

import { isOfferActiveAt } from '../offers';
import { categoryLabel, formatDistance } from '../uiFormat';
import type { PublicOffer } from '../publicExport/mapping';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { ArSceneItem } from './ArOverlayService';
import { demoBusinessRating } from '../demo/demoSocial';
import Stars from '../components/Stars';
import { tr, numberLocale } from '../i18n';

export const GLASS_OFFER_LIMIT = 3;

/** پیشنهادهای فعال در لحظهٔ `now`، به ترتیب نزدیک‌ترین پایان اعتبار، حداکثر `limit` مورد. */
export function activeOffersFor(record: PublicUiRecord | undefined, now: number, limit = GLASS_OFFER_LIMIT): PublicOffer[] {
  if (!record) return [];
  return record.offers
    .filter((offer) => isOfferActiveAt(offer.valid_from, offer.valid_until, now))
    .sort((a, b) => (Date.parse(a.valid_until ?? '9999-12-31T00:00:00Z') - Date.parse(b.valid_until ?? '9999-12-31T00:00:00Z'))
      || a.offer_id.localeCompare(b.offer_id))
    .slice(0, limit);
}

/** قیمت پیشنهاد به ریال با رقم فارسی، یا «با درخواست». */
export function offerPriceLabel(offer: Pick<PublicOffer, 'price_amount' | 'price_currency' | 'on_request'>): string {
  if (offer.on_request || offer.price_amount === null) return tr('با درخواست');
  const amount = Number(offer.price_amount);
  if (!Number.isFinite(amount)) return tr('با درخواست');
  const digits = amount.toLocaleString(numberLocale(), { maximumFractionDigits: 0 });
  return offer.price_currency === 'IRR' ? tr('{0} ریال', digits) : digits;
}

/** نام پیشنهاد بدون پسوند «(آزمایشی)»؛ نشانهٔ آزمایشی جداگانه روی کارت نمایش داده می‌شود. */
export function offerTitle(name: string): { title: string; test: boolean } {
  const test = name.includes('(آزمایشی)');
  return { title: name.replace('(آزمایشی)', '').trim(), test };
}

export default function ArGlassCard({
  item, record, now, leftPercent, glyph, onSelect,
}: {
  item: ArSceneItem;
  record?: PublicUiRecord;
  now: number;
  leftPercent: number;
  glyph: string;
  onSelect: (id: string) => void;
}) {
  const offers = activeOffersFor(record, now);
  const business = offerTitle(item.name);
  const rating = demoBusinessRating(item.businessId);
  return (
    <button className={`glass-card${offers.length ? ' has-offer' : ''}`} style={{ left: `${leftPercent}%` }}
      onClick={() => onSelect(item.businessId)} aria-label={tr('{0} — {1} پیشنهاد فعال', business.title, offers.length.toLocaleString(numberLocale()))}>
      <span className="glass-sheen" aria-hidden="true" />
      <span className="glass-head">
        <span className={`glass-coin ar-coin-${item.category}`} aria-hidden="true">{glyph}</span>
        <span className="glass-title">
          <strong>{business.title}</strong>
          <small>{rating && <Stars rating={rating} compact />} {item.category !== 'uncategorized' ? `${categoryLabel(item.category)} · ` : ''}{formatDistance(item.distanceMeters)}</small>
        </span>
      </span>
      {offers.length > 0 ? (
        <span className="glass-offers">
          {offers.map((offer) => {
            const title = offerTitle(offer.name);
            return (
              <span key={offer.offer_version_id} className="glass-offer">
                <span className="glass-offer-top">
                  <span className="glass-offer-name">{title.title}</span>
                  <span className="glass-offer-price">{offerPriceLabel(offer)}</span>
                </span>
                {offer.short_description && <span className="glass-offer-desc">{offer.short_description}</span>}
              </span>
            );
          })}
        </span>
      ) : (
        <span className="glass-empty">{tr('فعلاً پیشنهاد فعالی ندارد')}</span>
      )}
      <span className="glass-cta">{tr('مشاهدهٔ جزئیات')}</span>
    </button>
  );
}
