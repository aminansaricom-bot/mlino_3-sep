import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { openNow } from '../publicExport/businessHours';
import { Icon } from '../design/Icon';
import { formatIso } from '../uiFormat';
import ShareBusinessAction from '../experience/ShareBusinessAction';
import type { LocalExperience } from '../experience/useLocalExperience';

interface Props {
  record: PublicUiRecord;
  now: number;
  experience: LocalExperience;
  onClose: () => void;
  onToggle: (key: 'saved' | 'later' | 'liked' | 'hidden', id: string) => void;
}

export default function PublicBusinessDetails({ record, now, experience, onClose, onToggle }: Props) {
  const hours = openNow(record, now);
  return <section className="panel" aria-label="جزئیات کسب‌وکار">
    <div className="panel-head"><h3>جزئیات کسب‌وکار</h3><button className="panel-close" onClick={onClose} aria-label="بستن"><Icon name="close" /></button></div>
    <div className="panel-body">
      <div className="detail-head"><span className={`category-coin coin-${record.category.key}`} aria-hidden="true">●</span><div>
        <h2 className="detail-title">{record.name}</h2>
        <div className="biz-meta"><span>{record.category.label} · حدسی</span><i className="dot" />
          <span>{hours === 'open' ? 'الان باز است' : hours === 'closed' ? 'اکنون بسته است' : 'وضعیت ساعات نامشخص است'}</span></div>
      </div></div>
      {record.description && <p>{record.description}</p>}
      {record.addressText && <p>نشانی عمومی: {record.addressText}</p>}
      {record.contactInformation?.public_phone && <p>تلفن عمومی: {record.contactInformation.public_phone}</p>}
      {record.contactInformation?.public_email && <p>ایمیل عمومی: {record.contactInformation.public_email}</p>}
      {record.links?.website && <p><a href={record.links.website} target="_blank" rel="noreferrer">وب‌سایت</a></p>}
      {record.links?.public_social?.map((url) => <p key={url}><a href={url} target="_blank" rel="noreferrer">شبکهٔ اجتماعی عمومی</a></p>)}
      <div className="detail-actions">
        <button className={experience.saved.includes(record.id) ? 'active' : ''} onClick={() => onToggle('saved', record.id)}><Icon name="bookmark" />{experience.saved.includes(record.id) ? 'ذخیره شد' : 'ذخیره'}</button>
        <button className={experience.later.includes(record.id) ? 'active' : ''} onClick={() => onToggle('later', record.id)}><Icon name="clock" />بعداً ببینم</button>
        <button className={experience.liked.includes(record.id) ? 'active' : ''} onClick={() => onToggle('liked', record.id)}><Icon name="heart" />مناسب من</button>
        <button onClick={() => { onToggle('hidden', record.id); onClose(); }}><Icon name="hide" />کمتر نشان بده</button>
        <ShareBusinessAction record={record} />
      </div>
      <div className="section-title">خدمات و توانمندی‌ها</div>
      {record.capabilities.length === 0 ? <div className="empty">خدمت منتشرشده‌ای ثبت نشده</div> : record.capabilities.map((item) =>
        <div className="product-row" key={item.capability_id}><span className="product-name">{item.name}{item.short_description ? ` — ${item.short_description}` : ''}</span></div>)}
      <div className="section-title">پیشنهادها</div>
      {record.offers.length === 0 ? <div className="empty">پیشنهاد فعالی ثبت نشده</div> : record.offers.map((offer) =>
        <div className="offer-card" key={offer.offer_version_id}><strong>{offer.name}</strong>
          {offer.short_description && <div>{offer.short_description}</div>}
          <div>{offer.on_request ? 'قیمت با درخواست' : offer.price_amount ? `${offer.price_amount} ${offer.price_currency ?? ''}` : 'قیمت عمومی ثبت نشده'}</div>
          <small>اعتبار: {formatIso(offer.valid_from)}{offer.valid_until ? ` تا ${formatIso(offer.valid_until)}` : ' — تا اطلاع ثانوی'}</small>
        </div>)}
      {record.stale && <p role="status">این رکورد از آخرین snapshot معتبر نمایش داده می‌شود.</p>}
    </div>
  </section>;
}
