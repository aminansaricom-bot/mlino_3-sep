import { parseVanakBusinesses } from '../../../tools/test-seed/parse';
import { parseTestOffers } from '../../../tools/test-seed/offers';
import { isTestSeedOrganizationId } from '../../../tools/test-seed/withdraw';
import { mapVanakBusiness } from '../../../tools/test-seed/map';
import { TestSeedError } from '../../../tools/test-seed/types';

const business = (overrides: Record<string, unknown> = {}) => ({
  test_id: 'demo-01', name: 'کافه (آزمایشی)', category_fa: 'کافه', description: 'ساختگی',
  address_text: 'ساختگی', source_url: 'synthetic://mlino-demo', checked_at: '2026-09-22T00:00:00Z',
  latitude: 35.7575, longitude: 51.4098, public_phone: null, website: null, instagram: null,
  hours: null, services: ['خدمت آزمایشی'], ...overrides,
});
const offer = (overrides: Record<string, unknown> = {}) => ({
  test_id: 'demo-01', offer_key: 'test-ui-vanak-demo-01', name: 'پیشنهاد (آزمایشی)',
  short_description: 'شرح آزمایشی', offer_shape: 'ITEM', on_request: true,
  valid_from: '2026-09-22T00:00:00Z', ...overrides,
});
const code = (run: () => unknown) => {
  try { run(); return 'OK'; } catch (error) { return error instanceof TestSeedError ? error.code : 'WRONG_ERROR'; }
};

describe('K6a demo cluster parser and scope', () => {
  test('accepts demo only with synthetic source and marker, maps test-demo id', () => {
    const parsed = parseVanakBusinesses([business()])[0];
    expect(mapVanakBusiness(parsed).organizationId).toBe('test-demo-01');
    expect(mapVanakBusiness(parsed).profile.description).toContain('ساختگی');
  });
  test.each([
    ['demo with balad source', business({ source_url: 'https://balad.ir/p/other' }), 'TEST_SEED_SOURCE_URL'],
    ['demo without marker', business({ name: 'کافه' }), 'TEST_SEED_SOURCE_URL'],
    ['vanak with synthetic source', business({ test_id: 'vanak-01' }), 'TEST_SEED_SOURCE_URL'],
    ['demo outside radius', business({ latitude: 36 }), 'TEST_SEED_COORDINATES'],
    ['bad id', business({ test_id: 'demo-1' }), 'TEST_SEED_TEST_ID'],
  ])('%s rejected', (_label, row, expected) => expect(code(() => parseVanakBusinesses([row]))).toBe(expected));
  test('vanak Balad input still accepted', () => {
    expect(code(() => parseVanakBusinesses([business({ test_id: 'vanak-01', source_url: 'https://balad.ir/p/test' })]))).toBe('OK');
  });
  test('offer parser accepts both ids and rejects unrelated ids', () => {
    expect(code(() => parseTestOffers([offer()]))).toBe('OK');
    expect(code(() => parseTestOffers([offer({ test_id: 'vanak-01' })]))).toBe('OK');
    expect(code(() => parseTestOffers([offer({ test_id: 'other-01' })]))).toBe('TEST_SEED_OFFER_TEST_ID');
  });
  test('withdraw scope contains only the two test organization prefixes', () => {
    expect(isTestSeedOrganizationId('test-demo-01')).toBe(true);
    expect(isTestSeedOrganizationId('test-vanak-01')).toBe(true);
    expect(isTestSeedOrganizationId('real-organization')).toBe(false);
  });
});
