import { describe, expect, it } from 'vitest';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import type { PublicOffer } from '../publicExport/mapping';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { groupOf, itemPrice, offerForItem, searchProducts, untilLabel, visibleItems } from './liveData';

const item = (id: string, name: string, price: string | null, links: string[] = []): CatalogItem => ({
  catalog_item_id: id, item_key: id, name, short_description: null, price_amount: price, price_currency: price ? 'IRR' : null,
  on_request: price === null, grouping_label: null, display_order: 0, available_from: null, available_until: null,
  offer_version_links: links, media: [], published_at: '2026-09-01T00:00:00Z', publication_id: 'p', source_revision: 1,
});
const offer = (version: string, price: string | null, until: string | null = null): PublicOffer => ({
  offer_id: `o-${version}`, offer_version_id: version, version_number: 1, name: 'آفر', short_description: null, offer_shape: 'CAMPAIGN',
  terms: null, price_amount: price, price_currency: 'IRR', on_request: price === null, valid_from: '2026-09-01T00:00:00Z', valid_until: until,
  capability_links: [], published_at: '2026-09-01T00:00:00Z', publication_id: 'p',
});

describe('live storefront data (only from real records)', () => {
  it('a product offer: 95 000 rial with 20% is 76 000 rial, percent computed from the two prices', () => {
    const pr = itemPrice(item('a', 'آمریکانو', '95000', ['v1']), [offer('v1', '76000')]);
    expect(pr).toMatchObject({ price: 95000, final: 76000, percent: 20 });
  });

  it('a shop-wide offer is never shown as the product\'s discount', () => {
    const it = item('a', 'آمریکانو', '95000');
    expect(offerForItem(it, [offer('v1', '76000')])).toBeNull();
    expect(itemPrice(it, [offer('v1', '76000')])).toMatchObject({ price: 95000, final: null, percent: null });
  });

  it('no invented discount when the offer price is not lower, and «قیمت با پرسش» stays unpriced', () => {
    expect(itemPrice(item('a', 'x', '95000', ['v1']), [offer('v1', '99000')]).final).toBeNull();
    expect(itemPrice(item('b', 'y', null, ['v1']), [offer('v1', '50000')])).toMatchObject({ price: null, final: null });
  });

  it('«فقط آفرها» keeps only products with their own offer; end date comes from the offer', () => {
    const cat: CatalogRecord = { organization_id: 'o', business_snapshot_id: 's', business_publication_id: 'p', items: [item('a', 'آ', '1000', ['v1']), item('b', 'ب', '2000')] };
    expect(visibleItems(cat, [offer('v1', '800')], true).map((i) => i.catalog_item_id)).toEqual(['a']);
    expect(visibleItems(cat, [], false)).toHaveLength(2);
    expect(untilLabel(null)).toBeNull();
    expect(untilLabel('2026-09-26T12:00:00Z')).toMatch(/^تا /);
  });

  it('menu groups map the existing categories; search finds products by product or business name', () => {
    expect([groupOf('cafe'), groupOf('restaurant'), groupOf('retail_shop'), groupOf('beauty_clinic'), groupOf('dental_clinic'), groupOf('uncategorized')])
      .toEqual(['food', 'food', 'shop', 'services', 'health', 'other']);
    const rec = { id: 'o', name: 'کافه نیلوفر (آزمایشی)', category: { key: 'cafe', label: 'کافه' } } as unknown as PublicUiRecord;
    const cats = new Map([['o', { organization_id: 'o', business_snapshot_id: 's', business_publication_id: 'p', items: [item('a', 'آمریکانو', '1'), item('b', 'موکا', '1')] } as CatalogRecord]]);
    expect(searchProducts([rec], cats, 'موکا', 'all').map((h) => h.item.name)).toEqual(['موکا']);
    expect(searchProducts([rec], cats, 'نیلوفر', 'food')).toHaveLength(2);
    expect(searchProducts([rec], cats, '', 'health')).toHaveLength(0);
    expect(searchProducts([rec], cats, 'موکا', 'all')[0].businessName).toBe('کافه نیلوفر');
  });
});
