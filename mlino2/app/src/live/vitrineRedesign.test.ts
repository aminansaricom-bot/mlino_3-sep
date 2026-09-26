import { describe, expect, it } from 'vitest';
import { assignLanes, businessWideOffers, chatSuggestions, foldText, matchProducts, offerTag } from './liveData';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';

const NOW = Date.parse('2026-09-26T10:00:00Z');
const offer = (id: string, price: string | null) => ({ offer_id: `o-${id}`, offer_version_id: `v-${id}`, version_number: 1, name: `آفر ${id}`, short_description: null, offer_shape: 'FIXED_PRICE', terms: null,
  price_amount: price, price_currency: 'IRR', on_request: false, valid_from: '2026-09-01T00:00:00Z', valid_until: '2026-10-30T00:00:00Z', capability_links: [], published_at: '2026-09-01T00:00:00Z', publication_id: 'p' });
const item = (id: string, name: string, price: string, links: string[] = []): CatalogItem => ({ catalog_item_id: id, item_key: id, name, short_description: null, price_amount: price, price_currency: 'IRR', on_request: false,
  grouping_label: null, display_order: 1, available_from: null, available_until: null, offer_version_links: links, media: [], published_at: '2026-09-01T00:00:00Z', publication_id: 'p', source_revision: 1 });
const record = (id: string, offers: unknown[]) => ({ id, name: id, offers, category: { key: 'cafe', label: 'کافه' } }) as unknown as PublicUiRecord;

describe('live storefront redesign helpers', () => {
  const cafe = record('cafe', [offer('mojito', '84000'), offer('shop', null)]);
  const catalog: CatalogRecord = { organization_id: 'cafe', business_snapshot_id: 's', business_publication_id: 'p',
    items: [item('espresso', 'اسپرسو', '85000'), item('mojito', 'موهیتو', '120000', ['v-mojito'])] };
  const cats = new Map([['cafe', catalog]]);

  it('an offer linked to a product stays on it; a shop-wide one goes to the business', () => {
    expect(businessWideOffers(cafe, catalog, NOW).map((o) => o.offer_id)).toEqual(['o-shop']);
    expect(offerTag(cafe, catalog, NOW)).toEqual({ percent: 30 }); // 120 000 → 84 000, from the real prices
    expect(offerTag(record('x', []), undefined, NOW)).toBeNull();
    expect(offerTag(record('y', [offer('z', null)]), { ...catalog, items: [] }, NOW)).toEqual({ percent: null }); // «آفر», no made-up percent
  });

  it('search folds ی/ي، ک/ك، half-spaces and spaces', () => {
    expect(foldText('آيس‌ كافي')).toBe(foldText('آیس کافی'));
    const iced = new Map([['cafe', { ...catalog, items: [item('ice', 'آیس‌کافی', '100000')] }]]);
    expect(matchProducts([cafe], iced, ['آيس كافي']).map((h) => h.item.catalog_item_id)).toEqual(['ice']);
    expect(matchProducts([cafe], cats, ['موهیتو']).map((h) => h.item.catalog_item_id)).toEqual(['mojito']);
    expect(matchProducts([cafe], cats, ['']).length).toBe(0);
  });

  it('markers never overlap; the chosen business keeps the first row', () => {
    const lanes = assignLanes([{ businessId: 'a', x: 50 }, { businessId: 'b', x: 55 }, { businessId: 'c', x: 60 }, { businessId: 'd', x: 52 }, { businessId: 'e', x: 90 }], 'c');
    expect(lanes.find((l) => l.businessId === 'c')?.lane).toBe(0);
    for (const l of lanes) for (const m of lanes) if (l !== m && l.lane === m.lane) expect(Math.abs(l.x - m.x)).toBeGreaterThanOrEqual(24);
    expect(lanes.length).toBe(4); // one of the four crowded ones finds no free row
  });

  it('suggested questions fit the product', () => {
    expect(chatSuggestions({ hasItem: true, categoryKey: 'cafe', hasOffer: false })).toEqual(['این محصول موجوده؟']);
    expect(chatSuggestions({ hasItem: true, categoryKey: 'retail_shop', hasOffer: true })).toEqual(['این محصول موجوده؟', 'چه سایزهایی داره؟', 'این آفر تا کی فعاله؟']);
    expect(chatSuggestions({ hasItem: false, categoryKey: null, hasOffer: false })).toEqual(['ساعت کاری؟']);
  });
});
