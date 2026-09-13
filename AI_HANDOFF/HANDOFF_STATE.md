HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12B-REVIEW
AUTHOR: CLAUDE
PHASE: G12B_ACCEPTED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G12b (codex/v1-test-guard-hardening; 2789324 and a3aff63; base main 8835f88) is accepted.
- H1: any unsafe DATABASE_URL line in either file → reject.
- H2: export prefix and quotes accepted; other forms fail-safe.
- H3: prisma/.env checked.
- Env precedence kept.
- 14 unit tests; the full V1 suite passes with the guard on (24 suites, 313 tests); @db: refusal ran 0 tests.
- Disposable DB on 5499 removed; volume lists identical; live DB and read-api unchanged; manifest 4/4.
- Read-only merge-tree 6773d3e is clean.
Deviations (not blocking):
- The single-path signature was kept; prisma/.env is derived internally and setup-env.ts is unchanged.
- The tests for an unsafe export line and for first-unsafe/last-safe are missing (the logic covers both).
- The CCR's G12b rollback wording is imprecise.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12B_V1_TEST_DB_GUARD_HARDENING.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The hardening branch is at a3aff63. main is 8835f88 before this commit. The core branch is at 2d2bc17. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T03:00:00+03:30
NEXT_ACTION: The owner decides, in one message:
(a) "merge of G12b into main is authorized";
(b) G10c authorized: the Profile + Capability slice — BusinessProfileService/CapabilityService with D6, PublicationService for profile/capability (R1, S4/E2, S7), capability human confirmation, C4/capability_key conflicts; no Offer/Evidence/HTTP;
(c) S13: the Guardian recommends S13-A, profile links only to a VERIFIED same-org claim.
Then the Guardian merges G12b (--no-ff, guarded), records the decisions, and issues the exact G10c instruction targeting the merge-record handoff, on a new branch from main.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12A-MERGE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G12B-V1-TEST-DB-GUARD-HARDENING-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the hardening branch is at a3aff63 with merge-base 8835f88.
- Scope; read the guard code, spec diff and CCR diff.
- Refusal and full-suite logs, volume before/after, container evidence; manifest 4/4.
- Live DB counts and read-api image; read-only merge-tree preview.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
