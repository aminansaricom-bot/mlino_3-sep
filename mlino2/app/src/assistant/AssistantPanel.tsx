import type { AssistantAnswer } from './assistantIntent';
import type { RankedResult } from './rankRecords';
import { CatalogImage, catalogPrice } from '../publicExport/catalogCards';
import { demoBusinessRating, displayName } from '../demo/demoSocial';
import { formatDistance } from '../uiFormat';
import Stars from '../components/Stars';

/** رضایت پیش از نخستین ارسال (U-N3): روشن و بدون ابهام. */
export function AssistantConsent({ onAccept, onLocal, remote = true }: { onAccept: () => void; onLocal: () => void; remote?: boolean }) {
  if (!remote) return <VoiceConsent onAccept={onAccept} onDecline={onLocal} />;
  return <div className="assist-consent" role="dialog" aria-modal="true" aria-labelledby="assist-consent-title">
    <div className="assist-consent-card">
      <span className="assist-spark" aria-hidden="true">✦</span>
      <h3 id="assist-consent-title">دستیار هوشمند</h3>
      <p>برای فهم منظورت، <b>فقط متن جست‌وجو</b> به یک سرویس هوش مصنوعی بیرونی (CodeCraft) فرستاده می‌شود. موقعیت، فهرست ذخیره‌ها و اطلاعات شخصی فرستاده نمی‌شود.</p>
      <p>اگر با صدا بپرسی، صدایت برای تبدیل به متن به سرویس گفتار مرورگر (در کروم: گوگل) می‌رود.</p>
      <p className="assist-consent-note">کسب‌وکارها و قیمت‌ها همیشه از اطلاعات تأییدشده‌ی خود برنامه می‌آیند، نه از هوش مصنوعی.</p>
      <div className="assist-consent-actions">
        <button type="button" className="primary" onClick={onAccept}>موافقم</button>
        <button type="button" onClick={onLocal}>نه، فقط جست‌وجوی محلی</button>
      </div>
    </div>
  </div>;
}

/** نسخه‌ی بدون سرویس بیرونی: فقط افشای گفتار مرورگر پیش از نخستین استفاده از میکروفون. */
function VoiceConsent({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return <div className="assist-consent" role="dialog" aria-modal="true" aria-labelledby="voice-consent-title">
    <div className="assist-consent-card">
      <span className="assist-spark" aria-hidden="true">✦</span>
      <h3 id="voice-consent-title">پرسیدن با صدا</h3>
      <p>برای تبدیل صدا به متن، صدایت به سرویس گفتار مرورگر (در کروم: گوگل) می‌رود. فهم منظور و پیشنهادها روی خود گوشی انجام می‌شود.</p>
      <div className="assist-consent-actions">
        <button type="button" className="primary" onClick={onAccept}>موافقم</button>
        <button type="button" onClick={onDecline}>نه، فقط نوشتن</button>
      </div>
    </div>
  </div>;
}

export default function AssistantPanel({ query, answer, results, loading, onOpen, onClose }: {
  query: string; answer: AssistantAnswer | null; results: readonly RankedResult[]; loading: boolean;
  onOpen: (id: string) => void; onClose: () => void;
}) {
  return <section className="assist-panel" aria-label="پیشنهاد دستیار" aria-live="polite">
    <header className="assist-head">
      <span className="assist-spark" aria-hidden="true">✦</span>
      <div className="assist-bubble">
        {loading ? <span className="assist-typing">در حال فهمیدن «{query}»<i /><i /><i /></span>
          : <>{answer?.answer}<small>{answer?.source === 'ai' ? 'هوش مصنوعی' : 'پردازش محلی'}</small></>}
      </div>
      <button type="button" className="assist-close" onClick={onClose} aria-label="بستن پیشنهادها">✕</button>
    </header>
    {!loading && <div className="assist-results">
      {results.length === 0 ? <p className="assist-empty">چیزی مطابق این درخواست در اطرافت پیدا نشد. کمی ساده‌تر بپرس یا شعاع را بیشتر کن.</p> :
        results.map((result) => {
          const rating = demoBusinessRating(result.record.id);
          const cover = result.items.find((item) => item.media.length)?.media[0];
          return <button type="button" key={result.record.id} className="assist-row" onClick={() => onOpen(result.record.id)}>
            <span className="assist-thumb">{cover ? <CatalogImage media={cover} load /> : <span aria-hidden="true">✦</span>}</span>
            <span className="assist-copy">
              <strong>{displayName(result.record.name)}</strong>
              <span className="assist-meta">{rating && <Stars rating={rating} compact />}{result.distanceMeters !== undefined && <span>{formatDistance(result.distanceMeters)}</span>}</span>
              {result.items.map((item) => <span key={item.catalog_item_id} className="assist-item">{displayName(item.name)} · {catalogPrice(item)}</span>)}
              {result.offerName && <span className="assist-offer">{displayName(result.offerName)}</span>}
            </span>
          </button>;
        })}
    </div>}
  </section>;
}
