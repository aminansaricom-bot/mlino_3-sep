import { createSeedPlatformVerifier } from '../../../tools/test-seed/seed';
import { TestSeedError } from '../../../tools/test-seed/types';

function errorCode(env: NodeJS.ProcessEnv): string {
  try { createSeedPlatformVerifier(env); return 'NO_ERROR'; } catch (error) { return error instanceof TestSeedError ? error.code : 'WRONG_ERROR'; }
}

describe('S1 seed platform verifier gate', () => {
  test('refuses a missing explicit confirmation', () => {
    expect(errorCode({ DATABASE_URL: 'postgresql://test:test@localhost:5499/test' })).toBe('TEST_SEED_CONFIRM_REQUIRED');
  });

  test('refuses a non-local database host', () => {
    expect(errorCode({ MLINO_TEST_SEED_CONFIRM: 'LOCAL_TEST_DATA_ONLY', DATABASE_URL: 'postgresql://test:test@example.invalid:5499/test' })).toBe('TEST_SEED_DATABASE_UNSAFE');
  });

  test('accepts only explicit confirmation with a local database host', () => {
    expect(errorCode({ MLINO_TEST_SEED_CONFIRM: 'LOCAL_TEST_DATA_ONLY', DATABASE_URL: 'postgresql://test:test@127.0.0.1:5499/test' })).toBe('NO_ERROR');
  });
});
