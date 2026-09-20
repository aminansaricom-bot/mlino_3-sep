import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { OfferService } from '../../core/offer-service';
import { PublicationService } from '../../core/publication-service';
import { SEED_REASON, createSeedPlatformVerifier } from './seed';
import { TestSeedError } from './types';

export const TEST_OFFER_KEY_PREFIX = 'test-ui-vanak-';
export const TEST_OFFER_MARKER = 'MLINO_TEST_UI_OFFER_V1';

type OfferShape = 'ITEM' | 'BUNDLE' | 'CAMPAIGN';

export interface TestOfferInput {
  test_id: string;
  offer_key: string;
  name: string;
  short_description: string;
  offer_shape: OfferShape;
  terms?: Record<string, unknown>;
  price_amount?: number;
  price_currency?: string;
  on_request?: boolean;
  valid_from: string;
  valid_until?: string;
  capability_index?: number;
}

const ALLOWED = new Set([
  'test_id', 'offer_key', 'name', 'short_description', 'offer_shape', 'terms', 'price_amount',
  'price_currency', 'on_request', 'valid_from', 'valid_until', 'capability_index',
]);

function fail(code: string): never { throw new TestSeedError(code); }
function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function iso(value: unknown, code: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(code);
  return value;
}

function parseTerms(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  const terms = object(value);
  if (!terms || terms.test_marker !== TEST_OFFER_MARKER) fail('TEST_SEED_OFFER_MARKER');
  return { ...terms };
}

function parseOne(value: unknown): TestOfferInput {
  const row = object(value);
  if (!row) fail('TEST_SEED_OFFER_INPUT_SHAPE');
  if (Object.keys(row).some((key) => !ALLOWED.has(key))) fail('TEST_SEED_OFFER_UNKNOWN_FIELD');
  if (typeof row.test_id !== 'string' || !/^vanak-\d{2}$/.test(row.test_id)) fail('TEST_SEED_OFFER_TEST_ID');
  if (typeof row.offer_key !== 'string' || !row.offer_key.startsWith(TEST_OFFER_KEY_PREFIX) || row.offer_key.length > 160) fail('TEST_SEED_OFFER_KEY');
  if (typeof row.name !== 'string' || !row.name.trim() || !row.name.includes('آزمایشی') || row.name.length > 200) fail('TEST_SEED_OFFER_NAME');
  if (typeof row.short_description !== 'string' || !row.short_description.trim() || !row.short_description.includes('آزمایشی')) fail('TEST_SEED_OFFER_DESCRIPTION');
  if (!['ITEM', 'BUNDLE', 'CAMPAIGN'].includes(String(row.offer_shape))) fail('TEST_SEED_OFFER_SHAPE');
  const validFrom = iso(row.valid_from, 'TEST_SEED_OFFER_VALID_FROM');
  const validUntil = row.valid_until === undefined ? undefined : iso(row.valid_until, 'TEST_SEED_OFFER_VALID_UNTIL');
  if (validUntil !== undefined && Date.parse(validUntil) <= Date.parse(validFrom)) fail('TEST_SEED_OFFER_VALIDITY_WINDOW');
  if (row.price_amount !== undefined && (typeof row.price_amount !== 'number' || !Number.isFinite(row.price_amount) || row.price_amount < 0)) fail('TEST_SEED_OFFER_PRICE');
  if (row.price_currency !== undefined && (typeof row.price_currency !== 'string' || !/^[A-Z]{3}$/.test(row.price_currency))) fail('TEST_SEED_OFFER_CURRENCY');
  if ((row.price_amount === undefined) !== (row.price_currency === undefined)) fail('TEST_SEED_OFFER_PRICE_PAIR');
  if (row.on_request !== undefined && typeof row.on_request !== 'boolean') fail('TEST_SEED_OFFER_ON_REQUEST');
  if (row.capability_index !== undefined && (!Number.isSafeInteger(row.capability_index) || (row.capability_index as number) < 0)) fail('TEST_SEED_OFFER_CAPABILITY_INDEX');
  return {
    test_id: row.test_id,
    offer_key: row.offer_key,
    name: row.name,
    short_description: row.short_description,
    offer_shape: row.offer_shape as OfferShape,
    terms: parseTerms(row.terms),
    price_amount: row.price_amount as number | undefined,
    price_currency: row.price_currency as string | undefined,
    on_request: row.on_request as boolean | undefined,
    valid_from: validFrom,
    valid_until: validUntil,
    capability_index: row.capability_index as number | undefined,
  };
}

export function parseTestOffers(value: unknown): TestOfferInput[] {
  if (!Array.isArray(value) || value.length === 0) fail('TEST_SEED_OFFER_INPUT_SHAPE');
  const rows = value.map(parseOne);
  const keys = new Set<string>();
  for (const row of rows) {
    if (keys.has(row.offer_key)) fail('TEST_SEED_OFFER_KEY_DUPLICATE');
    keys.add(row.offer_key);
  }
  return rows;
}

export function readTestOffers(path: string): TestOfferInput[] {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); } catch { fail('TEST_SEED_OFFER_INPUT_JSON'); }
  return parseTestOffers(parsed);
}

export async function createAndPublishTestOffer(
  offers: OfferService,
  publications: PublicationService,
  context: AuthContext,
  row: TestOfferInput,
  capabilityIds: readonly string[],
): Promise<void> {
  const offer = await offers.create(context, { organizationId: context.organizationId, offerKey: row.offer_key });
  const version = await offers.createVersion(context, {
    offerId: offer.id,
    name: row.name,
    shortDescription: row.short_description,
    offerShape: row.offer_shape,
    terms: row.terms,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    onRequest: row.on_request,
    validFrom: new Date(row.valid_from),
    validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
  });
  if (row.capability_index !== undefined) {
    const capabilityId = capabilityIds[row.capability_index];
    if (!capabilityId) throw new TestSeedError('TEST_SEED_OFFER_CAPABILITY_NOT_FOUND');
    await offers.linkCapability(context, { offerVersionId: version.id, capabilityId });
  }
  await publications.publish(context, 'OFFER_VERSION', version.id, SEED_REASON);
}

export async function seedTestOffers(db: PrismaClient, rows: TestOfferInput[], env: NodeJS.ProcessEnv = process.env) {
  createSeedPlatformVerifier(env);
  const offers = new OfferService(db);
  const publications = new PublicationService(db);
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const organizationId = `test-${row.test_id}`;
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        memberships: { where: { identityProvider: 'test-seed', membershipStatus: 'ACTIVE' }, take: 1, select: { id: true, externalSubject: true } },
        capabilities: { where: { capabilityStatus: 'ACTIVE' }, orderBy: { capabilityKey: 'asc' }, select: { id: true } },
      },
    });
    if (!organization || organization.memberships.length !== 1) throw new TestSeedError('TEST_SEED_OFFER_ORGANIZATION');
    const existing = await db.offer.findUnique({ where: { organizationId_offerKey: { organizationId, offerKey: row.offer_key } }, select: { id: true } });
    if (existing) { skipped += 1; continue; }
    const member = organization.memberships[0];
    const context: AuthContext = {
      issuer: CORE_AUTH_ISSUER,
      organizationId,
      identityProvider: 'test-seed',
      externalSubject: member.externalSubject,
      membershipId: member.id,
    };
    await createAndPublishTestOffer(offers, publications, context, row, organization.capabilities.map((item) => item.id));
    created += 1;
  }
  return { created, skipped };
}
