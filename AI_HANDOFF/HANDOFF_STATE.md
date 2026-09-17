HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-G14B1
AUTHOR: CLAUDE
PHASE: G14B1_AUTHORIZED_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner authorized in chat: «G14b-1 (سند طراحی export امضاشده) مجاز است.» The scope is a design document only: no code, schema, migration, real key or live-DB contact.
Released CODEX-20260917-G14B1-PUBLIC-EXPORT-DESIGN-001:
- a new branch codex/v1-public-export from main, in a new worktree; local commits only
- deliverable mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md (DRAFT), sections E1-E9:
  E1 snapshot-only source plus live fail-closed gates and the selection rule
  E2 the FIXED public-business.v1 envelope and field mapping
  E3 signing algorithm and key policy options, with the hard rule that no key ever enters the repo, logs or artifacts
  E4 canonicalization so two runs over identical data are byte-identical
  E5 execution shape, atomic write, retention and how S23-B (5 minutes) is met; the producer never writes to the DB
  E6 the business_hours and terms schemas (OQ-4 A-prime) and non-conforming behavior
  E7 security and privacy (the S22-A allowlist; no internal ids)
  E8 the G14b-2 test plan on a disposable DB
  E9 open questions, none decided
The public-business.v1 contract is FIXED and must not be redesigned.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B1_EXPORT_DESIGN.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 9318295 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T10:30:00+03:30
NEXT_ACTION: Codex executes G14b-1 with TARGET_HANDOFF_ID=HANDOFF-20260917-OWNER-APPROVAL-G14B1. Then:
1. Guardian review.
2. The owner package: signing, keys, execution shape and cycle, plus G14b-2 authorization.
PENDING: once Docker runs, re-verify the runtime after the G15 merge (7 migrations, publications=0, the column and CHECK, read-api 401).
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-G15-MERGE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's G14b-1 approval

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 9318295 (the G15 merge record). The FINAL read-contract document and the S decisions are unchanged on main.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
