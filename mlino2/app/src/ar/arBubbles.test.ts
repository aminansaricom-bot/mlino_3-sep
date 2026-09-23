import { describe, expect, it } from 'vitest';
import { clampRadius, radiusFromRatio, RADIUS_MAX, RADIUS_MIN } from './RadiusDial';
import { layoutBubbles } from './ArBubbles';
import type { ArVitrineItem } from './ArOverlayService';

describe('radius dial', () => {
  it('maps the vertical position to 15..200 m in 5 m steps (top = far)', () => {
    expect(radiusFromRatio(0)).toBe(RADIUS_MAX);
    expect(radiusFromRatio(1)).toBe(RADIUS_MIN);
    expect(radiusFromRatio(-3)).toBe(RADIUS_MAX);
    expect(radiusFromRatio(9)).toBe(RADIUS_MIN);
    for (let r = 0; r <= 1; r += 0.07) {
      const v = radiusFromRatio(r);
      expect((v - RADIUS_MIN) % 5).toBe(0);
      expect(v).toBeGreaterThanOrEqual(RADIUS_MIN);
      expect(v).toBeLessThanOrEqual(RADIUS_MAX);
    }
  });
  it('clamps any old radius into the dial range', () => {
    expect(clampRadius(30)).toBe(30);
    expect(clampRadius(100)).toBe(100);
    expect(clampRadius(5)).toBe(15);
    expect(clampRadius(1000)).toBe(200);
    expect(clampRadius(33)).toBe(35);
  });
});

function item(id: string, distance: number, x: number, offer = false): ArVitrineItem {
  return { businessId: id, name: id, category: 'cafe', distanceMeters: distance, activeProducts: [],
    activeOffer: offer ? { offer_id: 'o', title: 't', discount_percent: null } : null,
    placement: { relativeBearingDeg: 0, screenXPercent: x, scaleBucket: 'near' } };
}

describe('3D bubble layout', () => {
  const layout = layoutBubbles([item('near', 10, 50), item('far', 180, 50), item('mid', 90, 20)], 200);
  const get = (id: string) => layout.find((spot) => spot.businessId === id)!;

  it('nearer businesses are bigger, lower on screen and drawn on top', () => {
    expect(get('near').size).toBeGreaterThan(get('mid').size);
    expect(get('mid').size).toBeGreaterThan(get('far').size);
    expect(get('near').topPercent).toBeGreaterThan(get('far').topPercent);
    expect(get('near').depth).toBeGreaterThan(get('far').depth);
  });
  it('horizontal position follows the real bearing and stays inside the frame', () => {
    expect(get('mid').leftPercent).toBe(20);
    const edge = layoutBubbles([item('edge', 30, 100), item('edge2', 30, -4)], 100);
    expect(edge.every((spot) => spot.leftPercent >= 8 && spot.leftPercent <= 92)).toBe(true);
  });
  it('is stable for the same input', () => {
    expect(layoutBubbles([item('a', 40, 30), item('b', 40, 31)], 100)).toEqual(layoutBubbles([item('a', 40, 30), item('b', 40, 31)], 100));
  });
});
