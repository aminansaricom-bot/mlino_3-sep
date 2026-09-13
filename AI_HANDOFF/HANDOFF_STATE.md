HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12A-REVIEW
AUTHOR: CLAUDE
PHASE: G12A_ACCEPTED_MERGE_PENDING_OWNER
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G12a (codex/v1-test-guard; 9033f7e, 8807dac, 289be12; base main c0e501f) is accepted.
- A pure assertSafeTestDatabase is called first in setup-env.ts. The env value takes precedence over .env; only localhost/127.0.0.1/::1 on 5499 is allowed; 5435, @db: and unparsable URLs are rejected; messages never leak the URL.
- 10 unit tests; the full V1 suite passes with the guard active (24 suites, 309 tests).
- End-to-end refusal with an unresolvable @db: URL: 0 tests run; no 5435 run ever.
- Disposable DB on 5499, removed; volume lists identical; live DB and read-api unchanged; manifest 4/4.
- Structure-only check of the real _PUSH_STAGING/implementation/.env (no values read): 1 DATABASE_URL line, no export, targets 5435 = the live DB. The hazard was real and the guard rejects it. No prisma/.env anywhere.
Hardening for G12b (not present today):
- H1: multiple lines; dotenv takes the last one, the guard takes the first.
- H2: an export prefix.
- H3: prisma/.env.
- Fix: fail closed if ANY DATABASE_URL line in either file is unsafe.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12A_V1_TEST_DB_GUARD.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The guard branch is at 289be12. main is c0e501f before this commit. The core branch is at 2d2bc17. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T02:00:00+03:30
NEXT_ACTION: Short owner confirmation: "merge of G12a into main is authorized". Then the Guardian runs merge-tree and a --no-ff merge of codex/v1-test-guard into main, with a guarded push and post-merge verification. After that, G12b (H1-H3) is issued targeting the merge-record handoff, within the G12a authorization. G10c follows with separate owner approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING (until the G12a merge, nothing blocks it there).

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-V1-TEST-GUARD
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G12A-V1-TEST-DB-GUARD-002

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the guard branch is at 289be12 with merge-base c0e501f.
- Scope and secret scan; read the guard, the setup-env diff, the spec and the CCR.
- Refusal log, full-suite log, volume before/after and container evidence; manifest 4/4.
- Live DB counts and read-api image.
- Structure-only grep counts of the .env files (no values printed).

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action. No .env value read or printed.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
