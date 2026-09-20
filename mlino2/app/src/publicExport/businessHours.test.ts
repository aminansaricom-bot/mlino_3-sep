import { describe, expect, it } from 'vitest';
import { evaluateBusinessHours, keepOpen } from './businessHours';
import { publicRecord } from './u2Fixtures';
import { toPublicUiRecord } from './uiAdapter';

const monday = (hour: number, minute = 0) => Date.parse(`2026-09-21T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
const weekly = { schema_version: 'mlino.business-hours.v1', timezone: 'UTC', weekly: [{ day: 1, intervals: [{ open: '09:00', close: '17:00' }] }] };

describe('U2 mlino.business-hours.v1 evaluator', () => {
  it.each([
    ['at open', monday(9), 'open'], ['inside', monday(12), 'open'], ['before', monday(8, 59), 'closed'],
    ['at half-open close', monday(17), 'closed'], ['after', monday(18), 'closed'],
    ['missing Tuesday', Date.parse('2026-09-22T12:00:00.000Z'), 'closed'],
    ['Sunday ISO day 7', Date.parse('2026-09-27T12:00:00.000Z'), 'closed'],
    ['unknown when absent', monday(12), 'unknown'],
  ])('u2-hours fixed-clock table: %s', (_name, now, expected) => {
    expect(evaluateBusinessHours(expected === 'unknown' ? null : weekly, now as number)).toBe(expected);
  });

  it('u2-hours uses the artifact timezone and ISO weekday numbering', () => {
    const tehran = { schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran', weekly: [{ day: 1, intervals: [{ open: '12:00', close: '13:00' }] }] };
    expect(evaluateBusinessHours(tehran, Date.parse('2026-09-21T08:45:00.000Z'))).toBe('open');
  });

  it('u2-hours lets an exception override the weekly entry', () => {
    const value = { ...weekly, exceptions: [{ date: '2026-09-21', closed: true }] };
    expect(evaluateBusinessHours(value, monday(12))).toBe('closed');
    const openException = { ...weekly, exceptions: [{ date: '2026-09-21', closed: false, intervals: [{ open: '18:00', close: '20:00' }] }] };
    expect(evaluateBusinessHours(openException, monday(19))).toBe('open');
    expect(evaluateBusinessHours(openException, monday(12))).toBe('closed');
  });

  it('u2-hours handles a midnight-crossing schedule only when split across ISO days', () => {
    const value = { schema_version: 'mlino.business-hours.v1', timezone: 'UTC', weekly: [
      { day: 1, intervals: [{ open: '22:00', close: '23:59' }] }, { day: 2, intervals: [{ open: '00:00', close: '02:00' }] },
    ] };
    expect(evaluateBusinessHours(value, monday(23))).toBe('open');
    expect(evaluateBusinessHours(value, Date.parse('2026-09-22T01:00:00.000Z'))).toBe('open');
  });

  it.each([
    { schema_version: 'future', timezone: 'UTC', weekly: [] },
    { schema_version: 'mlino.business-hours.v1', timezone: 'Mars/Olympus', weekly: [] },
    { schema_version: 'mlino.business-hours.v1', timezone: 'UTC', weekly: [{ day: 1, intervals: [{ open: '17:00', close: '09:00' }] }] },
  ])('u2-hours treats malformed or unknown schemas as unknown', (value) => expect(evaluateBusinessHours(value, monday(12))).toBe('unknown'));

  it('u2-hours open-only filter never treats unknown as open', () => {
    const unknown = toPublicUiRecord(publicRecord({ organization_id: 'unknown', business_hours: null }));
    const open = toPublicUiRecord(publicRecord({ organization_id: 'open', business_hours: weekly }));
    expect(keepOpen([unknown, open], monday(12)).map((record) => record.id)).toEqual(['open']);
  });
});
