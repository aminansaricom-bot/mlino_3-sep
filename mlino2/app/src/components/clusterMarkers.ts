/**
 * خوشه‌بندی مارکرهای نقشه — تابع خالص، بدون وابستگی جدید.
 *
 * چرا خودمان و نه `leaflet.markercluster`: آن کتابخانه یک وابستگی کامل با
 * انیمیشن و رفتار خودش می‌آورد، در حالی که چیزی که واقعاً لازم داریم یک قاعده‌ی
 * قطعی است: «هرچه در همان چند پیکسل صفحه می‌افتد، یکی شود». چون تابع خالص است،
 * می‌شود واقعاً تستش کرد — که با یک کتابخانه‌ی رندر ممکن نبود.
 *
 * قاعده: مختصات جغرافیایی هر رکورد به مختصات پیکسلیِ همان Zoom تبدیل می‌شود
 * (همان تبدیل Web Mercator که خود Leaflet استفاده می‌کند)، بعد روی شبکه‌ای با
 * سلولِ `cellPx` گرد می‌شود. هر سلول یک خوشه است. مرکز خوشه میانگین اعضاست تا
 * مارکر روی جای واقعی بنشیند، نه وسط سلول.
 */

export interface ClusterInput {
  id: string;
  latitude: number;
  longitude: number;
}

export interface Cluster<T extends ClusterInput> {
  /** شناسه‌ی پایدار بین رندرها تا مارکر بی‌دلیل ساخته/حذف نشود */
  key: string;
  latitude: number;
  longitude: number;
  members: T[];
}

const TILE = 256;

/** همان تبدیل استاندارد Web Mercator که Leaflet برای چیدن کاشی‌ها به کار می‌برد */
export function projectToPixel(lat: number, lng: number, zoom: number): [number, number] {
  const scale = TILE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return [x, y];
}

export function clusterByScreenCell<T extends ClusterInput>(
  records: readonly T[],
  zoom: number,
  cellPx = 64,
): Cluster<T>[] {
  const cells = new Map<string, T[]>();

  for (const r of records) {
    const [x, y] = projectToPixel(r.latitude, r.longitude, zoom);
    const cx = Math.floor(x / cellPx);
    const cy = Math.floor(y / cellPx);
    const key = `${cx}:${cy}`;
    const bucket = cells.get(key);
    if (bucket === undefined) cells.set(key, [r]);
    else bucket.push(r);
  }

  const out: Cluster<T>[] = [];
  for (const [, members] of cells) {
    // ترتیب پایدار: شناسه — تا `key` خوشه بین رندرها عوض نشود
    const sorted = [...members].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const lat = sorted.reduce((s, m) => s + m.latitude, 0) / sorted.length;
    const lng = sorted.reduce((s, m) => s + m.longitude, 0) / sorted.length;
    out.push({
      key: sorted.length === 1 ? sorted[0].id : `cluster:${sorted.map((m) => m.id).join(',')}`,
      latitude: lat,
      longitude: lng,
      members: sorted,
    });
  }

  // ترتیب قطعی خروجی — تست‌پذیری و رندر پایدار
  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}
