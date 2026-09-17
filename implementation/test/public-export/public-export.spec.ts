import { generateKeyPairSync, KeyObject } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { buildPublicExport, validBusinessHours, validTerms } from '../../public-export/builder';
import { canonicalBytes } from '../../public-export/canonical';
import { runPublicExportCli } from '../../public-export/cli';
import { SigningKeyProvider, VerificationKeyProvider, verifyEnvelope } from '../../public-export/signing';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const keyProvider: SigningKeyProvider & VerificationKeyProvider = {
  privateKey: async (keyId: string): Promise<KeyObject> => { if (keyId !== 'test-v1') throw new Error('TEST_UNKNOWN_KEY'); return privateKey; },
  publicKey: async (keyId: string): Promise<KeyObject | null> => keyId === 'test-v1' ? publicKey : null,
};
const asOf = '2026-09-17T12:00:00.000Z';
const date = (value: string) => new Date(value);
const publishedAt = date('2026-09-17T11:00:00.000Z');
const snapshot = (content: Record<string, unknown>) => ({ snapshot_version: 'core-publication-snapshot-v1', content });
type TestEvent = { id: string; organizationId: string; businessProfileId: string | null; capabilityId: string | null; offerVersionId: string | null; eventKind: 'PUBLISHED' | 'WITHDRAWN'; contentRevision: number | null; publishedContent: unknown; occurredAt: Date };

