import { PrismaClient } from '@prisma/client';
import { requireNonEmpty } from './auth-context';
import { CoreDomainError, conflict } from './errors';
import { mapCoreDatabaseError } from './error-adapter';
import { PlatformIdentityVerifier, requireVerifiedPlatformActor } from './platform-identity-verifier';
import { CORE_PERMISSION_KEYS } from './permission-registry';
import { MembershipRepository, OrganizationRepository } from './repositories';

export interface BootstrapInput {
  organizationId: string;
  displayName: string;
  foundingIdentityProvider: string;
  foundingExternalSubject: string;
}

export class BootstrapService {
  constructor(private readonly db: PrismaClient, private readonly verifier?: PlatformIdentityVerifier) {}
  async execute(platformCredential: string | undefined, input: BootstrapInput) {
    const platformActor = await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(input.organizationId, 'organizationId');
    requireNonEmpty(input.displayName, 'displayName');
    requireNonEmpty(input.foundingIdentityProvider, 'foundingIdentityProvider');
    requireNonEmpty(input.foundingExternalSubject, 'foundingExternalSubject');
    return this.db.$transaction(async (tx) => {
      const organizations = new OrganizationRepository(tx);
      const memberships = new MembershipRepository(tx);
      if (await organizations.findById(input.organizationId)) throw conflict('organization bootstrap already completed');
      const organization = await organizations.create(input.organizationId, input.displayName);
      const foundingMembership = await memberships.create(input.organizationId, { identityProvider: input.foundingIdentityProvider, externalSubject: input.foundingExternalSubject });
      for (const permissionKey of CORE_PERMISSION_KEYS) {
        await tx.permissionGrant.create({
          data: {
            organizationId: input.organizationId,
            membershipId: foundingMembership.id,
            permissionKey,
            grantStatus: 'ACTIVE',
            basisKey: 'founding',
            reason: `bootstrap:${platformActor.ref}`,
          },
        });
      }
      return { organization, foundingMembership };
    }).catch((error: unknown) => {
      if (error instanceof CoreDomainError) throw error;
      const mapped = mapCoreDatabaseError(error);
      if (mapped.code === 'CONFLICT') throw conflict('organization bootstrap already completed');
      throw mapped;
    });
  }
}
