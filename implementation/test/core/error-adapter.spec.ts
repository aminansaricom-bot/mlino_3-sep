import { mapCoreDatabaseError } from '../../core/error-adapter';

describe('G10a2 database error adapter', () => {
  it.each([
    ['publications are append-only', 'CONFLICT'],
    ['offer versions cannot be deleted', 'CONFLICT'],
    ['offer version content is immutable', 'CONFLICT'],
    ['offer version capability links cannot be updated', 'CONFLICT'],
    ['published offer version capability links are immutable', 'CONFLICT'],
    ['decided identity verification is immutable', 'CONFLICT'],
    ['content revision requires a public field change', 'VALIDATION_FAILED'],
    ['initial publication status must be UNPUBLISHED', 'VALIDATION_FAILED'],
    ['publication projection requires Publication event', 'VALIDATION_FAILED'],
    ['invalid publication transition', 'CONFLICT'],
  ])('maps trigger message %s', (message, code) => {
    expect(mapCoreDatabaseError(new Error(`Database error: ${message}`)).code).toBe(code);
  });

  it('maps a named uniqueness constraint', () => {
    const error = { code: 'P2002', meta: { target: ['permission_grant_active_unique'] } };
    expect(mapCoreDatabaseError(error).code).toBe('CONFLICT');
  });
});
