import { createAndPublishTestOffer, parseTestOffers, TEST_OFFER_TERMS_SUMMARY } from '../../../tools/test-seed/offers';
import { TestSeedError } from '../../../tools/test-seed/types';
import { OfferService } from '../../../core/offer-service';
import { PublicationService } from '../../../core/publication-service';
import { AuthContext, CORE_AUTH_ISSUER } from '../../../core/auth-context';

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    test_id: 'vanak-81', offer_key: 'test-ui-vanak-sample-1', name: 'پیشنهاد آزمایشی',
    short_description: 'شرح آزمایشی', offer_shape: 'ITEM', on_request: true, valid_from: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function code(input: unknown): string {
  try { parseTestOffers(input); return 'NO_ERROR'; } catch (error) { return error instanceof TestSeedError ? error.code : 'WRONG_ERROR'; }
}

describe('U3 strict sample-offer parser', () => {
  test.each([
    ['shape', {}, 'TEST_SEED_OFFER_INPUT_SHAPE'],
    ['unknown field', [row({ extra: true })], 'TEST_SEED_OFFER_UNKNOWN_FIELD'],
    ['wrong prefix', [row({ offer_key: 'real-offer' })], 'TEST_SEED_OFFER_KEY'],
    ['name marker', [row({ name: 'پیشنهاد' })], 'TEST_SEED_OFFER_NAME'],
    ['description marker', [row({ short_description: 'شرح' })], 'TEST_SEED_OFFER_DESCRIPTION'],
    ['extra terms key', [row({ terms: { schema_version: 'mlino.offer-terms.v1', summary: 'آزمایشی', conditions: [], test_marker: 'forbidden' } })], 'TEST_SEED_OFFER_TERMS_CONTRACT'],
    ['wrong terms schema', [row({ terms: { schema_version: 'wrong', summary: 'آزمایشی', conditions: [] } })], 'TEST_SEED_OFFER_TERMS_CONTRACT'],
    ['empty terms summary', [row({ terms: { schema_version: 'mlino.offer-terms.v1', summary: ' ', conditions: [] } })], 'TEST_SEED_OFFER_TERMS_CONTRACT'],
    ['non-string terms condition', [row({ terms: { schema_version: 'mlino.offer-terms.v1', summary: 'آزمایشی', conditions: [1] } })], 'TEST_SEED_OFFER_TERMS_CONTRACT'],
    ['too many terms conditions', [row({ terms: { schema_version: 'mlino.offer-terms.v1', summary: 'آزمایشی', conditions: Array.from({ length: 31 }, () => 'شرط') } })], 'TEST_SEED_OFFER_TERMS_CONTRACT'],
    ['bad validity window', [row({ valid_until: '2025-01-01T00:00:00Z' })], 'TEST_SEED_OFFER_VALIDITY_WINDOW'],
    ['missing price mode', [row({ on_request: false })], 'TEST_SEED_OFFER_PRICE_MODE'],
    ['on-request with a price pair', [row({ on_request: true, price_amount: 100, price_currency: 'IRR' })], 'TEST_SEED_OFFER_PRICE_MODE'],
  ])('%s rejection has the exact fixed code', (_name, input, expected) => expect(code(input)).toBe(expected));

  test('terms omitted builds contract-valid traceable terms', () => {
    const parsed = parseTestOffers([row()]);
    expect(parsed[0].terms).toEqual({ schema_version: 'mlino.offer-terms.v1', summary: TEST_OFFER_TERMS_SUMMARY, conditions: [] });
  });

  test('accepts contract-valid terms unchanged', () => {
    const terms = { schema_version: 'mlino.offer-terms.v1', summary: 'پیشنهاد آزمایشی با شرایط', conditions: ['فقط امروز'] };
    const parsed = parseTestOffers([row({ terms })]);
    expect(parsed[0].terms).toEqual(terms);
  });

  test('duplicate offer keys are rejected', () => expect(code([row(), row({ test_id: 'vanak-82' })])).toBe('TEST_SEED_OFFER_KEY_DUPLICATE'));

  test('invalid price mode is rejected before any Core call', async () => {
    const coreWasCalled = jest.fn(() => { throw new Error('CORE_MUST_NOT_BE_CALLED'); });
    const offers = { create: coreWasCalled, createVersion: coreWasCalled, linkCapability: coreWasCalled } as unknown as OfferService;
    const publications = { publish: coreWasCalled } as unknown as PublicationService;
    const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId: 'test-vanak-81', identityProvider: 'test-seed', externalSubject: 'vanak-81', membershipId: 'member-1' };
    const invalid = { ...parseTestOffers([row()])[0], on_request: false };
    await expect(createAndPublishTestOffer(offers, publications, context, invalid, [])).rejects.toMatchObject({ code: 'TEST_SEED_OFFER_PRICE_MODE' });
    expect(coreWasCalled).not.toHaveBeenCalled();
  });
});

describe('U3 official Core call sequence', () => {
  test('publishes only the created version after create, createVersion and optional capability link', async () => {
    const calls: string[] = [];
    const offers = {
      async create() { calls.push('create'); return { id: 'offer-1' }; },
      async createVersion() { calls.push('createVersion'); return { id: 'version-1' }; },
      async linkCapability(_context: unknown, input: { offerVersionId: string; capabilityId: string }) {
        calls.push(`link:${input.offerVersionId}:${input.capabilityId}`); return {};
      },
    } as unknown as OfferService;
    const publications = {
      async publish(_context: unknown, target: string, id: string) { calls.push(`publish:${target}:${id}`); return {}; },
    } as unknown as PublicationService;
    const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId: 'test-vanak-81', identityProvider: 'test-seed', externalSubject: 'vanak-81', membershipId: 'member-1' };
    const parsed = parseTestOffers([row({ capability_index: 0 })])[0];
    await createAndPublishTestOffer(offers, publications, context, parsed, ['capability-1']);
    expect(calls).toEqual(['create', 'createVersion', 'link:version-1:capability-1', 'publish:OFFER_VERSION:version-1']);
  });
});
