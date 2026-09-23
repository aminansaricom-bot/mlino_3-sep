import { describe, expect, it } from 'vitest';
import { ABSOLUTE_GRACE_MS, resolveHeadingSource } from './browserSensors';
import { activeOffersFor, offerPriceLabel, offerTitle } from './ArGlassCard';
import type { PublicOffer } from '../publicExport/mapping';
import type { PublicUiRecord } from '../publicExport/uiAdapter';

describe('heading source does not flicker between absolute and relative events', () => {
  it('an absolute reading always means compass', () => {
    expect(resolveHeadingSource('ok', null, 1000)).toBe('compass');
  });
  it('a relative event right after an absolute one is ignored (the Android double-event case)', () => {
    expect(resolveHeadingSource('not-absolute', 1000, 1000 + ABSOLUTE_GRACE_MS - 1)).toBeNull();
  });
  it('a relative event is reported only when no absolute reading arrived within the grace window', () => {
    expect(resolveHeadingSource('not-absolute', 1000, 1000 + ABSOLUTE_GRACE_MS)).toBe('notAbsolute');
    expect(resolveHeadingSource('not-absolute', null, 5)).toBe('notAbsolute');
  });
  it('an alternating absolute/relative stream stays on compass for its whole length', () => {
    let last: number | null = null;
    let state: 'compass' | 'notAbsolute' | 'none' = 'none';
    const changes: string[] = [];
    for (let t = 0; t < 3000; t += 16) {
      const kind = (t / 16) % 2 === 0 ? 'ok' : 'not-absolute';
      if (kind === 'ok') last = t;
      const next = resolveHeadingSource(kind, last, t);
      if (next !== null && next !== state) { state = next; changes.push(next); }
    }
    expect(changes).toEqual(['compass']);
  });
  it('ignores events without data', () => {
    expect(resolveHeadingSource('none', null, 0)).toBeNull();
  });
});

function offer(partial: Partial<PublicOffer>): PublicOffer {
  return {
    offer_id: 'o', offer_version_id: 'v', version_number: 1, name: 'پیشنهاد', short_description: null,
    offer_shape: 'ITEM', terms: null, price_amount: null, price_currency: null, on_request: true,
    valid_from: '2026-09-01T00:00:00Z', valid_until: '2026-12-31T20:30:00Z', capability_links: [],
    published_at: '2026-09-01T00:00:00Z', publication_id: 'p', ...partial,
  };
}
const NOW = Date.parse('2026-09-23T08:00:00Z');

describe('glass card offers', () => {
  it('shows only active offers, soonest ending first, at most three', () => {
    const record = { offers: [
      offer({ offer_id: 'late', offer_version_id: 'v1', valid_until: '2026-12-31T00:00:00Z' }),
      offer({ offer_id: 'soon', offer_version_id: 'v2', valid_until: '2026-10-01T00:00:00Z' }),
      offer({ offer_id: 'expired', offer_version_id: 'v3', valid_until: '2026-09-02T00:00:00Z' }),
      offer({ offer_id: 'future', offer_version_id: 'v4', valid_from: '2026-11-01T00:00:00Z' }),
      offer({ offer_id: 'open', offer_version_id: 'v5', valid_until: null }),
      offer({ offer_id: 'mid', offer_version_id: 'v6', valid_until: '2026-11-15T00:00:00Z' }),
    ] } as unknown as PublicUiRecord;
    expect(activeOffersFor(record, NOW).map((o) => o.offer_id)).toEqual(['soon', 'mid', 'late']);
    expect(activeOffersFor(undefined, NOW)).toEqual([]);
  });
  it('formats prices in Persian digits with rial, and on-request offers as such', () => {
    expect(offerPriceLabel({ price_amount: '101500', price_currency: 'IRR', on_request: false })).toBe(`${(101500).toLocaleString('fa-IR')} ریال`);
    expect(offerPriceLabel({ price_amount: '101500.00', price_currency: 'IRR', on_request: false })).toBe(`${(101500).toLocaleString('fa-IR')} ریال`);
    expect(offerPriceLabel({ price_amount: null, price_currency: null, on_request: true })).toBe('با درخواست');
  });
  it('separates the test marker from the displayed name', () => {
    expect(offerTitle('۳۰٪ تخفیف موهیتو (آزمایشی)')).toEqual({ title: '۳۰٪ تخفیف موهیتو', test: true });
    expect(offerTitle('کافه')).toEqual({ title: 'کافه', test: false });
  });
});
