import type { V2BusinessDirectoryRecord } from '../directory/contract';
import { haversineDistanceMeters } from '../directory/geo';
import { isOfferActiveAt } from '../offers';

export type SuggestionResult = { businessId: string } | { reason: 'no-active-offer' | 'out-of-radius' | 'filtered' };

/** Receives only visible records: category, floor and hidden filtering belongs to the caller. */
export function pickSuggestion(records: readonly V2BusinessDirectoryRecord[], point: readonly [number, number], radiusMeters: number, now: number, filtersApplied = false): SuggestionResult {
  if (records.length === 0 && filtersApplied) return {reason: 'filtered'};
  const active = records.filter(r => r.offers.some(o => isOfferActiveAt(o.valid_from, o.valid_until, now)));
  if (active.length === 0) return {reason: 'no-active-offer'};
  const candidates = active.map(record => ({record, distance: haversineDistanceMeters(point[0], point[1], record.location.latitude, record.location.longitude)}))
    .filter(item => item.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance || (a.record.business_id < b.record.business_id ? -1 : a.record.business_id > b.record.business_id ? 1 : 0));
  return candidates.length ? {businessId: candidates[0].record.business_id} : {reason: 'out-of-radius'};
}
