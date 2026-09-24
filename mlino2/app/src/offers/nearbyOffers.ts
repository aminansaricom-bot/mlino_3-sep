import { haversineDistanceMeters } from '../directory/geo';
import type { PublicUiRecord } from '../publicExport/uiAdapter';

/**
 * D-77: an offer published with a radius is shown only to a viewer inside it. The distance is measured here,
 * on the viewer's own phone, between the viewer's position and the business as drawn on the map (so the demo
 * relocation stays consistent). Without a known position the viewer sees no radius-limited offer — never a guess.
 */
export function withNearbyOffers(records: readonly PublicUiRecord[], viewer: readonly [number, number] | null): PublicUiRecord[] {
  return records.map((record) => {
    if (!record.offers.some((o) => o.visibility_radius_meters !== undefined)) return record;
    const offers = record.offers.filter((o) => {
      if (o.visibility_radius_meters === undefined) return true;
      if (!viewer || !record.coordinates) return false;
      return haversineDistanceMeters(viewer[0], viewer[1], record.coordinates.latitude, record.coordinates.longitude) <= o.visibility_radius_meters;
    });
    return offers.length === record.offers.length ? record : { ...record, offers };
  });
}

/** Businesses with a radius offer the viewer cannot see yet because no position is known. */
export function hiddenForLackOfPosition(records: readonly PublicUiRecord[], viewer: readonly [number, number] | null): number {
  if (viewer) return 0;
  return records.filter((r) => r.offers.some((o) => o.visibility_radius_meters !== undefined)).length;
}

/**
 * D-78: when the viewer searches, matching PRO/MAX businesses come first. Only among results that already
 * match — placement never adds a business the search did not find — and the list keeps its order otherwise.
 */
export function promoteMatches<T extends { promoted: boolean }>(matches: readonly T[], searching: boolean): T[] {
  if (!searching) return [...matches];
  return [...matches.filter((r) => r.promoted), ...matches.filter((r) => !r.promoted)];
}

/**
 * The inverse of the demo relocation, for notifications: where the viewer stands in the data's own frame.
 * The server compares that point with the business's published coordinates (D-77).
 */
export function toDataFrame(viewer: readonly [number, number], anchor: readonly [number, number] | null, target: readonly [number, number] | null): [number, number] {
  if (!anchor || !target) return [viewer[0], viewer[1]];
  const north = viewer[0] - target[0];
  const east = (viewer[1] - target[1]) * Math.cos((target[0] * Math.PI) / 180) / Math.cos((anchor[0] * Math.PI) / 180);
  return [anchor[0] + north, anchor[1] + east];
}
