import type { PublicUiRecord } from '../publicExport/uiAdapter';

export type Point = readonly [latitude: number, longitude: number];
export const DEFAULT_DEMO_ANCHOR: Point = [35.7575, 51.4098];
const EARTH_RADIUS_METRES = 6_371_000;
const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (radiansValue: number) => radiansValue * 180 / Math.PI;

export function validPoint(point: Point): boolean {
  return Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= -90 && point[0] <= 90 && point[1] >= -180 && point[1] <= 180;
}

export function parseDemoAnchor(value: string | undefined): Point {
  if (value === undefined || value === '') return DEFAULT_DEMO_ANCHOR;
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+),[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
    throw new Error('DEMO_ANCHOR_INVALID');
  }
  const [latitude, longitude] = value.split(',').map(Number);
  const point: Point = [latitude, longitude];
  if (!validPoint(point) || Math.abs(latitude) === 90) throw new Error('DEMO_ANCHOR_INVALID');
  return point;
}

export function isDemoRecord(record: PublicUiRecord): boolean {
  return record.id.startsWith('test-demo-');
}

/** Only the presentation record is copied. Neither the signed record nor its consumer is changed. */
export function relocate(records: readonly PublicUiRecord[], anchor: Point, target: Point): PublicUiRecord[] {
  if (!validPoint(anchor) || !validPoint(target) || Math.abs(anchor[0]) === 90) {
    throw new Error('DEMO_TARGET_INVALID');
  }
  const anchorLatitude = radians(anchor[0]);
  return records.map((record) => {
    if (!isDemoRecord(record) || !record.coordinates) return record;
    const north = EARTH_RADIUS_METRES * radians(record.coordinates.latitude - anchor[0]);
    const east = EARTH_RADIUS_METRES * Math.cos(anchorLatitude) * radians(record.coordinates.longitude - anchor[1]);
    const distance = Math.hypot(east, north);
    const bearing = Math.atan2(east, north);
    const angular = distance / EARTH_RADIUS_METRES;
    const latitude = radians(target[0]);
    const longitude = radians(target[1]);
    const movedLatitude = Math.asin(Math.sin(latitude) * Math.cos(angular) + Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing));
    const movedLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude),
      Math.cos(angular) - Math.sin(latitude) * Math.sin(movedLatitude));
    const normalizedLongitude = ((degrees(movedLongitude) + 540) % 360) - 180;
    return { ...record, coordinates: { latitude: degrees(movedLatitude), longitude: normalizedLongitude } };
  });
}

export function visibleDemoRecords(records: readonly PublicUiRecord[], target: Point | null): PublicUiRecord[] {
  return target ? [...records] : records.filter((record) => !isDemoRecord(record));
}

export function presentationRecords(
  records: readonly PublicUiRecord[], enabled: boolean, anchor: Point, target: Point | null,
  move: typeof relocate = relocate,
): readonly PublicUiRecord[] {
  if (!enabled) return records;
  return target ? move(records, anchor, target) : visibleDemoRecords(records, null);
}

export function nextDemoTarget(current: Point | null, fix: Point): Point | null {
  return current ?? (validPoint(fix) ? fix : null);
}

export function reanchorDemoTarget(fix: Point | null): Point | null {
  return fix && validPoint(fix) ? fix : null;
}

export const DEMO_BANNER = 'نسخه‌ی نمایشی · کسب‌وکارها ساختگی‌اند';
export function demoBanner(enabled: boolean): string | null {
  return enabled ? DEMO_BANNER : null;
}
