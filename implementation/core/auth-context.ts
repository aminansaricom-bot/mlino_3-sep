import { Prisma } from '@prisma/client';
import { authenticationRequired, authorizationDenied, tenantMismatch, validationFailed } from './errors';

export const CORE_AUTH_ISSUER = 'mlino-v1';

export interface AuthContext {
  readonly issuer: string;
  readonly organizationId: string;
  readonly identityProvider: string;
  readonly externalSubject: string;
  readonly membershipId?: string;
}

export function validateAuthContext(context: AuthContext): void {
  if (!context || !context.organizationId || !context.identityProvider || !context.externalSubject) throw authenticationRequired();
  if (context.issuer !== CORE_AUTH_ISSUER) throw authenticationRequired('unsupported authentication issuer');
}

export async function requireActiveMembership(db: Prisma.TransactionClient, context: AuthContext): Promise<{ id: string; organizationId: string }> {
  validateAuthContext(context);
  const membership = await db.membership.findFirst({
    where: { organizationId: context.organizationId, identityProvider: context.identityProvider, externalSubject: context.externalSubject, membershipStatus: 'ACTIVE', ...(context.membershipId ? { id: context.membershipId } : {}) },
    select: { id: true, organizationId: true },
  });
  if (!membership) throw authorizationDenied('active organization membership required');
  return membership;
}

export async function requireMembershipPermission(db: Prisma.TransactionClient, context: AuthContext, permissionKey: string) {
  const membership = await requireActiveMembership(db, context);
  const grant = await db.permissionGrant.findFirst({ where: { organizationId: context.organizationId, membershipId: membership.id, permissionKey, grantStatus: 'ACTIVE' }, select: { id: true } });
  if (!grant) throw authorizationDenied('required permission grant missing');
  return membership;
}

export function requireSameOrganization(context: AuthContext, organizationId: string): void {
  validateAuthContext(context);
  if (context.organizationId !== organizationId) throw tenantMismatch();
}

export function requireNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw validationFailed(`${field} is required`);
}
