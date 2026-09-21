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

  test('k3 price CHECK and media CHECK map to VALIDATION_FAILED', () => {
    expect(mapCoreDatabaseError(dbError('P2010', 'catalog_item_price_check'))).toMatchObject({ code: 'VALIDATION_FAILED', message: 'catalog item price is invalid' });
    expect(mapCoreDatabaseError(dbError('23514', 'catalog_item_media_dimensions_check'))).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  test('k3 named lifecycle and media trigger errors map to stable codes', () => {
    expect(mapCoreDatabaseError(new Error('invalid catalog lifecycle transition'))).toMatchObject({ code: 'CONFLICT' });
    expect(mapCoreDatabaseError(new Error('catalog item media budget exceeded'))).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
