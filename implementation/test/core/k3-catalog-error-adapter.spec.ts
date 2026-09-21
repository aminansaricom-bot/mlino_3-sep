import { mapCoreDatabaseError } from '../../core/error-adapter';

function dbError(code: string, constraint: string): Error & { code: string; meta: { target: string } } {
  return Object.assign(new Error(`constraint ${constraint}`), { code, meta: { target: constraint } });
}

describe('K3 catalog database error mapping without a database', () => {
  test.each([
    ['catalog_item_organization_key_unique', 'catalog item key already exists'],
    ['catalog_item_media_item_position_unique', 'catalog media position already exists'],
    ['catalog_item_media_item_sha256_unique', 'catalog media hash already exists for item'],
    ['offer_version_catalog_item_pk', 'catalog item already linked to offer version'],
  ])('k3 unique %s maps to CONFLICT', (constraint, message) => {
    expect(mapCoreDatabaseError(dbError('P2002', constraint))).toMatchObject({ code: 'CONFLICT', message });
  });

  test.each([
    'catalog_item_price_check',
    'catalog_item_currency_check',
    'catalog_item_availability_check',
    'catalog_item_display_order_check',
    'catalog_item_content_revision_positive_check',
    'catalog_item_lifecycle_audit_check',
    'catalog_item_publication_projection_check',
    'catalog_item_media_position_check',
    'catalog_item_media_byte_size_check',
    'catalog_item_media_dimensions_check',
    'catalog_item_media_sha256_check',
    'catalog_item_media_alt_text_check',
    'catalog_item_media_path_check',
    'catalog_item_media_placeholder_check',
    'catalog_item_activation_actor_pair_check',
    'catalog_item_retirement_actor_pair_check',
    'publication_catalog_item_pair_check',
    'publication_target_xor_check',
    'publication_content_revision_check',
  ])('k3 CHECK %s maps to VALIDATION_FAILED', (constraint) => {
    expect(mapCoreDatabaseError(dbError('P2010', constraint))).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  test('k3 named lifecycle and media trigger errors map to stable codes', () => {
    expect(mapCoreDatabaseError(new Error('invalid catalog lifecycle transition'))).toMatchObject({ code: 'CONFLICT' });
    expect(mapCoreDatabaseError(new Error('catalog item media budget exceeded'))).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
