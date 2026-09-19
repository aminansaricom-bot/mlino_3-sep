import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { PublicationService } from '../../core/publication-service';
import { SEED_REASON, createSeedPlatformVerifier } from './seed';

export async function withdrawVanakBusinesses(db: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  createSeedPlatformVerifier(env);
  const organizations = await db.organization.findMany({
    where: { id: { startsWith: 'test-vanak-' } },
    select: {
      id: true,
      memberships: { where: { identityProvider: 'test-seed', membershipStatus: 'ACTIVE' }, take: 1, select: { id: true, externalSubject: true } },
      businessProfiles: { where: { publicationStatus: 'PUBLISHED' }, select: { id: true } },
      capabilities: { where: { publicationStatus: 'PUBLISHED' }, select: { id: true } },
    },
  });
  const publications = new PublicationService(db);
  let withdrawn = 0;
  for (const organization of organizations) {
    const member = organization.memberships[0];
    if (!member) continue;
    const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId: organization.id, identityProvider: 'test-seed', externalSubject: member.externalSubject, membershipId: member.id };
    for (const profile of organization.businessProfiles) { await publications.withdraw(context, 'BUSINESS_PROFILE', profile.id, SEED_REASON); withdrawn += 1; }
    for (const capability of organization.capabilities) { await publications.withdraw(context, 'CAPABILITY', capability.id, SEED_REASON); withdrawn += 1; }
  }
  return { withdrawn };
}
