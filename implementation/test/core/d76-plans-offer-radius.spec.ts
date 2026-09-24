import { OfferShape } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CoreDomainError } from '../../core/errors';
import { OfferService } from '../../core/offer-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { PLAN_LIMITS, PlanService, currentJalaliMonth } from '../../core/plan-service';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `d76-${Date.now()}-`;
const verifier: PlatformIdentityVerifier = { async verify(c: string) { if (c !== 'platform-token') throw new Error('bad'); return { ref: 'platform:d76' }; } };
const bootstrap = new BootstrapService(prisma, verifier);
const offers = new OfferService(prisma);
const publications = new PublicationService(prisma);
const plans = new PlanService(prisma);

async function org(label: string) {
  const organizationId = `${TEST_PREFIX}${label}`;
  const r = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'd76-idp', foundingExternalSubject: `owner-${label}` });
  const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: 'd76-idp', externalSubject: `owner-${label}`, membershipId: r.foundingMembership.id };
  return { organizationId, context };
}

async function publishOffer(o: { organizationId: string; context: AuthContext }, n: number, radius?: number | null) {
  const offer = await offers.create(o.context, { organizationId: o.organizationId, offerKey: `offer-${n}` });
  const version = await offers.createVersion(o.context, { offerId: offer.id, name: `آفر ${n}`, offerShape: OfferShape.ITEM, validFrom: new Date('2026-01-01T00:00:00Z'), onRequest: true, ...(radius !== undefined ? { visibilityRadiusMeters: radius } : {}) });
  return { version, result: await publications.publish(o.context, 'OFFER_VERSION', version.id, 'test') };
}

describe('D-76 plans and D-77 offer radius', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => {
    await prisma.organizationPlan.deleteMany({ where: { organizationId: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  test('no plan row means FREE: two offers a month, the third is refused with PLAN_LIMIT', async () => {
    const o = await org('free');
    expect((await plans.view(o.organizationId)).tier).toBe('FREE');
    await publishOffer(o, 1);
    await publishOffer(o, 2);
    await expect(publishOffer(o, 3)).rejects.toMatchObject({ name: 'CoreDomainError', code: 'PLAN_LIMIT' });
    expect((await plans.view(o.organizationId)).usage.offersThisMonth).toBe(PLAN_LIMITS.FREE.offersPerMonth);
  });

  test('a replaced version is not a new offer; PRO lifts the limit; the change is recorded with its basis and member', async () => {
    const o = await org('pro');
    const first = await publishOffer(o, 1);
    const v2 = await offers.createVersion(o.context, { offerId: first.version.offerId, name: 'نسخه‌ی دوم', offerShape: OfferShape.ITEM, validFrom: new Date('2026-01-01T00:00:00Z'), onRequest: true });
    expect((await publications.publish(o.context, 'OFFER_VERSION', v2.id, 'edit')).outcome).toBe('REPLACED');
    expect((await plans.view(o.organizationId)).usage.offersThisMonth).toBe(1);
    await publishOffer(o, 2);
    await expect(publishOffer(o, 3)).rejects.toMatchObject({ code: 'PLAN_LIMIT' });
    const row = await plans.change(o.context, 'PRO', 'demo_switch');
    expect(row).toMatchObject({ planTier: 'PRO', changeBasis: 'demo_switch' });
    expect(row.changedByMembershipId).toBeTruthy();
    await publishOffer(o, 4);
    expect((await plans.view(o.organizationId)).tier).toBe('PRO');
    expect((await plans.view(o.organizationId)).usage.offersThisMonth).toBe(3);
  });

  test('changing the plan needs plan.manage; an unknown basis is refused', async () => {
    const o = await org('grant');
    await prisma.permissionGrant.updateMany({ where: { organizationId: o.organizationId, permissionKey: 'plan.manage' }, data: { grantStatus: 'REVOKED', revokedAt: new Date(), revocationReason: 'test', revokedByPlatformIdentityRef: 'platform:d76' } });
    await expect(plans.change(o.context, 'MAX', 'demo_switch')).rejects.toMatchObject({ code: 'AUTHORIZATION_DENIED' });
    await expect(plans.change(o.context, 'MAX', 'gift' as never)).rejects.toBeInstanceOf(CoreDomainError);
  });

  test('offer radius is validated, versioned and carried in the published snapshot only when set', async () => {
    const o = await org('radius');
    await plans.change(o.context, 'MAX', 'demo_switch');
    const offer = await offers.create(o.context, { organizationId: o.organizationId, offerKey: 'r' });
    for (const bad of [50, 20001, 1.5]) {
      await expect(offers.createVersion(o.context, { offerId: offer.id, name: 'x', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true, visibilityRadiusMeters: bad })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    const near = await publishOffer(o, 1, 800);
    const all = await publishOffer(o, 2, null);
    const snap = async (id: string) => ((await prisma.publication.findFirst({ where: { offerVersionId: id, eventKind: 'PUBLISHED' } }))!.publishedContent as { content: Record<string, unknown> }).content;
    expect((await snap(near.version.id)).visibility_radius_meters).toBe(800);
    expect('visibility_radius_meters' in (await snap(all.version.id))).toBe(false);
  });

  test('the Jalali month runs from the 1st at 00:00 Tehran time', () => {
    expect(currentJalaliMonth(new Date('2026-09-24T12:00:00Z'))).toEqual({ from: new Date('2026-09-22T20:30:00Z'), to: new Date('2026-10-22T20:30:00Z') });
    expect(currentJalaliMonth(new Date('2026-09-22T20:29:00Z')).to).toEqual(new Date('2026-09-22T20:30:00Z'));
  });
});
