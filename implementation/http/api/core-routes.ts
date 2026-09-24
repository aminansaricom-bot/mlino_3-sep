import crypto from 'node:crypto';
import { OfferShape, PlanTier, PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { CoreDomainError } from '../../core/errors';
import { OfferService } from '../../core/offer-service';
import { PLAN_LIMITS, PlanService } from '../../core/plan-service';
import { PublicationService } from '../../core/publication-service';
import { IDENTITY_PROVIDER } from '../../identity';

/**
 * Core write routes for the business panel (/api/biz/:org/plan, /api/biz/:org/offers…).
 * The API only translates HTTP into the SAME Core services the tests cover: authority is checked inside
 * each service from membership + grant (D-57). Publishing is its own request, made by a person's tap (D-52).
 */

export interface CoreDeps {
  readonly prisma: PrismaClient;
  readonly plans: PlanService;
  readonly offers: OfferService;
  readonly publications: PublicationService;
  /** Called after an offer is published — push to nearby opted-in viewers (D-77), best effort. */
  readonly onOfferPublished?: (organizationId: string, offerVersionId: string) => Promise<void>;
}

export class RouteError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail: Record<string, unknown> = {}) { super(code); }
}

export function contextFor(personId: string, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: IDENTITY_PROVIDER, externalSubject: personId };
}

const TIERS: readonly PlanTier[] = ['FREE', 'PRO', 'MAX'];

function text(v: unknown, max: number, field: string, required = true): string | null {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  if (!s) { if (required) throw new RouteError(400, 'INPUT_INVALID', { field }); return null; }
  if ([...s].length > max) throw new RouteError(400, 'INPUT_INVALID', { field });
  return s;
}

export async function handleCoreRoute(deps: CoreDeps, personId: string, orgId: string, rest: string, method: string, body: () => Promise<Record<string, unknown>>): Promise<unknown | undefined> {
  const context = contextFor(personId, orgId);

  if (rest === '/plan' && method === 'GET') {
    const view = await deps.plans.view(orgId);
    return { ...view, tiers: TIERS.map((tier) => ({ tier, limits: PLAN_LIMITS[tier] })) };
  }
  if (rest === '/plan' && method === 'POST') {
    const b = await body();
    const tier = String(b.tier ?? '') as PlanTier;
    if (!TIERS.includes(tier)) throw new RouteError(400, 'INPUT_INVALID', { field: 'tier' });
    // No payment gateway yet: the only self-service basis is the labelled demo switch.
    await deps.plans.change(context, tier, 'demo_switch');
    return deps.plans.view(orgId);
  }

  if (rest === '/offers' && method === 'GET') {
    const rows = await deps.prisma.offer.findMany({
      where: { organizationId: orgId, lifecycleStatus: 'ACTIVE' },
      select: { id: true, offerKey: true, createdAt: true, versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { id: true, name: true, shortDescription: true, priceAmount: true, validFrom: true, validUntil: true, publicationStatus: true, publishedAt: true, visibilityRadiusMeters: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const now = Date.now();
    return {
      offers: rows.filter((r) => r.versions[0]).map((r) => {
        const v = r.versions[0];
        return {
          offerId: r.id, versionId: v.id, name: v.name, shortDescription: v.shortDescription, priceAmount: v.priceAmount?.toString() ?? null,
          validFrom: v.validFrom.toISOString(), validUntil: v.validUntil?.toISOString() ?? null, status: v.publicationStatus,
          publishedAt: v.publishedAt?.toISOString() ?? null, radiusMeters: v.visibilityRadiusMeters,
          expired: v.validUntil !== null && v.validUntil.getTime() <= now,
        };
      }),
    };
  }
  if (rest === '/offers' && method === 'POST') {
    const b = await body();
    const name = text(b.name, 120, 'name')!;
    const shortDescription = text(b.shortDescription, 300, 'shortDescription', false);
    const days = Number(b.validDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new RouteError(400, 'INPUT_INVALID', { field: 'validDays' });
    const radius = b.radiusMeters === null || b.radiusMeters === undefined ? null : Number(b.radiusMeters);
    const price = b.priceAmount === null || b.priceAmount === undefined || b.priceAmount === '' ? null : Number(b.priceAmount);
    if (price !== null && (!Number.isInteger(price) || price <= 0 || price > 10_000_000_000)) throw new RouteError(400, 'INPUT_INVALID', { field: 'priceAmount' });
    const offer = await deps.offers.create(context, { organizationId: orgId, offerKey: `panel-${crypto.randomUUID()}` });
    const validFrom = new Date();
    const version = await deps.offers.createVersion(context, {
      offerId: offer.id, name, shortDescription, offerShape: OfferShape.CAMPAIGN,
      priceAmount: price, priceCurrency: price === null ? null : 'IRR', onRequest: price === null,
      validFrom, validUntil: new Date(validFrom.getTime() + days * 86400_000), visibilityRadiusMeters: radius,
    });
    // Created as a draft: nothing reaches V2 until the member presses «انتشار».
    return { offerId: offer.id, versionId: version.id, status: version.publicationStatus };
  }
  const m = rest.match(/^\/offers\/([0-9a-f-]{36})\/(publish|withdraw)$/);
  if (m && method === 'POST') {
    const [, versionId, action] = m;
    if (action === 'publish') {
      const result = await deps.publications.publish(context, 'OFFER_VERSION', versionId, 'panel: published by member');
      if (deps.onOfferPublished) void deps.onOfferPublished(orgId, versionId).catch(() => undefined);
      return { outcome: result.outcome };
    }
    const result = await deps.publications.withdraw(context, 'OFFER_VERSION', versionId, 'panel: withdrawn by member');
    return { outcome: result.outcome };
  }
  return undefined;
}

export function coreErrorStatus(e: CoreDomainError): number {
  switch (e.code) {
    case 'AUTHENTICATION_REQUIRED': return 401;
    case 'AUTHORIZATION_DENIED': case 'TENANT_MISMATCH': return 403;
    case 'VALIDATION_FAILED': return 400;
    case 'PLAN_LIMIT': case 'CONFLICT': return 409;
    default: return 500;
  }
}
