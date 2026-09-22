import { readFileSync } from 'node:fs';
import { TestSeedError, VanakBusinessInput } from './types';

const ROOT_KEYS = ['test_id', 'name', 'category_fa', 'description', 'address_text', 'source_url', 'checked_at', 'latitude', 'longitude', 'public_phone', 'website', 'instagram', 'hours', 'services'] as const;
const WEEKDAYS = new Set(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']);
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const CENTER = { latitude: 35.7574, longitude: 51.4096 };

function fail(code: string): never { throw new TestSeedError(code); }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function requiredString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

function containsIranianMobile(value: unknown): boolean {
  if (typeof value === 'string') return /09\d{9}/.test(value);
  if (Array.isArray(value)) return value.some(containsIranianMobile);
  return record(value) && Object.values(value).some(containsIranianMobile);
}

function distanceMeters(latitude: number, longitude: number): number {
  const radius = 6_371_000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(latitude - CENTER.latitude);
  const dLon = radians(longitude - CENTER.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(CENTER.latitude)) * Math.cos(radians(latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseHours(value: unknown): VanakBusinessInput['hours'] {
  if (value === null) return null;
  if (!record(value) || Object.keys(value).some((key) => !WEEKDAYS.has(key))) fail('TEST_SEED_HOURS');
  const result: Record<string, Array<readonly [string, string]>> = {};
  for (const [day, intervals] of Object.entries(value)) {
    if (!Array.isArray(intervals)) fail('TEST_SEED_HOURS');
    const parsed: Array<readonly [string, string]> = [];
    for (const interval of intervals) {
      if (!Array.isArray(interval) || interval.length !== 2 || !interval.every((item) => typeof item === 'string') ||
          !CLOCK.test(interval[0]) || !CLOCK.test(interval[1]) || interval[0] >= interval[1]) fail('TEST_SEED_HOURS');
      parsed.push([interval[0], interval[1]]);
    }
    const sorted = [...parsed].sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.some((item, index) => index > 0 && sorted[index - 1][1] > item[0])) fail('TEST_SEED_HOURS');
    result[day] = parsed;
  }
  return result;
}

function parseOne(value: unknown): VanakBusinessInput {
  if (!record(value)) fail('TEST_SEED_INPUT_SHAPE');
  if (containsIranianMobile(value)) fail('TEST_SEED_MOBILE_FORBIDDEN');
  const keys = Object.keys(value);
  if (keys.some((key) => !(ROOT_KEYS as readonly string[]).includes(key))) fail('TEST_SEED_UNKNOWN_FIELD');
  if (ROOT_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) fail('TEST_SEED_INPUT_SHAPE');
  if (typeof value.test_id !== 'string' || !/^(?:vanak|demo)-\d{2}$/.test(value.test_id)) fail('TEST_SEED_TEST_ID');
  for (const key of ['name', 'category_fa', 'description', 'address_text', 'source_url', 'checked_at'] as const) {
    if (!requiredString(value[key])) fail('TEST_SEED_STRING');
  }
  const sourceUrl = value.source_url as string;
  if (value.test_id.startsWith('demo-')) {
    if (sourceUrl !== 'synthetic://mlino-demo' || !(value.name as string).includes('(آزمایشی)')) fail('TEST_SEED_SOURCE_URL');
  } else if (!sourceUrl.startsWith('https://balad.ir/p/')) fail('TEST_SEED_SOURCE_URL');
  const lat = value.latitude;
  const lon = value.longitude;
  if ((lat === null) !== (lon === null)) fail('TEST_SEED_COORDINATES');
  if (lat !== null && (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || distanceMeters(lat, lon) > 1500)) fail('TEST_SEED_COORDINATES');
  if (value.public_phone !== null && (typeof value.public_phone !== 'string' || !/^0[1-8]\d{9}$/.test(value.public_phone))) fail('TEST_SEED_PHONE');
  for (const key of ['website', 'instagram'] as const) if (value[key] !== null && typeof value[key] !== 'string') fail('TEST_SEED_STRING');
  if (!Array.isArray(value.services) || value.services.length > 3 || value.services.some((item) => !requiredString(item))) fail('TEST_SEED_SERVICES');
  return { ...value, hours: parseHours(value.hours), services: [...value.services] } as VanakBusinessInput;
}

export function parseVanakBusinesses(value: unknown): VanakBusinessInput[] {
  if (!Array.isArray(value)) fail('TEST_SEED_INPUT_SHAPE');
  const rows = value.map(parseOne);
  if (new Set(rows.map((row) => row.test_id)).size !== rows.length) fail('TEST_SEED_TEST_ID_DUPLICATE');
  return rows;
}

export function readVanakBusinesses(path: string): VanakBusinessInput[] {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); } catch { fail('TEST_SEED_INPUT_JSON'); }
  return parseVanakBusinesses(parsed);
}
