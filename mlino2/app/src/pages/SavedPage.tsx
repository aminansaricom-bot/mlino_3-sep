import { useState } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { CatalogImage, catalogPrice } from '../publicExport/catalogCards';
import { businessThumb, clean } from '../live/liveData';
import { formatDistance } from '../uiFormat';
import { AppHeader, EmptyState, IconButton, Segmented } from '../design/ui';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';

type Filter = 'all' | 'businesses' | 'products';

/**
 * «ذخیره‌ها»: businesses and products the person kept. The list lives on this phone (it survives reloads and
 * needs no account); a saved business or product that is no longer published is simply not shown.
 */
export default function SavedPage({ records, catalogByOrg, saved, savedItems, distanceById, onOpenBusiness, onOpenItem, onUnsaveBusiness, onUnsaveItem, storageFailed }: {
  records: readonly PublicUiRecord[]; catalogByOrg: ReadonlyMap<string, CatalogRecord>;
  saved: readonly string[]; savedItems: readonly string[]; distanceById: ReadonlyMap<string, number>;
  onOpenBusiness: (id: string) => void; onOpenItem: (organizationId: string, item: CatalogItem) => void;
  onUnsaveBusiness: (id: string) => void; onUnsaveItem: (organizationId: string, itemId: string) => void; storageFailed: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const businesses = saved.map((id) => records.find((r) => r.id === id)).filter((r): r is PublicUiRecord => !!r);
  const products = savedItems.flatMap((key) => {
    const [org, itemId] = key.split('/');
    const item = catalogByOrg.get(org)?.items.find((i) => i.catalog_item_id === itemId);
    const owner = records.find((r) => r.id === org);
    return item && owner ? [{ org, item, owner }] : [];
  });
  const showBusinesses = filter !== 'products';
  const showProducts = filter !== 'businesses';
  const nothing = (showBusinesses ? businesses.length : 0) + (showProducts ? products.length : 0) === 0;

  return <section className="rs-page" aria-labelledby="saved-title">
    <div className="rs-inner">
      <AppHeader title={<span id="saved-title">{tr('ذخیره‌ها')}</span>} />
      <Segmented label={tr('نوع ذخیره')} value={filter} onChange={setFilter} options={[
        { id: 'all', label: tr('همه') }, { id: 'businesses', label: tr('کسب‌وکارها'), count: businesses.length }, { id: 'products', label: tr('محصولات'), count: products.length },
      ]} />
      {storageFailed && <p className="rs-lead">{tr('ذخیره در مرورگر ممکن نیست؛ انتخاب‌ها فقط تا بستن این صفحه می‌مانند.')}</p>}
      {nothing
        ? <EmptyState title={tr('هنوز موردی اینجا نیست')} text={tr('کسب‌وکار یا محصولی را با نشانک ذخیره کن تا اینجا بماند.')} />
        : <div className="rs-list">
          {showBusinesses && businesses.map((r) => {
            const thumb = businessThumb(catalogByOrg.get(r.id));
            const d = distanceById.get(r.id);
            return <div key={r.id} className="rs-row-wrap">
              <button type="button" className="rs-row" onClick={() => onOpenBusiness(r.id)}>
                <span className="rs-thumb">{thumb ? <CatalogImage media={thumb} load /> : <LiveIcon name="store" />}</span>
                <span className="rs-row-copy"><b>{clean(r.name)}</b><small>{tr(r.category.label)}{d !== undefined ? ` · ${formatDistance(d)}` : ''}</small></span>
              </button>
              <IconButton icon="bookmark" className="on" label={tr('برداشتن از ذخیره‌ها')} onClick={() => onUnsaveBusiness(r.id)} />
            </div>;
          })}
          {showProducts && products.map(({ org, item, owner }) => <div key={`${org}/${item.catalog_item_id}`} className="rs-row-wrap">
            <button type="button" className="rs-row" onClick={() => onOpenItem(org, item)}>
              <span className="rs-thumb">{item.media[0] ? <CatalogImage media={item.media[0]} load /> : <LiveIcon name="image" />}</span>
              <span className="rs-row-copy"><b>{clean(item.name)}</b><small>{catalogPrice(item)} · {clean(owner.name)}</small></span>
            </button>
            <IconButton icon="bookmark" className="on" label={tr('برداشتن از ذخیره‌ها')} onClick={() => onUnsaveItem(org, item.catalog_item_id)} />
          </div>)}
        </div>}
      <div className="rs-card tint"><strong>{tr('ذخیره‌ها دست خودت هستند')}</strong><p>{tr('فهرست روی همین گوشی می‌ماند و هر مورد را هر زمان خواستی برمی‌داری.')}</p></div>
    </div>
  </section>;
}
