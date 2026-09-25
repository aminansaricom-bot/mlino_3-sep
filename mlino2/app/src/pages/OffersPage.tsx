import type { ReactNode } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import { activeOffersFor, offerPriceLabel } from '../ar/ArGlassCard';
import { offerUntil } from '../components/PublicBusinessDetails';
import { businessThumb, clean } from '../live/liveData';
import { formatDistance } from '../uiFormat';
import { AppHeader, EmptyState, StatusBadge } from '../design/ui';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';

/**
 * «آفرها»: every active offer the viewer may see, nearest business first. Radius-limited offers are already filtered
 * by position (D-77) before they reach this page; «ویژه» marks a paid placement (D-78), never a discount.
 */
export default function OffersPage({ records, catalogByOrg, now, distanceById, hiddenCount, alerts, onOpen, onLocate, onBack }: {
  records: readonly PublicUiRecord[]; catalogByOrg: ReadonlyMap<string, CatalogRecord>; now: number;
  distanceById: ReadonlyMap<string, number>; hiddenCount: number; alerts?: ReactNode;
  onOpen: (id: string) => void; onLocate: () => void; onBack: () => void;
}) {
  const cards = records
    .flatMap((record) => activeOffersFor(record, now, 10).map((offer) => ({ record, offer, distance: distanceById.get(record.id) })))
    .sort((a, b) => (Number(b.record.promoted) - Number(a.record.promoted)) || ((a.distance ?? Infinity) - (b.distance ?? Infinity)));
  const anyPromoted = cards.some((c) => c.record.promoted);

  return <section className="rs-page" aria-labelledby="offers-title">
    <div className="rs-inner">
      <AppHeader title={<span id="offers-title">{tr('تخفیف‌های اطراف')}</span>} onBack={onBack} />
      <p className="rs-lead">{tr('آفرهایی که در محدوده‌ی تقریبی تو دیده می‌شوند.')}</p>
      {alerts}
      {hiddenCount > 0 && <button type="button" className="rs-card tint" onClick={onLocate}>
        <strong>{tr('بعضی تخفیف‌ها فقط برای کسانی است که نزدیک کسب‌وکارند؛ برای دیدنشان دکمه‌ی ◎ را بزن.')}</strong>
      </button>}
      {cards.length === 0
        ? <EmptyState title={tr('فعلاً آفر فعالی در اطرافت نیست.')} text={tr('وقتی کسب‌وکاری نزدیک تو آفر تازه‌ای بگذارد، اینجا دیده می‌شود.')} />
        : cards.map(({ record, offer, distance }) => {
          const thumb = businessThumb(catalogByOrg.get(record.id));
          return <button key={offer.offer_version_id} type="button" className={`rs-card offer-card-rs${record.promoted ? ' feature' : ''}`} onClick={() => onOpen(record.id)}>
            <span className="offer-card-rs-row">
              <span className="rs-thumb">{thumb ? <CatalogImage media={thumb} load /> : <LiveIcon name="offer" />}</span>
              <span className="rs-row-copy">
                <b>{clean(offer.name)}</b>
                <small>{clean(record.name)}{distance !== undefined ? ` · ${formatDistance(distance)}` : ''}</small>
                <small>{offerPriceLabel(offer)} · {offerUntil(offer.valid_until)}</small>
              </span>
              {record.promoted && <StatusBadge tone="special">{tr('ویژه')}</StatusBadge>}
            </span>
          </button>;
        })}
      {anyPromoted && <p className="rs-lead"><small>{tr('«ویژه» یعنی جایگاه پولی در جست‌وجو.')}</small></p>}
    </div>
  </section>;
}
