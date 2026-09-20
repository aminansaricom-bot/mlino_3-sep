import { describe, expect, it } from 'vitest';
import { publicRecord } from './u2Fixtures';
import { nearbyPublicUiRecords, recordsWithCoordinates, toPublicUiRecord } from './uiAdapter';

describe('U2 accepted PublicRecord display adapter', () => {
  it('u2-adapter maps every approved display field without draft-1 inventions', () => {
    const source = publicRecord();
    const actual = toPublicUiRecord(source);
    expect(actual).toEqual({
      id: 'org-u2', name: 'کافه نمونه', description: 'شرح عمومی',
      category: { key: 'cafe', label: 'کافه', guessed: true },
      coordinates: { latitude: 35.775, longitude: 51.425 }, addressText: 'تهران',
      contactInformation: source.business.contact_information, links: source.business.links,
      businessHours: source.business.business_hours, capabilities: source.capabilities, offers: source.offers,
      stale: false, publication: { publishedAt: '2026-09-20T10:00:00.000Z', publicationId: 'pub-profile', sourceRevision: 4 },
    });
    for (const absent of ['floor_level', 'building_id', 'products', 'discount_percent']) expect(actual).not.toHaveProperty(absent);
  });

  it('u2-adapter keeps null-coordinate records in the list but excludes them from map and nearby inputs', () => {
    const item = toPublicUiRecord(publicRecord({ location: { latitude: null, longitude: null, address_text: 'فقط نشانی' } }));
    expect(item.coordinates).toBeNull();
    expect(item.addressText).toBe('فقط نشانی');
    expect([item]).toHaveLength(1);
    expect(recordsWithCoordinates([item])).toEqual([]);
    expect(nearbyPublicUiRecords([item], 35.775, 51.425, 5000)).toEqual([]);
  });

  it('u2-adapter preserves the accepted public contact, links, hours, capabilities and offers by value', () => {
    const source = publicRecord();
    const item = toPublicUiRecord(source);
    expect(item.contactInformation).toEqual(source.business.contact_information);
    expect(item.links).toEqual(source.business.links);
    expect(item.businessHours).toBe(source.business.business_hours);
    expect(item.capabilities).toBe(source.capabilities);
    expect(item.offers).toBe(source.offers);
  });
});
