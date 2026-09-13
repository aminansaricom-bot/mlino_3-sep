import path from 'node:path';
import { assertSafeTestDatabase } from './test-db-guard';

assertSafeTestDatabase(process.env, path.resolve(__dirname, '../.env'));

// REMEDIATION R7 (Central Review — JWT fail-closed): auth-adapter.ts no
// longer provides any hardcoded fallback secret in production code — that
// insecure default was the finding. Tests satisfy the now-mandatory
// MLINO_JWT_SECRET requirement via this EXPLICIT test configuration file
// (Jest `setupFiles`), never via a fallback baked into application code.
// This value is test-only and must never be reused in a real environment.
if (!process.env.MLINO_JWT_SECRET) {
  process.env.MLINO_JWT_SECRET = 'wave1-remediation-test-only-secret-do-not-use-in-production';
}
