import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CapabilityService } from '../../core/capability-service';
import { IdentityClaimService } from '../../core/identity-claim-service';
import { IdentityVerificationService } from '../../core/identity-verification-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { mapVanakBusiness } from './map';
import { TestSeedError, VanakBusinessInput } from './types';

export const SEED_REASON = 'TEST DATA - not business-consented (source: balad.ir)';
const PLATFORM_CREDENTIAL = 'LOCAL_TEST_DATA_ONLY';

export class SeedPlatformVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== PLATFORM_CREDENTIAL) throw new TestSeedError('TEST_SEED_PLATFORM_CREDENTIAL');
    return { ref: 'test-seed-local' };
  }
}

export function createSeedPlatformVerifier(env: NodeJS.ProcessEnv): SeedPlatformVerifier {
  if (env.MLINO_TEST_SEED_CONFIRM !== PLATFORM_CREDENTIAL) throw new TestSeedError('TEST_SEED_CONFIRM_REQUIRED');
  if (!env.DATABASE_URL) throw new TestSeedError('TEST_SEED_DATABASE_UNSAFE');
  let url: URL;
  try { url = new URL(env.DATABASE_URL); } catch { throw new TestSeedError('TEST_SEED_DATABASE_UNSAFE'); }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1'].includes(host)) throw new TestSeedError('TEST_SEED_DATABASE_UNSAFE');
  return new SeedPlatformVerifier();
}

export async function seedVanakBusinesses(db: PrismaClient, rows: VanakBusinessInput[], env: NodeJS.ProcessEnv = process.env) {
  const verifier = createSeedPlatformVerifier(env);
  const bootstrap = new BootstrapService(db, verifier);
  const claims = new IdentityClaimService(db, verifier);
  const verifications = new IdentityVerificationService(db, verifier);
  const profiles = new BusinessProfileService(db);
  const capabilities = new CapabilityService(db);
  const publications = new PublicationService(db);
  let created = 0;
  let skipped = 0;
  for (const source of rows) {
    const mapped = mapVanakBusiness(source);
    const exists = await db.organization.findUnique({ where: { id: mapped.organizationId }, select: { id: true } });
    if (exists) { skipped += 1; continue; }
    const bootstrapped = await bootstrap.execute(PLATFORM_CREDENTIAL, {
      organizationId: mapped.organizationId,
      displayName: mapped.displayName,
      foundingIdentityProvider: 'test-seed',
      foundingExternalSubject: source.test_id,
    });
    const context: AuthContext = {
      issuer: CORE_AUTH_ISSUER,
      organizationId: mapped.organizationId,
      identityProvider: 'test-seed',
      externalSubject: source.test_id,
      membershipId: bootstrapped.foundingMembership.id,
    };
    const claim = await claims.submit(context, { organizationId: mapped.organizationId, identifierType: mapped.identifierType, identifierValue: mapped.identifierValue });
    const attempt = await verifications.start(context, { organizationId: mapped.organizationId, claimId: claim.id, methodKey: 'test-seed' });
    await verifications.markUnderReview(PLATFORM_CREDENTIAL, mapped.organizationId, attempt.id);
    await verifications.decide(PLATFORM_CREDENTIAL, { organizationId: mapped.organizationId, verificationId: attempt.id, decision: 'VERIFIED', decisionReason: SEED_REASON });
    const profile = await profiles.create(context, { organizationId: mapped.organizationId, ...mapped.profile });
    await profiles.linkIdentityClaim(context, profile.id, claim.id);
    await publications.publish(context, 'BUSINESS_PROFILE', profile.id, SEED_REASON);
    for (const input of mapped.capabilities) {
      const capability = await capabilities.create(context, { organizationId: mapped.organizationId, ...input });
      await capabilities.confirm(context, capability.id);
      await publications.publish(context, 'CAPABILITY', capability.id, SEED_REASON);
    }
    created += 1;
  }
  return { created, skipped };
}