function fixture() {
  const organization = { id: 'org-a', lifecycleStatus: 'ACTIVE' };
  const profile = { id: 'profile-a', organizationId: 'org-a', lifecycleStatus: 'ACTIVE', businessIdentityClaimId: 'claim-a', name: 'LIVE NAME MUST NOT LEAK' };
  const claim = { id: 'claim-a', organizationId: 'org-a', claimStatus: 'VERIFIED', validUntil: null as Date | null };
  const capability = { id: 'cap-a', organizationId: 'org-a', capabilityStatus: 'ACTIVE', audience: 'CUSTOMER_FACING', confirmationStatus: 'HUMAN_CONFIRMED', freshUntil: null as Date | null, name: 'LIVE CAPABILITY MUST NOT LEAK' };
  const version = { id: 'version-a', organizationId: 'org-a', offerId: 'offer-a', offer: { organizationId: 'org-a', lifecycleStatus: 'ACTIVE' } };
  const profileContent = { name: 'Snapshot Business', description: null, latitude: 35.123456, longitude: 51.123456, address_text: 'Public address', contact_information: { public_phone: '123', private_phone: 'secret' }, links: { website: 'https://example.test', hidden: 'secret' }, business_hours: null };
  const capabilityContent = { capability_key: 'service-a', name: 'Snapshot Capability', short_description: null, audience: 'CUSTOMER_FACING' };
  const offerContent = { offer_id: 'offer-a', version_number: 1, name: 'Snapshot Offer', short_description: null, offer_shape: 'FIXED', terms: null, price_amount: '1200.00', price_currency: 'USD', on_request: false, valid_from: '2026-09-17T00:00:00.000Z', valid_until: null, capability_link_ids: ['cap-a'] };
  const events: TestEvent[] = [
    { id: 'pub-p', organizationId: 'org-a', businessProfileId: 'profile-a', capabilityId: null, offerVersionId: null, eventKind: 'PUBLISHED', contentRevision: 1, publishedContent: snapshot(profileContent), occurredAt: publishedAt },
    { id: 'pub-c', organizationId: 'org-a', businessProfileId: null, capabilityId: 'cap-a', offerVersionId: null, eventKind: 'PUBLISHED', contentRevision: 2, publishedContent: snapshot(capabilityContent), occurredAt: publishedAt },
    { id: 'pub-o', organizationId: 'org-a', businessProfileId: null, capabilityId: null, offerVersionId: 'version-a', eventKind: 'PUBLISHED', contentRevision: null, publishedContent: snapshot(offerContent), occurredAt: publishedAt },
  ];
  const tables = { events, organizations: [organization], profiles: [profile], claims: [claim], capabilities: [capability], versions: [version] };
  const tx = {
    $executeRawUnsafe: jest.fn(async (statement: string) => { if (statement !== 'SET TRANSACTION READ ONLY') throw new Error('UNSAFE_TRANSACTION'); }),
    publication: { findMany: jest.fn(async () => tables.events) },
    organization: { findMany: jest.fn(async () => tables.organizations) },
    businessProfile: { findMany: jest.fn(async () => tables.profiles) },
    businessIdentityClaim: { findMany: jest.fn(async () => tables.claims) },
    capability: { findMany: jest.fn(async () => tables.capabilities) },
    offerVersion: { findMany: jest.fn(async () => tables.versions) },
  };
  const db = { $transaction: jest.fn(async (fn: (transaction: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  return { db, tx, tables, profileContent, offerContent };
}

async function build(db: PrismaClient, at = asOf, onIssue?: (issue: { code: string; organization_id?: string }) => void) {
  return buildPublicExport(db, { asOf: at, keyId: 'test-v1', signingKeyProvider: keyProvider, onIssue });
}

describe('G14b-2 public export', () => {
  test('Q1 Ed25519 verifies and one-byte tamper fails; key_id is signed, value excluded', async () => {
    const { db } = fixture();
    const { artifact } = await build(db);
    expect(await verifyEnvelope(artifact, keyProvider)).toBe(true);
    expect(await verifyEnvelope({ ...artifact, generated_at: '2026-09-17T12:00:00.001Z' }, keyProvider)).toBe(false);
    expect(await verifyEnvelope({ ...artifact, signature: { ...artifact.signature, key_id: 'other' } }, keyProvider)).toBe(false);
    expect(await verifyEnvelope({ ...artifact, signature: { ...artifact.signature, value: 'AAAA' } }, keyProvider)).toBe(false);
  });

  test('Q2 unknown key fails closed and ephemeral keys never enter artifact', async () => {
    const { db } = fixture();
    const { artifact, bytes } = await build(db);
    expect(await verifyEnvelope(artifact, { publicKey: async () => null })).toBe(false);
    expect(bytes.toString()).not.toContain('PRIVATE KEY');
  });

  test('Q3 CLI preserves current on signing failure and writes an artifact outside repository', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mlino-export-'));
    try {
      const { db } = fixture();
      const env = { MLINO_EXPORT_OUTPUT_DIR: directory, MLINO_EXPORT_KEY_ID: 'test-v1', MLINO_EXPORT_AS_OF: asOf };
      await runPublicExportCli({ db, keyProvider, env, log: () => undefined });
      const current = path.join(directory, 'public-business.v1.json');
      const original = await readFile(current);
      await expect(runPublicExportCli({ db, keyProvider: { ...keyProvider, privateKey: async () => { throw new Error('signing failed'); } }, env, log: () => undefined })).rejects.toThrow();
      expect(await readFile(current)).toEqual(original);
      await runPublicExportCli({ db, keyProvider, env, log: () => undefined });
      expect(await readFile(path.join(directory, 'public-business.v1.previous-1.json'))).toEqual(original);
      await runPublicExportCli({ db, keyProvider, env, log: () => undefined });
      expect(await readFile(path.join(directory, 'public-business.v1.previous-2.json'))).toEqual(original);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  test('Q4 export stale flag is signed and cannot be edited by polling consumer', async () => {
    const { db } = fixture();
    const { artifact } = await build(db);
    expect(artifact.records[0].stale).toBe(false);
    expect(await verifyEnvelope({ ...artifact, records: [{ ...artifact.records[0], stale: true }] }, keyProvider)).toBe(false);
  });

  test('Q5 invalid business_hours becomes null and reports only a reason code', async () => {
    const sample = fixture();
    sample.profileContent.business_hours = { unexpected: 'secret' } as never;
    const issues: Array<{ code: string; organization_id?: string }> = [];
    const { artifact } = await build(sample.db, asOf, (issue) => issues.push(issue));
    expect(artifact.records[0].business.business_hours).toBeNull();
    expect(issues).toEqual([{ code: 'INVALID_BUSINESS_HOURS' }]);
    expect(validBusinessHours({ schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran', weekly: [{ day: 1, intervals: [{ open: '09:00', close: '17:00' }] }] })).toBe(true);
  });

  test('Q6 invalid terms drops only that offer and null terms remains allowed', async () => {
    const sample = fixture();
    sample.offerContent.terms = { summary: 'secret' } as never;
    const { artifact } = await build(sample.db);
    expect(artifact.records[0].offers).toEqual([]);
    expect(validTerms({ schema_version: 'mlino.offer-terms.v1', summary: 'Terms', conditions: ['One'] })).toBe(true);
    expect(validTerms(null)).toBe(true);
  });

  test('Q7 and Q9 live fresh_until is metadata and stale or unconfirmed capability is hidden', async () => {
    const sample = fixture();
    sample.tables.capabilities[0].freshUntil = date('2026-09-18T00:00:00.000Z');
    const first = (await build(sample.db)).artifact.records[0];
    expect(first.capabilities[0].fresh_until).toBe('2026-09-18T00:00:00.000Z');
    sample.tables.capabilities[0].freshUntil = date('2026-09-16T00:00:00.000Z');
    const second = (await build(sample.db)).artifact.records[0];
    expect(second.capabilities).toEqual([]);
    expect(second.offers[0].capability_links).toEqual([]);
    sample.tables.capabilities[0].freshUntil = null;
    sample.tables.capabilities[0].confirmationStatus = 'UNCONFIRMED';
    expect((await build(sample.db)).artifact.records[0].capabilities).toEqual([]);
  });

  test('Q8 two published profiles omit entire organization with reason code', async () => {
    const sample = fixture();
    sample.tables.events.push({ ...sample.tables.events[0], id: 'pub-p-2', businessProfileId: 'profile-b' });
    const issues: Array<{ code: string; organization_id?: string }> = [];
    const { artifact } = await build(sample.db, asOf, (issue) => issues.push(issue));
    expect(artifact.records).toEqual([]);
    expect(issues).toContainEqual({ code: 'MULTIPLE_PUBLISHED_PROFILES', organization_id: 'org-a' });
  });

  test('Q10 same data and as_of yield identical bytes; different as_of only changes generated_at and signature', async () => {
    const { db } = fixture();
    const one = await build(db);
    const two = await build(db);
    expect(one.bytes).toEqual(two.bytes);
    const later = await build(db, '2026-09-17T12:00:01.000Z');
    expect(later.artifact.records).toEqual(one.artifact.records);
    expect(later.artifact.snapshot_id).toBe(one.artifact.snapshot_id);
    expect(later.artifact.generated_at).not.toBe(one.artifact.generated_at);
    expect(later.artifact.signature.value).not.toBe(one.artifact.signature.value);
  });

  test('E1 withdrawn and tied newer events suppress older snapshots', async () => {
    const sample = fixture();
    sample.tables.events.push({ ...sample.tables.events[1], id: 'zzz', eventKind: 'WITHDRAWN', publishedContent: null });
    const { artifact } = await build(sample.db);
    expect(artifact.records[0].capabilities).toEqual([]);
    expect(artifact.records[0].offers[0].capability_links).toEqual([]);
  });

  test('E1 replacement keeps only the latest published OfferVersion, with withdrawn old version hidden', async () => {
    const sample = fixture();
    sample.tables.versions.push({ id: 'version-b', organizationId: 'org-a', offerId: 'offer-a', offer: { organizationId: 'org-a', lifecycleStatus: 'ACTIVE' } });
    sample.tables.events.push({ ...sample.tables.events[2], id: 'pub-o-withdraw', eventKind: 'WITHDRAWN', publishedContent: null, occurredAt: date('2026-09-17T11:10:00.000Z') });
    sample.tables.events.push({ ...sample.tables.events[2], id: 'pub-o-new', offerVersionId: 'version-b', publishedContent: snapshot({ ...sample.offerContent, version_number: 2, name: 'New version' }), occurredAt: date('2026-09-17T11:11:00.000Z') });
    const { artifact } = await build(sample.db);
    expect(artifact.records[0].offers.map((offer) => offer.offer_version_id)).toEqual(['version-b']);
    expect(artifact.records[0].offers[0].name).toBe('New version');
  });

  test('expired claim, retired capability and future or expired offer validity hide content', async () => {
    const sample = fixture();
    sample.tables.claims[0].validUntil = date('2026-09-17T11:59:00.000Z');
    expect((await build(sample.db)).artifact.records).toEqual([]);
    sample.tables.claims[0].validUntil = null;
    sample.tables.capabilities[0].capabilityStatus = 'RETIRED';
    expect((await build(sample.db)).artifact.records[0].capabilities).toEqual([]);
    sample.offerContent.valid_from = '2026-09-18T00:00:00.000Z';
    expect((await build(sample.db)).artifact.records[0].offers).toEqual([]);
    sample.offerContent.valid_from = '2026-09-16T00:00:00.000Z';
    sample.offerContent.valid_until = '2026-09-17T12:00:00.000Z' as never;
    expect((await build(sample.db)).artifact.records[0].offers).toEqual([]);
  });

  test('cross-organization live eligibility cannot expose another tenant and logs contain no secret', async () => {
    const sample = fixture();
    sample.tables.capabilities[0].organizationId = 'org-b';
    const issues: Array<{ code: string }> = [];
    sample.profileContent.business_hours = { invalid: 'sensitive-token' } as never;
    const { artifact } = await build(sample.db, asOf, (issue) => issues.push(issue));
    expect(artifact.records[0].capabilities).toEqual([]);
    expect(artifact.records[0].offers[0].capability_links).toEqual([]);
    expect(JSON.stringify(issues)).not.toContain('sensitive-token');
    expect(JSON.stringify(issues)).not.toContain('postgresql://');
    expect(issues).toEqual([{ code: 'INVALID_BUSINESS_HOURS' }]);
  });

  test('E4 canonical bytes normalize Unicode, coordinate negative zero and distinguish null from omission', () => {
    expect(canonicalBytes({ é: 'e\u0301', a: -0 }).toString('utf8')).toBe('{"a":0,"é":"é"}');
    expect(canonicalBytes({ a: null }).toString()).not.toBe(canonicalBytes({}).toString());
    expect(() => canonicalBytes({ a: '\uD800' })).toThrow('PUBLIC_EXPORT_INVALID_UNICODE');
    expect(() => canonicalBytes({ a: 1.1234567 })).toThrow('PUBLIC_EXPORT_NUMBER_PRECISION');
    expect(canonicalBytes({ a: 1 }).at(-1)).not.toBe(10);
  });

  test('eligibility hides archived organization/profile, unverified claim, internal capability and retired offer', async () => {
    const sample = fixture();
    sample.tables.organizations[0].lifecycleStatus = 'ARCHIVED';
    expect((await build(sample.db)).artifact.records).toEqual([]);
    sample.tables.organizations[0].lifecycleStatus = 'ACTIVE';
    sample.tables.profiles[0].lifecycleStatus = 'ARCHIVED';
    expect((await build(sample.db)).artifact.records).toEqual([]);
    sample.tables.profiles[0].lifecycleStatus = 'ACTIVE';
    sample.tables.claims[0].claimStatus = 'SUSPENDED';
    expect((await build(sample.db)).artifact.records).toEqual([]);
    sample.tables.claims[0].claimStatus = 'VERIFIED';
    sample.tables.capabilities[0].audience = 'INTERNAL';
    sample.tables.versions[0].offer.lifecycleStatus = 'RETIRED';
    const record = (await build(sample.db)).artifact.records[0];
    expect(record.capabilities).toEqual([]);
    expect(record.offers).toEqual([]);
    expect(record.business.name).toBe('Snapshot Business');
    expect(canonicalBytes(record).toString()).not.toContain('LIVE NAME MUST NOT LEAK');
    expect(canonicalBytes(record).toString()).not.toContain('private_phone');
  });

  test('real PostgreSQL builder runs in one read-only transaction without changing publications', async () => {
    const db = new PrismaClient();
    try {
      const before = await db.publication.count();
      const { artifact } = await build(db);
      const after = await db.publication.count();
      expect(after).toBe(before);
      expect(await verifyEnvelope(artifact, keyProvider)).toBe(true);
    } finally { await db.$disconnect(); }
  });
});
