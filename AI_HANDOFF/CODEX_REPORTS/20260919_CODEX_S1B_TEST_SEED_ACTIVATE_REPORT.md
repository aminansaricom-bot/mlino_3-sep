# CODEX S1B Test Seed Activation Report

**Instruction:** `CODEX-20260919-S1B-TEST-SEED-ACTIVATE-002`
**Workstream:** `HANDOFF-20260918-TEST-SEED`
**Status:** `IMPLEMENTED_AWAITING_DATABASE_VALIDATION`

## 1. Task executed

The lifecycle merge was completed under the Guardian's append-only conflict rule. The seed flow now activates profiles and capabilities before publication. Withdrawal remains publication-only by default, with an optional `--archive` mode that archives profiles after withdrawal. A three-business synthetic integration specification was added.

## 2. Source documents used

- Conflict rule: `a3d9fbe4ad327d02d31970ae167b1f8115d54734:AI_HANDOFF/CLAUDE_REVIEWS/20260919_S1B_002_HANDOFF_CONFLICT_RULE.md`
- S1B instruction: `3fb0c01b04808047a1f161966131c6e1374a17c3:AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_L_MERGE_AND_S1B.md`
- GW2-P SHA-256: `97c1754f5b4ca9e11eca1e6b23aa8e9667c8e2c47eda4470b1aade02b9bc126a` — PASS.

## 3. Merge and conflict resolution

- Pre-merge HEAD: `425b7167351a7a0ba341606550cef28cc39d2565`
- MERGE_HEAD: `7d30d1ea493388b237af8cd2e588596cba3d7ef7`
- Merge commit: `a3890ae613012b8ee00d447b949ba54fad2b30f2`
- Only conflicted file: `mlino2/HANDOFF/HANDOFF_STATE.md`

The conflicted hunk contained these complete alternatives:

```text
open marker: `<<<<<<< HEAD`
HANDOFF_ID: HANDOFF-20260918-TEST-SEED
...
CREATED_AT: 2026-09-19
separator marker: `=======`
HANDOFF_ID: HANDOFF-20260919-CORE-LIFECYCLE
...
CREATED_AT: 2026-09-19
close marker: `>>>>>>> 7d30d1ea493388b237af8cd2e588596cba3d7ef7`
```

The resolved hunk preserved both complete records and removed only conflict markers:

```text
HANDOFF_ID: HANDOFF-20260918-TEST-SEED
...
CREATED_AT: 2026-09-19

---
HANDOFF_ID: HANDOFF-20260919-CORE-LIFECYCLE
...
CREATED_AT: 2026-09-19
```

The older S1 record remains first. No other merge file was edited.

## 4. Files changed after the merge

- `implementation/tools/test-seed/seed.ts`
- `implementation/tools/test-seed/withdraw.ts`
- `implementation/tools/test-seed/cli.ts`
- `implementation/test/tools/test-seed/seed.integration.spec.ts`
- `implementation/validation/s1b/**`
- This report
- Append-only handoff record

No Core, public-export, schema, migration, package, lock, V2, Docker, credential, key, real-data, or `_PUSH_STAGING` file was edited after the merge.

## 5. Core call sequence

The existing S1 sequence is unchanged except for the two lifecycle calls:

1. Bootstrap organization.
2. Submit claim, start verification, mark under review, decide `VERIFIED`.
3. Create and link profile.
4. `BusinessProfileService.activate(context, profileId)` — signature at `implementation/core/business-profile-service.ts:59`; call at `implementation/tools/test-seed/seed.ts:66`.
5. Publish profile.
6. Create and confirm each capability.
7. `CapabilityService.activate(context, capabilityId)` — signature at `implementation/core/capability-service.ts:92`; call at `implementation/tools/test-seed/seed.ts:71`.
8. Publish each capability.
9. Cleanup withdraws publications through `PublicationService`; optional archive calls `BusinessProfileService.archive(context, profileId, reason)` at `business-profile-service.ts:80`, from `withdraw.ts:28`.

All writes continue through official Core services. Idempotency still skips an existing `test-vanak-*` organization.

## 6. Tests created and executed

New integration test:

- `seeds three ACTIVE published businesses, exports them, remains idempotent, withdraws and archives without deleting rows`

It covers three synthetic businesses, null coordinates, ISO-day hours, two capabilities, `ACTIVE` and `PUBLISHED` states, public export content and marker, second-run idempotency, withdraw visibility, archive status, and non-decreasing organization/profile/capability/claim counts.

Executed three times:

- TypeScript build: PASS ×3, including compilation of the integration spec.
- Non-database test suites: PASS ×3.
- Each run: 2 suites, 17 tests passed.
- Integration spec: NOT RUN because no listener was available on permitted `localhost:5499`.
- Docker was not started.

## 7. Validation and leak results

- Actual mobile-number literal hits: 0
- Real business-name hits from the external 15-record file: 0
- `PRIVATE KEY` hits: 0
- Three database URL literals are synthetic unit-test values. No environment or `.env` value was read.
- Real input data was not copied or committed.
- Git-blob SHA-256 values for implementation commit `fba2f83` are in `implementation/validation/s1b/LF-MANIFEST.txt`.

## 8. Commit hashes

- Lifecycle merge: `a3890ae613012b8ee00d447b949ba54fad2b30f2`
- S1B implementation/tests/evidence: `fba2f83`
- Final report/handoff: subsequent local documentation commit
- Push: not attempted

## 9. Remaining risk

The integration test has compiled but still needs execution against a disposable PostgreSQL database. Until that run passes, transaction behavior, export output, idempotency, withdrawal, archive, and row-count assertions are not runtime-validated.

## 10. Recommended next step

The Guardian should run the integration spec three times on a fresh disposable PostgreSQL at `localhost:5499`, review the evidence, and then accept or return narrowly scoped fixes. No execution against the owner's database is authorized by this step.

من کدکس هستم
