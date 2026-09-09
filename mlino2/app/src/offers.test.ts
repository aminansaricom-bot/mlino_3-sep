import { describe, expect, it } from 'vitest';
import { offerStatus, isOfferActiveAt } from './offers';

const now = Date.parse('2026-09-09T12:00:00Z');
const past = '2026-09-09T11:00:00Z', present = '2026-09-09T12:00:00Z', future = '2026-09-09T13:00:00Z';
describe('offer time windows', () => {
  it.each([
    [past, future, 'active'], [present, future, 'active'], [future, null, 'upcoming'],
    [past, present, 'active'], [past, past, 'expired'], [past, null, 'active'],
    ['دیروز', future, 'invalid'], [past, 'bad', 'invalid'], ['bad', 'bad', 'invalid'],
    [future, past, 'invalid'],
  ] as const)('%s to %s is %s', (from, until, expected) => {
    expect(offerStatus(from, until, now)).toBe(expected);
    expect(isOfferActiveAt(from, until, now)).toBe(expected === 'active');
  });
  it('expires one millisecond after the inclusive end', () => {
    expect(isOfferActiveAt(past, present, now + 1)).toBe(false);
  });
  it('rejects an invalid clock', () => {
    expect(offerStatus(past, null, NaN)).toBe('invalid');
  });
});
