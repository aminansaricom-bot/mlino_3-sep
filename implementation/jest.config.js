/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  // REMEDIATION R7: explicit test-only MLINO_JWT_SECRET configuration —
  // see test/setup-env.ts. Runs before the test framework installs, so it
  // is in effect for every spec file's module-load-time and per-call
  // secret resolution.
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  // IMPORTANT: all integration spec files share ONE real local Postgres
  // instance (docker-compose.yml) and each file's afterEach does a global
  // table cleanup. Running test files in parallel workers causes one file's
  // cleanup to race with another file's in-flight writes (observed directly:
  // spurious failures when run with default parallelism, all green with
  // maxWorkers: 1). Wave 1 accepts this simple shared-DB model; a
  // per-file-isolated DB (e.g. testcontainers) is a reasonable future
  // improvement, not a Wave 1 architecture requirement.
  maxWorkers: 1,
};
