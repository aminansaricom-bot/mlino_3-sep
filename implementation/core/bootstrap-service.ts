import { PrismaClient } from '@prisma/client';
import { requireNonEmpty } from './auth-context';
import { conflict } from './errors';
import { CORE_PERMISSION_KEYS } from './permission-registry';
import { MembershipRepository, OrganizationRepository, PermissionGrantRepository } from './repositories';

export interface BootstrapInput { organizationId: string; displayName: string; foundingIdentityProvider: string; foundingExternalSubject: string; platformIdentityRef: string; }

export class BootstrapService {
  constructor(private readonly db: PrismaClient) {}
  async execute(input: BootstrapInput) {
    requireNonEmpty(input.organizationId, 'organizationId'); requireNonEmpty(input.displayName, 'displayName'); requireNonEmpty(input.foundingIdentityProvider, 'foundingIdentityProvider'); requireNonEmpty(input.foundingExternalSubject, 'foundingExternalSubject'); requireNonEmpty(input.platformIdentityRef, 'platformIdentityRef');
    return this.db.$transaction(async (tx) => {
      const organizations = new OrganizationRepository(tx); const memberships = new MembershipRepository(tx); const grants = new PermissionGrantRepository(tx);
      if (await organizations.findById(input.organizationId)) throw conflict('organization bootstrap already completed');
      const organization = await organizations.create(input.organizationId, input.displayName);
      const foundingMembership = await memberships.create(input.organizationId, { identityProvider: input.foundingIdentityProvider, externalSubject: input.foundingExternalSubject });
      for (const permissionKey of CORE_PERMISSION_KEYS) await grants.createFounding(input.organizationId, foundingMembership.id, permissionKey);
      return { organization, foundingMembership };
    });
  }
}
