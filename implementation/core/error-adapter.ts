import { Prisma } from '@prisma/client';
import { CoreDomainError, conflict, validationFailed } from './errors';

function databaseCode(error: unknown): string | undefined { if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code; if (typeof error === 'object' && error !== null && 'code' in error) { const code = (error as { code?: unknown }).code; return typeof code === 'string' ? code : undefined; } return undefined; }
function constraintName(error: unknown): string { if (error instanceof Prisma.PrismaClientKnownRequestError) { const constraint = error.meta?.target; if (Array.isArray(constraint)) return constraint.join('_'); if (typeof constraint === 'string') return constraint; } return 'unknown_constraint'; }
export function mapCoreDatabaseError(error: unknown): CoreDomainError {
  const code = databaseCode(error); const constraint = constraintName(error);
  if (code === 'P2002' || code === '23505') { if (constraint.includes('business_identity_claim_active_identifier_unique')) return conflict('identifier already claimed'); if (constraint.includes('offer_version_number_unique')) return conflict('offer version number already exists'); if (constraint.includes('offer_version_published_unique')) return conflict('another offer version is already published'); return conflict('unique constraint conflict'); }
  if (code === 'P2003' || code === '23503') return validationFailed('referenced Core record is invalid');
  if (code === 'P2014' || code === '23514') return validationFailed('Core integrity constraint rejected the operation');
  if (code === 'P0001') return validationFailed('Core invariant rejected the operation');
  return new CoreDomainError('INTERNAL_ERROR', 'Core operation failed');
}
