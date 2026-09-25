import { describe, expect, it, vi } from 'vitest';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { demoBanner, nextDemoTarget, parseDemoAnchor, presentationRecords, reanchorDemoTarget, relocate,
  visibleDemoRecords, type Point } from './demoRelocation';

const anchor: Point = [35.7575, 51.4098];
function record(id: string, latitude: number | null, longitude: number | null): PublicUiRecord {
  return { id, name: id, description: null, category: { key: 'uncategorized', label: 'دسته‌بندی نشده', guessed: true },
    coordinates: latitude === null || longitude === null ? null : { latitude, longitude },
    addressText: null, contactInformation: null, links: null, businessHours: null,
    capabilities: [], offers: [], stale: false, promoted: false,
    publication: { publishedAt: '2026-09-22T00:00:00.000Z', publicationId: id, sourceRevision: 1 } } as PublicUiRecord;
}
const toRad = (x: number) => x * Math.PI / 180;
function distanceAndBearing(from: Point, to: Point): [number, number] {
  const lat1 = toRad(from[0]), lat2 = toRad(to[0]), deltaLat = lat2 - lat1, deltaLon = toRad(to[1] - from[1]);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const distance = 2 * 6_371_000 * Math.asin(Math.sqrt(a));
  const bearing = Math.atan2(Math.sin(deltaLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)) * 180 / Math.PI;
  return [distance, bearing];
}

describe('K6D demo relocation', () => {
  it('flag off returns the original array and never invokes relocation', () => {
    const records = [record('test-demo-01', 35.7577, 51.41)];
    const move = vi.fn(relocate);
    expect(presentationRecords(records, false, anchor, [35.8, 51.5], move)).toBe(records);
    expect(move).not.toHaveBeenCalled();
    expect(demoBanner(false)).toBeNull();
  });

  it('moves only test-demo organizations with coordinates, preserving other object identities', () => {
    const demo = record('test-demo-01', 35.7577, 51.41);
    const real = record('real-business', 35.7578, 51.41);
    const otherTest = record('test-vanak-01', 35.7579, 51.41);
    const missing = record('test-demo-02', null, null);
    const input = [demo, real, otherTest, missing];
    const original = structuredClone(input);
    const result = relocate(input, anchor, [48.2, -122.3]);
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(demo);
    expect(result[0].coordinates).not.toEqual(demo.coordinates);
    expect(result[1]).toBe(real);
    expect(result[2]).toBe(otherTest);
    expect(result[3]).toBe(missing);
    expect(input).toEqual(original);
  });

  it('preserves distance and bearing at Tehran and distant targets within 0.5 m / 0.5°', () => {
    const points = [record('test-demo-01', 35.7578, 51.4102), record('test-demo-02', 35.7571, 51.4095)];
    for (const target of [[35.8, 51.5], [48.2, -122.3], [-33.8, 151.2]] as Point[]) {
      const moved = relocate(points, anchor, target);
      for (let i = 0; i < points.length; i++) {
        const before = distanceAndBearing(anchor, [points[i].coordinates!.latitude, points[i].coordinates!.longitude]);
        const after = distanceAndBearing(target, [moved[i].coordinates!.latitude, moved[i].coordinates!.longitude]);
        expect(Math.abs(before[0] - after[0])).toBeLessThan(0.5);
        expect(Math.abs(before[1] - after[1])).toBeLessThan(0.5);
      }
    }
  });

  it('strictly validates the anchor, including coordinate ranges', () => {
    expect(parseDemoAnchor(undefined)).toEqual(anchor);
    expect(parseDemoAnchor('35.7575,51.4098')).toEqual(anchor);
    for (const bad of ['x,1', '91,0', '0,181', '90,0', '1, 2', '1,2,3', 'NaN,2']) {
      expect(() => parseDemoAnchor(bad)).toThrow('DEMO_ANCHOR_INVALID');
    }
  });

  it('shows demo records in their own sample area before the first fix; «بستن نمونه‌ها» still hides them', () => {
    const demo = record('test-demo-01', 35.7577, 51.41);
    const real = record('real-business', 35.7578, 51.41);
    expect(visibleDemoRecords([demo, real], null)).toEqual([real]);
    expect(presentationRecords([demo, real], true, anchor, null)).toEqual([demo, real]);
  });

  it('anchors once, ignores later fixes, and explicit re-anchor moves to the latest fix', () => {
    const first: Point = [35.8, 51.5], later: Point = [35.9, 51.6];
    expect(nextDemoTarget(null, first)).toBe(first);
    expect(nextDemoTarget(first, later)).toBe(first);
    expect(reanchorDemoTarget(later)).toBe(later);
    expect(reanchorDemoTarget(null)).toBeNull();
    const item = record('test-demo-01', 35.7577, 51.41);
    expect(relocate([item], anchor, first)[0].coordinates).not.toEqual(relocate([item], anchor, later)[0].coordinates);
  });

  it('renders a persistent banner only in enabled mode', () => {
    expect(demoBanner(true)).toBe('نسخه‌ی نمایشی · کسب‌وکارها ساختگی‌اند');
    expect(demoBanner(false)).toBeNull();
  });
});
