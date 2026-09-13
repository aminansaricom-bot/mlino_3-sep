# CCR: V1 Test Database Guard

**Status:** DRAFT  
**Scope:** G12a — V1 test safety only

## Problem

V1 integration specifications contain unscoped `deleteMany({})` cleanup. The
`.env` in `_PUSH_STAGING/implementation/` can point at the live local V1
database, so running the test suite from that location can erase live data.

## Exact scope

Only these three test files are changed, plus this CCR:

- `implementation/test/test-db-guard.ts`
- `implementation/test/setup-env.ts`
- `implementation/test/test-db-guard.spec.ts`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_V1_TEST_DB_GUARD.md`

## Behavior

`assertSafeTestDatabase` is a pure guard. It uses `process.env.DATABASE_URL`
when present, otherwise reads only the `DATABASE_URL` assignment from the
specified env file. An absent URL is allowed for non-database specs. A present
URL is allowed only for local PostgreSQL on port `5499`; port `5435`, the
`@db:` host form, other hosts/ports, and unparsable values are rejected before
the Jest suite can access the database. Error messages never contain the URL
or credentials.

The guard is called from `setup-env.ts` before the existing test-only
`MLINO_JWT_SECRET` setup. That existing secret logic is unchanged.

## Runtime and production impact

There is no production runtime impact. The change is test-only and the
repository `.dockerignore` excludes `test`, so the guard is not copied into
the production image. No schema, migration, API, contract, or database data
is changed.

## Validation evidence

Disposable PostgreSQL 16 validation used tmpfs storage on host port `5499`.
The migration deploy, build, focused guard tests, full V1 suite, and refusal
proof are recorded under `mlino2/validation/g12a/`. The refusal proof used an
unresolvable `@db:5432` URL and showed the guard stopped the suite before any
test executed. No `5435` URL, live V1 database, or `_PUSH_STAGING` command was
used.

LF SHA-256 values for the exact scoped files are recorded in:

`mlino2/validation/g12a/LF-MANIFEST.txt`

## Rollback

Revert the G12a commit. This removes the test guard, its unit tests, CCR, and
validation evidence without changing production data or schema history.
