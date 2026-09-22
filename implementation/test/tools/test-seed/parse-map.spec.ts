import { mapBusinessHours, mapVanakBusiness, TEST_DATA_MARKER } from '../../../tools/test-seed/map';
import { parseVanakBusinesses } from '../../../tools/test-seed/parse';
import { TestSeedError } from '../../../tools/test-seed/types';
import { validBusinessHours } from '../../../public-export/builder';

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    test_id: 'vanak-01', name: 'ساختگی یک', category_fa: 'آزمایشی', description: 'شرح ساختگی',
    address_text: 'نشانی ساختگی', source_url: 'https://balad.ir/p/test-only', checked_at: '2026-09-18T00:00:00Z',
    latitude: 35.7574, longitude: 51.4096, public_phone: null, website: null, instagram: null,
    hours: { شنبه: [['09:00', '17:00']], دوشنبه: [], جمعه: [] }, services: ['خدمت ساختگی'], ...overrides,
  };
}

function code(fn: () => unknown): string {
  try { fn(); return 'NO_ERROR'; } catch (error) { return error instanceof TestSeedError ? error.code : 'WRONG_ERROR'; }
}

describe('S1 strict Vanak test-data parser', () => {
  test.each([
    ['shape', {}, 'TEST_SEED_INPUT_SHAPE'],
    ['unknown', { ...row(), extra: true }, 'TEST_SEED_UNKNOWN_FIELD'],
    ['test id', row({ test_id: 'other' }), 'TEST_SEED_TEST_ID'],
    ['coordinates pair', row({ longitude: null }), 'TEST_SEED_COORDINATES'],
    ['coordinates radius', row({ latitude: 36, longitude: 52 }), 'TEST_SEED_COORDINATES'],
    ['phone', row({ public_phone: '001' }), 'TEST_SEED_PHONE'],
    ['source', row({ source_url: 'https://example.invalid/p/test' }), 'TEST_SEED_SOURCE_URL'],
    ['hours', row({ hours: { شنبه: [['17:00', '09:00']] } }), 'TEST_SEED_HOURS'],
    ['services', row({ services: ['a', 'b', 'c', 'd'] }), 'TEST_SEED_SERVICES'],
  ])('%s rejection has a fixed code', (_name, input, expected) => {
    expect(code(() => parseVanakBusinesses(Array.isArray(input) ? input : [input]))).toBe(expected);
  });

  test('duplicate test_id is rejected', () => {
    expect(code(() => parseVanakBusinesses([row(), row()]))).toBe('TEST_SEED_TEST_ID_DUPLICATE');
  });

  test('mobile-shaped text anywhere in a nested record is rejected without echoing it', () => {
    const forbidden = `09${'1'.repeat(9)}`;
    expect(code(() => parseVanakBusinesses([row({ hours: null, services: [`x ${forbidden}`] })]))).toBe('TEST_SEED_MOBILE_FORBIDDEN');
  });

  test('valid input is parsed', () => expect(parseVanakBusinesses([row()])).toHaveLength(1));
});

describe('S1 mapping', () => {
  test('Persian weekdays map Monday=1 through Sunday=7, and closed days are omitted', () => {
    const hours = mapBusinessHours({ دوشنبه: [['08:00', '09:00']], شنبه: [['10:00', '11:00']], یکشنبه: [], جمعه: [] });
    expect(hours).toEqual({
      schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran',
      weekly: [{ day: 1, intervals: [{ open: '08:00', close: '09:00' }] }, { day: 6, intervals: [{ open: '10:00', close: '11:00' }] }],
    });
    expect(validBusinessHours(hours)).toBe(true);
  });

  test('mapped profile carries marker and omits null contact/link values', () => {
    const mapped = mapVanakBusiness(parseVanakBusinesses([row({ latitude: null, longitude: null })])[0]);
    expect(mapped.organizationId).toBe('test-vanak-01');
    expect(mapped.profile.description.endsWith(TEST_DATA_MARKER)).toBe(true);
    expect(mapped.profile.contactInformation).toEqual({});
    expect(mapped.profile.links).toEqual({});
    expect(mapped.capabilities[0]).toMatchObject({ capabilityKey: 'svc-1', audience: 'CUSTOMER_FACING' });
  });
});
