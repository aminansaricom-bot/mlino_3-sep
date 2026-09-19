# CODEX Core Lifecycle Activation Report

**Instruction:** `CODEX-20260919-L-CORE-LIFECYCLE-ACTIVATION-001`
**Workstream:** `HANDOFF-20260919-CORE-LIFECYCLE`
**Status:** `IMPLEMENTED_AWAITING_DATABASE_VALIDATION`

## 1. Task executed

Core lifecycle operations were added for business profiles and capabilities. The implementation follows the existing transaction, tenant lock, permission, organization-scoped lookup, and error-mapping pattern. No schema, migration, permission, publication, or export change was made.

## 2. Source documents used

- `945fa10f2e2ac9a7db2a7736010561252885683d:AI_HANDOFF/CLAUDE_REVIEWS/20260919_OWNER_APPROVAL_L1_L5_LIFECYCLE.md`
- Pinned SHA-256 `c203263bf078f3878664a0fbcdece9b7c35be36e87428a6a8441bf083fecc62a`, verified through GW2-P.
- Schema defaults: `implementation/prisma/schema.prisma:478` (`DRAFT`) and `:503` (`PLANNED`).
- Export eligibility gates: `implementation/public-export/builder.ts:180` and `:194` (`ACTIVE`).

## 3. Files changed

- `implementation/core/business-profile-service.ts`
- `implementation/core/capability-service.ts`
- `implementation/test/core/l-lifecycle-activation.spec.ts`
- `implementation/validation/l/**`
- This report
- Append-only `mlino2/HANDOFF/HANDOFF_STATE.md`

## 4. Files not changed

- Prisma schema and every migration
- Export builder and publication service
- Every other Core service
- Package and lock files
- V2, Docker, `.env`, credentials, keys, `_PUSH_STAGING`, and owner database

## 5. Requirements and tests

| Requirement | Implementation | Exact covering tests |
|---|---|---|
| L1 profile activation | `business-profile-service.ts:59` | `L1 profile activate succeeds from DRAFT with a linked VERIFIED unexpired claim`; missing/PENDING/SUSPENDED/expired claim tests; `L1 profile ACTIVE and ARCHIVED states cannot be activated again`; permission/scope test |
| L1 profile archive | `business-profile-service.ts:80` | `L1 profile archive accepts DRAFT and ACTIVE, and ARCHIVED is terminal` |
| L2 capability activation | `capability-service.ts:92` | `L2 capability activate allows PLANNED without confirmation and rejects repeat activation`; permission/scope test |
| L2 capability retirement | `capability-service.ts:110` | `L2 capability retire allows only ACTIVE and RETIRED is terminal` |
| L3 export visibility | Both services | `L3 end to end lifecycle controls public export visibility` |

The profile activation gate requires a same-organization linked claim with status `VERIFIED` and either no expiry or a future expiry. Profile archive accepts `DRAFT` and `ACTIVE`, while `ARCHIVED` is terminal. Capability activation is exactly `PLANNED -> ACTIVE` and does not require confirmation. Retirement is exactly `ACTIVE -> RETIRED`.

## 6. Tests executed

- `npm run build` equivalent (`tsc -p tsconfig.json`) three consecutive times using already-installed dependencies through a temporary junction.
- The new database specification was compiled as part of every build.
- Database tests were not executed because no listener was present on the only permitted endpoint, `localhost:5499`.
- Docker was not started, exactly as required by the instruction.

## 7. Test results

| Validation | Result |
|---|---|
| Build run 1 | PASS |
| Build run 2 | PASS |
| Build run 3 | PASS |
| Lifecycle DB spec run 1-3 | NOT RUN — disposable DB unavailable |
| Mutation execution | Deferred to Guardian; three named mutations documented |

Evidence is under `implementation/validation/l/`. `LF-MANIFEST.txt` contains SHA-256 values calculated from Git blob bytes for implementation commit `1da3d9c`.

## 8. Commit hash

- Implementation/tests/evidence: `1da3d9c`
- Final report/handoff: subsequent local documentation commit
- Push: not attempted, as required

## 9. Remaining risks and open questions

The TypeScript compiler validates the new service and spec contracts, but transactional behavior, database constraints, permission outcomes, and export visibility still require the prescribed disposable PostgreSQL execution. No product workaround was introduced for the unavailable database.

## 10. Recommended next step

The Guardian should run `implementation/test/core/l-lifecycle-activation.spec.ts` three times against a fresh disposable PostgreSQL on `localhost:5499`, execute the three mutations in `implementation/validation/l/mutation.md`, and review the results before merging. After lifecycle acceptance, S1 test-seed integration can be resumed without direct table writes.

من کدکس هستم
