import { CapabilityAudience, EvidenceSourceKind, OfferShape } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CapabilityService } from '../../core/capability-service';
import { CoreDomainError } from '../../core/errors';
import { EvidenceService } from '../../core/evidence-service';
import { OfferService } from '../../core/offer-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `g10e-${Date.now()}-`;

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:g10e' };
  }
}

const verifier = new FakePlatformIdentityVerifier();
const bootstrap = new BootstrapService(prisma, verifier);
const evidence = new EvidenceService(prisma);
const capabilities = new CapabilityService(prisma);
const offers = new OfferService(prisma);
const publications = new PublicationService(prisma);
const grants = new PermissionGrantService(prisma, verifier);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function newOrganization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'g10e-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, context: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
}

function expectCode(action: Promise<unknown>, code: CoreDomainError['code']) {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

async function capabilityFixture(label: string) {
  const organization = await newOrganization(label);
  const capability = await capabilities.create(organization.context, { organizationId: organization.organizationId, capabilityKey: `${label}-capability`, name: 'Capability', categoryKey: 'test', audience: CapabilityAudience.CUSTOMER_FACING });
  return { ...organization, capability };
}

async function offerVersionFixture(label: string) {
  const organization = await capabilityFixture(label);
  const offer = await offers.create(organization.context, { organizationId: organization.organizationId, offerKey: `${label}-offer` });
  const version = await offers.createVersion(organization.context, { offerId: offer.id, name: 'Offer version', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-01-01T00:00:00.000Z') });
  await publications.publish(organization.context, 'OFFER_VERSION', version.id, 'publish evidence owner');
  return { ...organization, offer, version };
}

describe('G10e Core evidence slice', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('records evidence for a capability and a published OfferVersion', async () => {
    const a = await offerVersionFixture('record');
    const capabilityEvidence = await evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.SYSTEM, confidence: 0 });
    const versionEvidence = await evidence.record(a.context, { offerVersionId: a.version.id, sourceKind: EvidenceSourceKind.INTEGRATION, confidence: 1 });
    expect(capabilityEvidence.capabilityId).toBe(a.capability.id);
    expect(capabilityEvidence.capabilityOrganizationId).toBe(a.organizationId);
    expect(versionEvidence.offerVersionId).toBe(a.version.id);
    expect(versionEvidence.offerVersionOrganizationId).toBe(a.organizationId);
  });

  test('requires exactly one same-organization owner', async () => {
    const a = await newOrganization('owners');
    await expectCode(evidence.record(a.context, { sourceKind: EvidenceSourceKind.HUMAN } as never), 'VALIDATION_FAILED');
    await expectCode(evidence.record(a.context, { capabilityId: 'missing', offerVersionId: 'also-missing', sourceKind: EvidenceSourceKind.HUMAN } as never), 'VALIDATION_FAILED');
    const b = await capabilityFixture('foreign-owner');
    await expectCode(evidence.record(a.context, { capabilityId: b.capability.id, sourceKind: EvidenceSourceKind.HUMAN }), 'VALIDATION_FAILED');
  });

  test('validates confidence boundaries and source kind', async () => {
    const a = await capabilityFixture('validation');
    await expectCode(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.HUMAN, confidence: -0.1 }), 'VALIDATION_FAILED');
    await expectCode(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.HUMAN, confidence: 1.1 }), 'VALIDATION_FAILED');
    await expectCode(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: 'NOT_A_SOURCE' as never, confidence: 0.5 }), 'VALIDATION_FAILED');
    await expect(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.HUMAN, confidence: 0 })).resolves.toBeDefined();
    await expect(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.HUMAN, confidence: 1 })).resolves.toBeDefined();
  });

  test('rejects forbidden fields and creates no row', async () => {
    const a = await capabilityFixture('forbidden');
    const before = await prisma.evidence.count({ where: { organizationId: a.organizationId } });
    await expectCode(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.AI_INFERRED, confirmationStatus: 'HUMAN_CONFIRMED', confirmedByMembershipId: a.membership.id, evidenceStatus: 'WITHDRAWN', organizationId: 'forged' } as never), 'VALIDATION_FAILED');
    expect(await prisma.evidence.count({ where: { organizationId: a.organizationId } })).toBe(before);
  });

  test('confirm requires an active unconfirmed evidence and supports AI_INFERRED only through human confirmation', async () => {
    const a = await capabilityFixture('confirm');
    const item = await evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.AI_INFERRED });
    const confirmed = await evidence.confirm(a.context, item.id);
    expect(confirmed.confirmationStatus).toBe('HUMAN_CONFIRMED');
    expect(confirmed.confirmedByMembershipId).toBe(a.membership.id);
    await expectCode(evidence.confirm(a.context, item.id), 'CONFLICT');
  });

  test('expire and withdraw are terminal ACTIVE-only transitions', async () => {
    const a = await capabilityFixture('terminal');
    const expired = await evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.SYSTEM });
    expect((await evidence.expire(a.context, expired.id)).evidenceStatus).toBe('EXPIRED');
    await expectCode(evidence.expire(a.context, expired.id), 'CONFLICT');
    await expectCode(evidence.confirm(a.context, expired.id), 'CONFLICT');
    const withdrawn = await evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.SYSTEM });
    expect((await evidence.withdraw(a.context, withdrawn.id)).evidenceStatus).toBe('WITHDRAWN');
    await expectCode(evidence.withdraw(a.context, withdrawn.id), 'CONFLICT');
    await expectCode(evidence.confirm(a.context, withdrawn.id), 'CONFLICT');
  });

  test('S15-A exposes no content update method', () => {
    expect(Object.getOwnPropertyNames(EvidenceService.prototype)).not.toContain('update');
  });

  test('W1 cross-organization and missing permissions are denied', async () => {
    const a = await capabilityFixture('permissions');
    const b = await capabilityFixture('permissions-other');
    await expectCode(evidence.record(a.context, { capabilityId: b.capability.id, sourceKind: EvidenceSourceKind.SYSTEM }), 'VALIDATION_FAILED');
    const manage = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'evidence.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, manage.id, 'test');
    await expectCode(evidence.record(a.context, { capabilityId: a.capability.id, sourceKind: EvidenceSourceKind.SYSTEM }), 'AUTHORIZATION_DENIED');
    const c = await capabilityFixture('confirm-permission');
    const item = await evidence.record(c.context, { capabilityId: c.capability.id, sourceKind: EvidenceSourceKind.SYSTEM });
    const confirmGrant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: c.organizationId, membershipId: c.membership.id, permissionKey: 'evidence.confirm', grantStatus: 'ACTIVE' } });
    await grants.revoke(c.context, confirmGrant.id, 'test');
    await expectCode(evidence.confirm(c.context, item.id), 'AUTHORIZATION_DENIED');
  });

  test('Y1 missing capability link maps to VALIDATION_FAILED', async () => {
    const a = await offerVersionFixture('missing-link');
    await expectCode(offers.unlinkCapability(a.context, { offerVersionId: a.version.id, capabilityId: a.capability.id }), 'VALIDATION_FAILED');
  });
});
