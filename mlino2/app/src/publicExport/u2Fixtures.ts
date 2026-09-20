import type { PublicRecord } from './mapping';

export function publicRecord(overrides: Partial<PublicRecord['business']> = {}): PublicRecord {
  return {
    business: {
      organization_id: 'org-u2', name: 'کافه نمونه', description: 'شرح عمومی',
      location: { latitude: 35.775, longitude: 51.425, address_text: 'تهران' },
      contact_information: { public_phone: '02100000000', public_email: 'public@example.test', public_address: 'تهران' },
      links: { website: 'https://example.test', public_social: ['https://social.example.test'] },
      business_hours: { schema_version: 'mlino.business-hours.v1', timezone: 'UTC', weekly: [{ day: 1, intervals: [{ open: '09:00', close: '17:00' }] }] },
      published_at: '2026-09-20T10:00:00.000Z', publication_id: 'pub-profile', source_revision: 4,
      ...overrides,
    },
    capabilities: [{ capability_id: 'cap-1', capability_key: 'coffee', name: 'قهوه', short_description: 'قهوه تازه', fresh_until: null, source_revision: 2 }],
    offers: [{ offer_id: 'offer-1', offer_version_id: 'version-1', version_number: 1, name: 'پیشنهاد صبح', short_description: 'نمونه',
      offer_shape: 'FIXED_PRICE', terms: { schema_version: 'mlino.offer-terms.v1', summary: 'شرایط', conditions: [] },
      price_amount: '100.00', price_currency: 'IRR', on_request: false, valid_from: '2026-09-20T00:00:00.000Z', valid_until: null,
      capability_links: [{ capability_id: 'cap-1', capability_key: 'coffee', name: 'قهوه' }], published_at: '2026-09-20T10:01:00.000Z', publication_id: 'pub-offer' }],
    stale: false,
    ordering: { primary: 'publication.occurred_at', tie_breaker: 'publication.id' },
  };
}
