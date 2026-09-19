# CODEX P1 Local Database Seed Report

**Instruction:** `CODEX-20260919-P1-SEED-LOCAL-DB-001`
**Workstream:** `HANDOFF-20260918-TEST-SEED`
**Status:** `HARD_STOP_B2_BACKUP_TIMESTAMP`

## 1. Task executed

The authorized one-time P1 operation began with pinned-reference verification and the required read-only database pre-check. Execution stopped during backup step B2 before `pg_dump`, C0, build, seed, or any database mutation.

## 2. Source documents used

- `39b25e4d0b708d6399d993bc40fee31439cbfd0c:AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md`
- Pinned SHA-256 `28ccb3a53c9ad7bec3622c061abb0ddb4082293826c3d54f93c1e2aba5640aa3`, verified through GW2-P.
- Owner advance grant referenced by the instruction.

## 3. Files changed

- `implementation/validation/p1/precondition.log`
- `implementation/validation/p1/precheck.log`
- `implementation/validation/p1/backup.log`
- `implementation/validation/p1/leak-grep.log`
- This report
- Append-only handoff entry

No product code was changed.

## 4. Files not changed

- No Core, seed-tool, Prisma, schema, migration, package, lock, V2, Docker, or runtime configuration file
- No `.env` file
- No `_PUSH_STAGING` content
- No database rows
- No dump was created or committed

## 5. Read-only pre-check

The pre-check passed:

- `mlino-v1-local-db`: running and healthy, restart count 0
- `mlino-v1-read-api`: running, restart count 0
- 8 migrations, all finished and none rolled back
- 13 non-internal public triggers
- 30 public CHECK constraints
- 0 organizations matching `test-vanak-%`
- Baseline totals and non-test counts were recorded for all seven required tables; every count was 0

No row data or credentials were read or logged.

## 6. Backup hard stop

Backup step B2 generated a timestamp through a culture-sensitive formatting path. The result did not match the mandatory pattern `^20[0-9]{6}T[0-9]{6}Z$`.

The hard stop occurred before the filename was accepted and before `pg_dump` ran:

- `PG_DUMP_STARTED=false`
- `HOST_DUMP_CREATED=false`
- `C0_READ=false`
- `SEED_STARTED=false`
- `DATABASE_MUTATION=false`
- No automatic retry was attempted

## 7. Tests and operational results

- GW2-P: PASS
- Read-only database pre-check: PASS
- Backup B1: PASS, destination directory available
- Backup B2: FAIL, mandatory timestamp validation
- Backup B3-B6: NOT RUN
- C0, temporary build, seed, post-check, export check and cleanup: NOT RUN
- Leak scan of committed evidence: 0 PostgreSQL URL hits, 0 password hits, 0 mobile-number literal hits

## 8. Commit hash

- Operational evidence/report/handoff: recorded by the local documentation commit following this report
- Product commit: none
- Push: not attempted

## 9. Remaining risks and open questions

The database remains unchanged and still has no `test-vanak-*` organizations. A new Guardian instruction is required before retrying because the current instruction explicitly requires a hard stop on any backup-step mismatch.

The retry should require invariant Gregorian UTC formatting, for example `DateTime.UtcNow.ToString('yyyyMMddTHHmmssZ', CultureInfo.InvariantCulture)`, while preserving all B1-B6 checks and the one-run seed restriction.

## 10. Recommended next step

Issue a narrowly scoped P1 retry instruction that supersedes this stopped run and authorizes correcting only B2 timestamp generation. The next run must repeat the pre-check and complete a verified backup before C0 or seed execution.

من کدکس هستم
