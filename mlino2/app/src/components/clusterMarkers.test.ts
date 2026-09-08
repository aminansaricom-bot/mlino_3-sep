import { describe, expect, it } from 'vitest';
import { clusterByScreenCell, projectToPixel } from './clusterMarkers';

const artaLat = 35.7568;
const artaLng = 51.4108;

/** چند نقطه‌ی بسیار نزدیک (چند ده متر) — همان الگوی واقعی ساختمان آرتا */
const dense = [
  { id: 'a', latitude: artaLat, longitude: artaLng },
  { id: 'b', latitude: artaLat + 0.00012, longitude: artaLng + 0.00008 },
  { id: 'c', latitude: artaLat - 0.0001, longitude: artaLng + 0.00005 },
];

/** یک نقطه‌ی دور — کیلومترها آن‌طرف‌تر */
const far = { id: 'z', latitude: 35.81, longitude: 51.46 };

describe('خوشه‌بندی مارکرهای نقشه', () => {
  it('در Zoom پایین نقاط نزدیک به هم یک خوشه می‌شوند', () => {
    const clusters = clusterByScreenCell([...dense, far], 12);
    const withMany = clusters.filter((c) => c.members.length > 1);
    expect(withMany).toHaveLength(1);
    expect(withMany[0].members.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('نقطه‌ی دور هرگز وارد خوشه‌ی نقاط نزدیک نمی‌شود', () => {
    const clusters = clusterByScreenCell([...dense, far], 12);
    const lone = clusters.find((c) => c.members.some((m) => m.id === 'z'));
    expect(lone!.members).toHaveLength(1);
  });

  it('در Zoom بالا خوشه باز می‌شود و هر رکورد مارکر خودش را دارد', () => {
    const clusters = clusterByScreenCell([...dense, far], 20);
    expect(clusters).toHaveLength(4);
    expect(clusters.every((c) => c.members.length === 1)).toBe(true);
  });

  it('مرکز خوشه میانگین اعضاست، نه وسط سلول', () => {
    const [cluster] = clusterByScreenCell(dense, 12).filter((c) => c.members.length > 1);
    const meanLat = dense.reduce((s, d) => s + d.latitude, 0) / dense.length;
    expect(cluster.latitude).toBeCloseTo(meanLat, 9);
  });

  it('کلید خوشه بین دو فراخوانی با ترتیب ورودی متفاوت یکسان می‌ماند', () => {
    const one = clusterByScreenCell(dense, 12);
    const two = clusterByScreenCell([...dense].reverse(), 12);
    expect(two.map((c) => c.key)).toEqual(one.map((c) => c.key));
  });

  it('ورودی خالی خروجی خالی می‌دهد — بدون خوشه‌ی ساختگی', () => {
    expect(clusterByScreenCell([], 14)).toEqual([]);
  });

  it('تصویر Mercator با افزایش Zoom دقیقاً دو برابر می‌شود', () => {
    const [x1, y1] = projectToPixel(artaLat, artaLng, 10);
    const [x2, y2] = projectToPixel(artaLat, artaLng, 11);
    expect(x2).toBeCloseTo(x1 * 2, 6);
    expect(y2).toBeCloseTo(y1 * 2, 6);
  });
});
