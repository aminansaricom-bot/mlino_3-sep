import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BusinessProfileService } from '../../core/business-profile-service';
import { PublicationService } from '../../core/publication-service';
import { SEED_REASON, createSeedPlatformVerifier } from './seed';

export async function withdrawVanakBusinesses(db: PrismaClient, env: NodeJS.ProcessEnv = process.env, archive = false) {
  createSeedPlatformVerifier(env);
  const organizations = await db.organization.findMany({
    where: { id: { startsWith: 'test-vanak-' } },
    select: {
      id: true,
      memberships: { where: { identityProvider: 'test-seed', membershipStatus: 'ACTIVE' }, take: 1, select: { id: true, externalSubject: true } },
      businessProfiles: { select: { id: true, publicationStatus: true, lifecycleStatus: true } },
      capabilities: { where: { publicationStatus: 'PUBLISHED' }, select: { id: true } },
    },
  });
  const publications = new PublicationService(db);
  const profiles = new BusinessProfileService(db);
  let withdrawn = 0;
  let archived = 0;
  for (const organization of organizations) {
    const member = organization.memberships[0];
    if (!member) continue;
    const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId: organization.id, identityProvider: 'test-seed', externalSubject: member.externalSubject, membershipId: member.id };
    for (const profile of organization.businessProfiles) {
      if (profile.publicationStatus === 'PUBLISHED') { await publications.withdraw(context, 'BUSINESS_PROFILE', profile.id, SEED_REASON); withdrawn += 1; }
      if (archive && profile.lifecycleStatus !== 'ARCHIVED') { await profiles.archive(context, profile.id, 'TEST DATA cleanup'); archived += 1; }
    }
    for (const capability of organization.capabilities) { await publications.withdraw(context, 'CAPABILITY', capability.id, SEED_REASON); withdrawn += 1; }
    const offerVersions = await db.offerVersion.findMany({
      where: { organizationId: organization.id, publicationStatus: 'PUBLISHED', offer: { offerKey: { startsWith: 'test-ui-vanak-' } } },
      select: { id: true },
    });
    for (const version of offerVersions) { await publications.withdraw(context, 'OFFER_VERSION', version.id, SEED_REASON); withdrawn += 1; }
  }
  return { withdrawn, archived };
}
