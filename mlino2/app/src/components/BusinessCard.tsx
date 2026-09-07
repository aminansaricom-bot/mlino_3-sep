import type { V2BusinessDirectoryRecord } from '../directory/contract';
import { categoryLabel, floorLabel, formatDistance } from '../uiFormat';

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
  record: V2BusinessDirectoryRecord;
  distanceMeters?: number;
  selected?: boolean;
  /** آفر فعالی که موتور تطبیق پیدا کرده — اگر باشد نشان تخفیف می‌آید */
  hasOffer?: boolean;
  onOpen: () => void;
  onRoute?: () => void;
}

export default function BusinessCard({
  record,
  distanceMeters,
  selected,
  hasOffer,
  onOpen,
  onRoute,
}: BusinessCardProps) {
  const activeProducts = record.products.filter((p) => p.is_active).length;
  const floor = floorLabel(record.location.floor_level, record.location.building_id);
  const offer = hasOffer ?? record.offers.length > 0;

  return (
    <div className={`biz-card${selected ? ' selected' : ''}`}>
      <div className="biz-thumb" aria-hidden="true">
        {CATEGORY_GLYPH[record.category] ?? '📍'}
      </div>

      <div className="biz-main">
        <div className="biz-name">{record.name}</div>

        <div className="biz-meta">
          <span>{categoryLabel(record.category)}</span>
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
          {activeProducts > 0 && (
            <span className="tag">{activeProducts.toLocaleString('fa-IR')} محصول</span>
          )}
        </div>

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
