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

---

# P1-002 Retry Addendum

**Instruction:** `CODEX-20260919-P1-SEED-LOCAL-DB-002`
**Target handoff:** `HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1`
**Status:** `HARD_STOP_C0_PATH_MISSING`

## 1. Task executed

The superseding P1 retry repeated the required read-only pre-check, created and verified a new backup with an invariant Gregorian UTC timestamp, verified and temporarily compiled the seed CLI, and then stopped at C0 because the exact authorized file `C:\mlino code\_PUSH_STAGING\.env` does not exist. No alternate path was searched or read, and the seed process was never started.

## 2. Source documents used

- `567ca1b2e12317063750c45f73820eb69f823f7d:AI_HANDOFF/CLAUDE_REVIEWS/20260919_P1_002_INVARIANT_TIMESTAMP.md`
- Pinned SHA-256 `426a16a8d3d1d1cd60ffe18bd97f213713587b85d09b64fbfb0f192935f35c6b`, verified through GW2-P after `git fetch origin` failed because GitHub was unreachable.
- The unchanged P1-001 procedure in `39b25e4d0b708d6399d993bc40fee31439cbfd0c:AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md`.

## 3. Files changed

- Nine new run-2 evidence logs under `implementation/validation/p1/`
- This appended report section
- One append-only handoff entry

No product, schema, migration, Prisma, seed-tool, Docker, environment, package, or lock file was changed.

## 4. Files not changed

- No content under `_PUSH_STAGING`
- No database row or schema object
- No running container or volume
- No real-data input file
- No signing key or credential file

The verified dump remains outside every repository at `C:\Users\galexy\mlino-backups\mlino_v1_pre_p1_20260919T175223Z.dump` and was not committed.

## 5. Checks and operational steps

| Step | Result |
|---|---|
| Start HEAD and clean state | PASS — `b4e851c86f8d339382ba0ac95f83715069d57a51` |
| GW2-P | PASS |
| Fresh read-only pre-check | PASS — 8 finished migrations, 13 triggers, 30 CHECK constraints, 0 `test-vanak-*` organizations |
| Backup B1-B6 | PASS |
| Temporary Prisma client check and TypeScript build | PASS |
| C0 exact-path check | HARD STOP — authorized file absent |
| Seed | NOT RUN — 0 attempts |
| Read-only post-check | PASS — database and runtime unchanged; unauthenticated API response 401 |
| Cleanup | PASS — `.p1-build` and the temporary `node_modules` junction removed |
| Leak scan | PASS — zero URL, password, mobile-number, and real-business-name hits |

## 6. Backup result

- File: `mlino_v1_pre_p1_20260919T175223Z.dump`
- Size: 104558 bytes
- Container SHA-256: `1e0279183791da916bd626b7920e5cfba7113ea05e1260097da4e6b51cc27d7b`
- Host SHA-256: `1e0279183791da916bd626b7920e5cfba7113ea05e1260097da4e6b51cc27d7b`
- Header: `PGDMP`
- `pg_restore --list` count: 216
- Container temporary dump: removed

## 7. Validation evidence

| LF SHA-256 | Evidence |
|---|---|
| `3a7fac8b721b0a02379ed8082724c04a4381ce3c07fd88fa1d4b8f4d9a922f76` | `backup-run2.log` |
| `81b2dd6c3788725db6ab87c8c98195ce9b7d71fdcad9d4329e8e90f53849a4f4` | `build-run2.log` |
| `1c753aa173304678c6015fc75d5fdb9ecc656e1c1e76dbf4c38895e7fc74ba6c` | `c0-run2.log` |
| `ac1e43aca4296e8ffeffe3255e11e028f170cf06274b908ced210310e14b136f` | `cleanup-run2.log` |
| `f71c183c96aa4e230772e8bfc993e1a7c1eb5559e04d4004527c77d1e71d295e` | `leak-grep-run2.log` |
| `aead72b89787caa76ab1591899a2ea9050c95405c0a299aa18f580c552027596` | `postcheck-run2.log` |
| `62b04863055c84fbbc11273169de76a4af2cddb3fe012caafdbf1bf51ab196fc` | `precheck-run2.log` |
| `e0c9763ef2e8509ece7b500567db3b240988c7be957e1f69fbcef21eff7d8c6b` | `precondition-run2.log` |
| `78cf93330880bd50c2eff4d6835c4b4517e25f6a337f88e1f52a3eaea072261e` | `run-run2.log` |

## 8. Commit hash

The local evidence/report/handoff commit is created after this report. No product commit and no push are part of this operation.

## 9. Remaining risks and open questions

The database contains no test seed data because C0 could not load the connection value from the only path authorized by the instruction. A Guardian instruction must provide and authorize the exact existing `.env` path before another attempt. This run did not infer, search for, or read a replacement path.

The external backup exists and is verified. It should be retained until P1 completes and receives Guardian review.

## 10. Recommended next step

Issue a narrowly scoped P1 retry that names the correct existing C0 file explicitly, preserves the in-memory-only credential rule, repeats the fresh zero-seed pre-check, and reuses or creates a verified backup as the Guardian directs. The seed must still run at most once.

من کدکس هستم
