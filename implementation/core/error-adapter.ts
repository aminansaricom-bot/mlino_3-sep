import { Prisma } from '@prisma/client';
import { CoreDomainError, conflict, validationFailed } from './errors';

function databaseCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
function constraintName(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const constraint = error.meta?.target;
    if (Array.isArray(constraint)) return constraint.join('_');
    if (typeof constraint === 'string') return constraint;
  }
  if (typeof error === 'object' && error !== null && 'meta' in error) {
    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    if (Array.isArray(target)) return target.join('_');
    if (typeof target === 'string') return target;
  }
  return 'unknown_constraint';
}
export function mapCoreDatabaseError(error: unknown): CoreDomainError {
  const code = databaseCode(error);
  const constraint = constraintName(error);
  const message = error instanceof Error ? error.message : '';
  const diagnostic = `${message} ${constraint}`;
  const triggerMessages: Record<string, CoreDomainError> = {
    'publications are append-only': conflict('publication is immutable'),
    'offer versions cannot be deleted': conflict('offer version is immutable'),
    'offer version content is immutable': conflict('offer version is immutable'),
    'offer version capability links cannot be updated': conflict('offer version capability link is immutable'),
    'published offer version capability links are immutable': conflict('offer version capability link is immutable'),
    'decided identity verification is immutable': conflict('identity verification is immutable'),
    'content revision requires a public field change': validationFailed('content revision invariant failed'),
    'initial publication status must be UNPUBLISHED': validationFailed('initial publication state is invalid'),
    'publication projection requires Publication event': validationFailed('direct publication projection write rejected'),
    'invalid publication transition': conflict('publication transition conflict'),
  };
  for (const [triggerMessage, domainError] of Object.entries(triggerMessages)) {
    if (message.includes(triggerMessage)) return domainError;
  }
  if (diagnostic.includes('offer_version_price_check')) return validationFailed('offer version price is invalid');
  if (diagnostic.includes('offer_version_validity_check')) return validationFailed('offer version validity range is invalid');
  if (code === 'P2002' || code === '23505') {
    if (diagnostic.includes('business_identity_claim_active_identifier_unique') || (diagnostic.includes('identifier_type') && diagnostic.includes('identifier_value'))) return conflict('identifier already claimed');
    if (diagnostic.includes('membership_active_subject_unique')) return conflict('active membership already exists');
    if (diagnostic.includes('permission_grant_active_unique')) return conflict('active permission grant already exists');
    if (diagnostic.includes('business_profile_claim_unique')) return conflict('identity claim already linked to a profile');
    if (diagnostic.includes('capability_organization_key_unique') || (diagnostic.includes('organization_id') && diagnostic.includes('capability_key'))) return conflict('capability key already exists');
    if (diagnostic.includes('offer_organization_key_unique') || (diagnostic.includes('organization_id') && diagnostic.includes('offer_key'))) return conflict('offer key already exists');
    if (diagnostic.includes('offer_version_number_unique')) return conflict('offer version number already exists');
    if (diagnostic.includes('offer_version_published_unique')) return conflict('another offer version is already published');
    return conflict('unique constraint conflict');
  }
  if (code === 'P2003' || code === '23503') return validationFailed('referenced Core record is invalid');
  if (code === 'P2014' || code === '23514') return validationFailed('Core integrity constraint rejected the operation');
  if (code === 'P2000') return validationFailed('Core value exceeds its database limit');
  if (code === 'P0001') return validationFailed('Core invariant rejected the operation');
  return new CoreDomainError('INTERNAL_ERROR', 'Core operation failed');
}
