import type { PublicUiRecord } from './uiAdapter';

export type OpenNowResult = 'open' | 'closed' | 'unknown';

type Interval = Readonly<{ open: string; close: string }>;
type WeeklyDay = Readonly<{ day: number; intervals: readonly Interval[] }>;
type ExceptionDay = Readonly<{ date: string; closed: boolean; intervals?: readonly Interval[] }>;
type BusinessHoursV1 = Readonly<{
  schema_version: 'mlino.business-hours.v1';
  timezone: string;
  weekly: readonly WeeklyDay[];
  exceptions?: readonly ExceptionDay[];
}>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d\d-\d\d$/;
const WEEKDAY: Readonly<Record<string, number>> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function parseIntervals(value: unknown): readonly Interval[] | null {
  if (!Array.isArray(value)) return null;
  const result: Interval[] = [];
  for (const raw of value) {
    const item = object(raw);
    if (!item || !exactKeys(item, ['open', 'close']) || typeof item.open !== 'string' || typeof item.close !== 'string'
      || !TIME.test(item.open) || !TIME.test(item.close) || item.open >= item.close) return null;
    result.push({ open: item.open, close: item.close });
  }
  const sorted = [...result].sort((a, b) => a.open.localeCompare(b.open));
  if (sorted.some((item, index) => index > 0 && sorted[index - 1].close > item.open)) return null;
  return result;
}

function parseHours(value: unknown): BusinessHoursV1 | null {
  const root = object(value);
  if (!root || !exactKeys(root, ['schema_version', 'timezone', 'weekly', 'exceptions'])
    || root.schema_version !== 'mlino.business-hours.v1' || typeof root.timezone !== 'string'
    || !Array.isArray(root.weekly) || root.weekly.length > 7) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone: root.timezone }).format(0); } catch { return null; }
  const weekly: WeeklyDay[] = [];
  const seenDays = new Set<number>();
  for (const raw of root.weekly) {
    const item = object(raw);
    const intervals = item ? parseIntervals(item.intervals) : null;
    if (!item || !exactKeys(item, ['day', 'intervals']) || !Number.isInteger(item.day)
      || (item.day as number) < 1 || (item.day as number) > 7 || seenDays.has(item.day as number) || intervals === null) return null;
    seenDays.add(item.day as number);
    weekly.push({ day: item.day as number, intervals });
  }
  let exceptions: ExceptionDay[] | undefined;
  if (root.exceptions !== undefined) {
    if (!Array.isArray(root.exceptions)) return null;
    exceptions = [];
    const dates = new Set<string>();
    for (const raw of root.exceptions) {
      const item = object(raw);
      if (!item || !exactKeys(item, ['date', 'closed', 'intervals']) || typeof item.date !== 'string'
        || !DATE.test(item.date) || dates.has(item.date) || typeof item.closed !== 'boolean') return null;
      const intervals = item.intervals === undefined ? undefined : parseIntervals(item.intervals);
      if (intervals === null || (!item.closed && intervals === undefined)) return null;
      dates.add(item.date);
      exceptions.push({ date: item.date, closed: item.closed, ...(intervals === undefined ? {} : { intervals }) });
    }
  }
  return { schema_version: 'mlino.business-hours.v1', timezone: root.timezone, weekly, ...(exceptions ? { exceptions } : {}) };
}

function zonedParts(now: number, timeZone: string): { date: string; weekday: number; time: string } | null {
  if (!Number.isFinite(now)) return null;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(now));
  } catch { return null; }
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = get('year'), month = get('month'), day = get('day'), weekday = get('weekday'), hour = get('hour'), minute = get('minute');
  if (!year || !month || !day || !weekday || !hour || !minute || WEEKDAY[weekday] === undefined) return null;
  return { date: `${year}-${month}-${day}`, weekday: WEEKDAY[weekday], time: `${hour}:${minute}` };
}

export function evaluateBusinessHours(value: unknown, now: number): OpenNowResult {
  if (value === null) return 'unknown';
  const hours = parseHours(value);
  if (!hours) return 'unknown';
  const local = zonedParts(now, hours.timezone);
  if (!local) return 'unknown';
  const exception = hours.exceptions?.find((item) => item.date === local.date);
  if (exception?.closed) return 'closed';
  const intervals = exception ? exception.intervals! : hours.weekly.find((item) => item.day === local.weekday)?.intervals;
  if (!intervals) return 'closed';
  return intervals.some((interval) => interval.open <= local.time && local.time < interval.close) ? 'open' : 'closed';
}

export function openNow(record: Pick<PublicUiRecord, 'businessHours'>, now: number): OpenNowResult {
  return evaluateBusinessHours(record.businessHours, now);
}

export function keepOpen(records: readonly PublicUiRecord[], now: number): PublicUiRecord[] {
  return records.filter((record) => openNow(record, now) === 'open');
}
