import { Prisma } from '@prisma/client';
import { CoreDomainError, conflict, validationFailed } from './errors';

const CATALOG_CHECK_MESSAGES: Readonly<Record<string, string>> = {
  catalog_item_price_check: 'catalog item price is invalid',
  catalog_item_currency_check: 'catalog item currency is invalid',
  catalog_item_availability_check: 'catalog item availability range is invalid',
  catalog_item_display_order_check: 'catalog item display order is invalid',
  catalog_item_content_revision_positive_check: 'catalog item revision is invalid',
  catalog_item_lifecycle_audit_check: 'catalog item lifecycle audit is invalid',
  catalog_item_publication_projection_check: 'catalog item publication projection is invalid',
  catalog_item_media_position_check: 'catalog media position is invalid',
  catalog_item_media_byte_size_check: 'catalog media byte size is invalid',
  catalog_item_media_dimensions_check: 'catalog media dimensions are invalid',
  catalog_item_media_sha256_check: 'catalog media hash is invalid',
  catalog_item_media_alt_text_check: 'catalog media alt text is invalid',
  catalog_item_media_path_check: 'catalog media path is invalid',
  catalog_item_media_placeholder_check: 'catalog media placeholder is invalid',
  catalog_item_activation_actor_pair_check: 'catalog item activation actor is invalid',
  catalog_item_retirement_actor_pair_check: 'catalog item retirement actor is invalid',
  publication_catalog_item_pair_check: 'publication catalog target organization is invalid',
  publication_target_xor_check: 'publication must have exactly one target',
  publication_content_revision_check: 'publication content revision is invalid',
};

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
  const metadata = typeof error === 'object' && error !== null && 'meta' in error ? JSON.stringify((error as { meta?: unknown }).meta) : '';
  const diagnostic = `${message} ${constraint} ${metadata}`;
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
    'catalog item must start DRAFT': validationFailed('initial catalog lifecycle is invalid'),
    'invalid catalog lifecycle transition': conflict('catalog lifecycle transition conflict'),
    'catalog media owner is immutable': conflict('catalog media owner is immutable'),
    'catalog media content is immutable': conflict('catalog media content is immutable'),
    'catalog item media budget exceeded': validationFailed('catalog media budget exceeded'),
    'catalog item key is immutable': conflict('catalog item key is immutable'),
    'offer version catalog links cannot be updated': conflict('offer version catalog link is immutable'),
    'published offer version catalog links are immutable': conflict('offer version catalog link is immutable'),
  };
  for (const [triggerMessage, domainError] of Object.entries(triggerMessages)) {
    if (message.includes(triggerMessage)) return domainError;
  }
  if (diagnostic.includes('offer_version_price_check')) return validationFailed('offer version price is invalid');
  if (diagnostic.includes('offer_version_validity_check')) return validationFailed('offer version validity range is invalid');
  for (const [name, domainMessage] of Object.entries(CATALOG_CHECK_MESSAGES)) {
    if (diagnostic.includes(name)) return validationFailed(domainMessage);
  }
  if (code === 'P2028' || code === 'P2034' || code === '40001' || code === '40P01') return new CoreDomainError('TRANSACTION_RETRYABLE', 'transaction could not complete; retry');
  if (code === 'P2002' || code === '23505' || (code === 'P2010' && diagnostic.includes('23505'))) {
    if (diagnostic.includes('business_profile_one_published_per_organization_unique')) return conflict('another business profile is already published for this organization');
    if ((diagnostic.includes('"modelName":"Publication"') && diagnostic.includes('"target":["organization_id"]')) || (code === 'P2010' && diagnostic.includes('Key (organization_id)'))) return conflict('another business profile is already published for this organization');
    if (diagnostic.includes('business_identity_claim_active_identifier_unique') || (diagnostic.includes('identifier_type') && diagnostic.includes('identifier_value'))) return conflict('identifier already claimed');
    if (diagnostic.includes('membership_active_subject_unique')) return conflict('active membership already exists');
    if (diagnostic.includes('permission_grant_active_unique')) return conflict('active permission grant already exists');
    if (diagnostic.includes('business_profile_claim_unique')) return conflict('identity claim already linked to a profile');
    if (diagnostic.includes('capability_organization_key_unique') || (diagnostic.includes('organization_id') && diagnostic.includes('capability_key'))) return conflict('capability key already exists');
    if (diagnostic.includes('offer_organization_key_unique') || (diagnostic.includes('organization_id') && diagnostic.includes('offer_key'))) return conflict('offer key already exists');
    if (diagnostic.includes('offer_version_number_unique')) return conflict('offer version number already exists');
    if (diagnostic.includes('offer_version_published_unique')) return conflict('another offer version is already published');
    if (diagnostic.includes('catalog_item_organization_key_unique')) return conflict('catalog item key already exists');
    if (diagnostic.includes('catalog_item_media_item_position_unique')) return conflict('catalog media position already exists');
    if (diagnostic.includes('catalog_item_media_item_sha256_unique')) return conflict('catalog media hash already exists for item');
    if (diagnostic.includes('offer_version_catalog_item_pk')) return conflict('catalog item already linked to offer version');
    return conflict('unique constraint conflict');
  }
  if (code === 'P2003' || code === '23503') return validationFailed('referenced Core record is invalid');
  if (code === 'P2014' || code === '23514' || (code === 'P2010' && diagnostic.includes('23514'))) return validationFailed('Core integrity constraint rejected the operation');
  if (code === 'P2000') return validationFailed('Core value exceeds its database limit');
  if (code === 'P0001') return validationFailed('Core invariant rejected the operation');
  return new CoreDomainError('INTERNAL_ERROR', 'Core operation failed');
}
