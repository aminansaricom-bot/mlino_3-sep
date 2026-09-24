import { describe, expect, it } from 'vitest';
import { mapRecords } from '../publicExport/mapping';
import { toPublicUiRecord, type PublicUiRecord } from '../publicExport/uiAdapter';
import { publicRecord } from '../publicExport/u2Fixtures';
import { hiddenForLackOfPosition, promoteMatches, toDataFrame, withNearbyOffers } from './nearbyOffers';

const offer = (id: string, radius?: number) => ({
  offer_id: `o-${id}`, offer_version_id: `v-${id}`, version_number: 1, name: `آفر ${id}`, short_description: null, offer_shape: 'CAMPAIGN', terms: null,
  price_amount: null, price_currency: null, on_request: true, valid_from: '2026-09-01T00:00:00.000Z', valid_until: null, capability_links: [],
  published_at: '2026-09-20T00:00:00.000Z', publication_id: `p-${id}`, ...(radius === undefined ? {} : { visibility_radius_meters: radius }),
});
const cafe = (): PublicUiRecord => ({ ...toPublicUiRecord(publicRecord({ location: { latitude: 35.7576, longitude: 51.4099, address_text: null } })), offers: [offer('all'), offer('near', 500)] });

describe('radius offers (D-77) and placement (D-78) in V2', () => {
  it('the mapper accepts the two optional fields and rejects anything else', () => {
    const base = JSON.parse(JSON.stringify(publicRecord({})));
    base.offers = [offer('x', 800)];
    base.promoted = true;
    const [r] = mapRecords([base]);
    expect(r.offers[0].visibility_radius_meters).toBe(800);
    expect(toPublicUiRecord(r).promoted).toBe(true);
    expect(toPublicUiRecord(mapRecords([JSON.parse(JSON.stringify(publicRecord({})))])[0]).promoted).toBe(false);
    for (const bad of [50, 20001, 1.5, '800']) expect(() => mapRecords([{ ...base, offers: [{ ...offer('x'), visibility_radius_meters: bad }] }])).toThrow('PUBLIC_EXPORT_OFFER_RADIUS');
    expect(() => mapRecords([{ ...base, promoted: false }])).toThrow('PUBLIC_EXPORT_RECORD_SHAPE');
  });

  it('shows a radius offer only inside the radius, and none without a known position', () => {
    const inside = withNearbyOffers([cafe()], [35.7590, 51.4103])[0];
    expect(inside.offers.map((o) => o.name)).toEqual(['آفر all', 'آفر near']);
    const outside = withNearbyOffers([cafe()], [35.7700, 51.4099])[0];
    expect(outside.offers.map((o) => o.name)).toEqual(['آفر all']);
    expect(withNearbyOffers([cafe()], null)[0].offers.map((o) => o.name)).toEqual(['آفر all']);
    expect(hiddenForLackOfPosition([cafe()], null)).toBe(1);
    expect(hiddenForLackOfPosition([cafe()], [35.7, 51.4])).toBe(0);
  });

  it('puts promoted matches first only while searching, keeping the rest in order', () => {
    const rows = [{ id: 'a', promoted: false }, { id: 'b', promoted: true }, { id: 'c', promoted: false }, { id: 'd', promoted: true }];
    expect(promoteMatches(rows, true).map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(promoteMatches(rows, false).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('maps the viewer back into the data frame when the demo relocation is on', () => {
    expect(toDataFrame([35.7, 51.4], null, null)).toEqual([35.7, 51.4]);
    const [lat, lng] = toDataFrame([36.3, 59.6], [35.7575, 51.4098], [36.3, 59.6]);
    expect(lat).toBeCloseTo(35.7575, 6);
    expect(lng).toBeCloseTo(51.4098, 6);
  });
});
