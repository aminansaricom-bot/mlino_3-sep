import { floorLabel, formatDistance } from '../uiFormat';
import { isOfferActiveAt } from '../offers';
import {
  businessActiveProductCount, businessCapabilityCount, businessCategory, businessCategoryGuessed,
  businessCategoryLabel, businessName, businessOffers, isPublicUiRecord, type RichUiRecord,
} from './businessView';
import { numberLocale } from '../i18n';

/**
 * کارت کسب‌وکار — نمای مصرف‌کننده.
 *
 * فقط چیزهایی را نشان می‌دهد که واقعاً در داده هست. هیچ فیلد ساختگی:
 * امتیاز و ساعت کاری در قرارداد `02` وجود ندارند، پس نمایش داده نمی‌شوند
 * (نه با مقدار جعلی، نه با جای‌خالیِ گمراه‌کننده). تصویر/لوگو هم در قرارداد
 * نیست — به‌جای عکس ساختگی، نشان دسته نمایش داده می‌شود.
 */

const CATEGORY_GLYPH: Record<string, string> = {
  dental_clinic: '🦷',
  beauty_clinic: '💠',
  cafe: '☕',
  restaurant: '🍽',
  retail_shop: '🛍',
};

interface BusinessCardProps {
  record: RichUiRecord;
  distanceMeters?: number;
  selected?: boolean;
  /** آفر فعالی که موتور تطبیق پیدا کرده — اگر باشد نشان تخفیف می‌آید */
  hasOffer?: boolean;
  now: number;
  /**
   * دلیل انتخاب این کارت توسط دستیار. فقط از شواهد واقعیِ موتور تطبیق ساخته
   * می‌شود (محصول منطبق، آفر منطبق، فاصله) — هیچ توضیح تولیدشده‌ای اینجا نیست.
   */
  reason?: string;
  onOpen: () => void;
  onRoute?: () => void;
}

export default function BusinessCard({
  record,
  distanceMeters,
  selected,
  hasOffer,
  now,
  reason,
  onOpen,
  onRoute,
}: BusinessCardProps) {
  const activeProducts = businessActiveProductCount(record);
  const capabilityCount = businessCapabilityCount(record);
  const floor = isPublicUiRecord(record) ? null : floorLabel(record.location.floor_level, record.location.building_id);
  const offers = businessOffers(record);
  const offer = (hasOffer ?? true) && offers.some((item) => isOfferActiveAt(
    isPublicUiRecord(record) ? item.valid_from : item.valid_from,
    isPublicUiRecord(record) ? item.valid_until : item.valid_until,
    now,
  ));
  const category = businessCategory(record);

  return (
    <div className={`biz-card${selected ? ' selected' : ''}`}>
      <div className="biz-thumb" aria-hidden="true">
        {CATEGORY_GLYPH[category] ?? '📍'}
      </div>

      <div className="biz-main">
        <div className="biz-name">{businessName(record)}</div>

        <div className="biz-meta">
          <span>{businessCategoryLabel(record)}{businessCategoryGuessed(record) ? ' · حدسی' : ''}</span>
          {distanceMeters !== undefined && (
            <>
              <i className="dot" />
              <span>{formatDistance(distanceMeters)}</span>
            </>
          )}
          {floor && (
            <>
              <i className="dot" />
              <span>{floor}</span>
            </>
          )}
        </div>

        <div className="biz-meta">
          {offer && <span className="tag offer">پیشنهاد ویژه</span>}
          {activeProducts !== null && activeProducts > 0 && (
            <span className="tag">{activeProducts.toLocaleString(numberLocale())} محصول</span>
          )}
          {capabilityCount !== null && capabilityCount > 0 && (
            <span className="tag">{capabilityCount.toLocaleString(numberLocale())} خدمت</span>
          )}
        </div>

        {reason !== undefined && reason.length > 0 && (
          <div className="biz-reason">چرا پیشنهاد شد: {reason}</div>
        )}

        <div className="biz-actions">
          <button className="primary" onClick={onOpen}>
            مشاهده
          </button>
          {onRoute && <button onClick={onRoute}>مسیریابی</button>}
        </div>
      </div>
    </div>
  );
}
