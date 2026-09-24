import { PlanTier, Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, validateAuthContext } from './auth-context';
import { CoreDomainError, validationFailed } from './errors';
import { mapCoreDatabaseError } from './error-adapter';
import { lockOrganization } from './repositories';
import { runCoreTransaction } from './transaction';

/**
 * Plans (owner decision D-76). A plan is an ENTITLEMENT: it sets quotas and switches features on. It never
 * grants authority — who may act is still membership + grant (D-57). Limits are placeholders the owner
 * will revise; they live here, in one table, so a change is one edit.
 *
 * `null` = unlimited.
 */
export const PLAN_LIMITS = {
  FREE: { publishedCatalogItems: 30, offersPerMonth: 2, chatAutoReply: false, searchPromotion: false, offerPush: false },
  PRO: { publishedCatalogItems: 300, offersPerMonth: 20, chatAutoReply: true, searchPromotion: true, offerPush: true },
  MAX: { publishedCatalogItems: null, offersPerMonth: null, chatAutoReply: true, searchPromotion: true, offerPush: true },
} as const satisfies Record<PlanTier, { publishedCatalogItems: number | null; offersPerMonth: number | null; chatAutoReply: boolean; searchPromotion: boolean; offerPush: boolean }>;

export type PlanLimits = (typeof PLAN_LIMITS)[PlanTier];
export const PLAN_BASES = ['demo_switch', 'payment', 'platform_grant', 'downgrade'] as const;
export type PlanBasis = (typeof PLAN_BASES)[number];

type Db = PrismaClient | Prisma.TransactionClient;

export async function planOf(db: Db, organizationId: string): Promise<PlanTier> {
  const row = await db.organizationPlan.findUnique({ where: { organizationId }, select: { planTier: true } });
  return row?.planTier ?? 'FREE';
}

const JALALI_DAY = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', day: 'numeric' });
const TEHRAN_OFFSET_MS = 210 * 60_000; // UTC+03:30, no daylight saving since 2022

/** The current Jalali month in Tehran time as a UTC instant range [from, to). Offers are counted per calendar month. */
export function currentJalaliMonth(now: Date): { from: Date; to: Date } {
  const dayOf = (d: Date) => Number(JALALI_DAY.format(d));
  const local = now.getTime() + TEHRAN_OFFSET_MS;
  const startOfToday = local - (local % 86400_000) - TEHRAN_OFFSET_MS;
  const from = startOfToday - (dayOf(now) - 1) * 86400_000;
  let to = from + 29 * 86400_000;
  while (dayOf(new Date(to + 43200_000)) !== 1) to += 86400_000;
  return { from: new Date(from), to: new Date(to) };
}

/** Offers shown this month = distinct offers with a publication this month. A new version of one of them is free. */
async function offersPublishedThisMonth(db: Db, organizationId: string, now: Date): Promise<string[]> {
  const month = currentJalaliMonth(now);
  const rows = await db.$queryRaw<Array<{ offer_id: string }>>(Prisma.sql`SELECT DISTINCT v.offer_id FROM publications p JOIN offer_versions v ON v.id = p.offer_version_id AND v.organization_id = p.organization_id WHERE p.organization_id = ${organizationId} AND p.event_kind = 'PUBLISHED' AND p.occurred_at >= ${month.from} AND p.occurred_at < ${month.to}`);
  return rows.map((r) => r.offer_id);
}

export async function usageOf(db: Db, organizationId: string, now: Date): Promise<{ publishedCatalogItems: number; offersThisMonth: number }> {
  const [items, offers] = await Promise.all([
    db.catalogItem.count({ where: { organizationId, publicationStatus: 'PUBLISHED' } }),
    offersPublishedThisMonth(db, organizationId, now),
  ]);
  return { publishedCatalogItems: items, offersThisMonth: offers.length };
}

/** Called inside the publication transaction, after the organization row is locked. */
export async function assertPublishQuota(tx: Prisma.TransactionClient, organizationId: string, kind: 'OFFER_VERSION' | 'CATALOG_ITEM', now: Date, offerId?: string): Promise<void> {
  const tier = await planOf(tx, organizationId);
  const limits = PLAN_LIMITS[tier];
  if (kind === 'OFFER_VERSION') {
    if (limits.offersPerMonth === null) return;
    const counted = await offersPublishedThisMonth(tx, organizationId, now);
    if (offerId && counted.includes(offerId)) return;
    if (counted.length >= limits.offersPerMonth) throw new CoreDomainError('PLAN_LIMIT', `plan ${tier} allows ${limits.offersPerMonth} offers per month`);
    return;
  }
  const usage = await usageOf(tx, organizationId, now);
  if (limits.publishedCatalogItems !== null && usage.publishedCatalogItems >= limits.publishedCatalogItems) {
    throw new CoreDomainError('PLAN_LIMIT', `plan ${tier} allows ${limits.publishedCatalogItems} published products`);
  }
}

export class PlanService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async view(organizationId: string) {
    const tier = await planOf(this.db, organizationId);
    return { tier, limits: PLAN_LIMITS[tier], usage: await usageOf(this.db, organizationId, this.now()) };
  }

  /**
   * Changing a plan is a billing act of the organization (`plan.manage`), never of the platform or a model.
   * Until a payment gateway exists the only self-service basis is `demo_switch`.
   */
  async change(context: AuthContext, tier: PlanTier, basis: PlanBasis) {
    validateAuthContext(context);
    if (!(['FREE', 'PRO', 'MAX'] as string[]).includes(tier)) throw validationFailed('unknown plan tier');
    if (!(PLAN_BASES as readonly string[]).includes(basis)) throw validationFailed('unknown plan basis');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const membership = await requireMembershipPermission(tx, context, 'plan.manage');
      return tx.organizationPlan.upsert({
        where: { organizationId: context.organizationId },
        create: { organizationId: context.organizationId, planTier: tier, changeBasis: basis, changedByMembershipId: membership.id, changedAt: this.now() },
        update: { planTier: tier, changeBasis: basis, changedByMembershipId: membership.id, changedAt: this.now() },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
}
