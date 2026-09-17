HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-G14B2
AUTHOR: CLAUDE
PHASE: G14B1_DECIDED_G14B2_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved in chat: «توصیه‌های نگهبان برای Q1 تا Q10 تصویب شد؛ G14b-2 مجاز است.»
Decisions recorded:
- Q1 Ed25519 detached, base64url unpadded.
- Q2 the private key in an OS secret store, a versioned key_id, ephemeral keys only in dev and tests.
- Q3 a 60s scheduled task running the CLI, two retained artifacts, output outside the repository.
- Q4 polling with a fail-closed TTL in the consumer; an immediate invalidation signal is a later, separate step.
- Q5 invalid business_hours becomes null.
- Q6 invalid terms drops that offer.
- Q7 fresh_until is LIVE eligibility metadata read at build time, no CCR, because content stays snapshot-only and freshness is not content.
- Q8 at most one PUBLISHED profile per organization; until the partial-unique-index CCR is approved, the producer skips such organizations fail-closed.
- Q9 policy v1 is confirmation plus freshness only.
- Q10 as_of is part of the input; byte identity means data plus as_of plus policy plus key_id.
Released CODEX-20260917-G14B2-PUBLIC-EXPORT-IMPLEMENTATION-001 on codex/v1-public-export from 9430c22, local commits only:
- a new implementation/public-export module (canonical, signing over node:crypto, builder, CLI), tsconfig include entries and a scripts entry only, no dependency change
- the producer never writes to the database and runs in one read-only snapshot
- tests in implementation/test/public-export covering selection, every hiding gate, Q5, Q6, Q8, byte identity, signature verify and tamper, and no-secret logging
- validation: tsc, the focused spec, then THREE consecutive full-suite runs on fresh disposable DBs with committed logs
Out of scope, each needing separate approval: the Q8 unique-index CCR, G14c, and any real scheduled run in the owner's environment.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B2_EXPORT_IMPLEMENTATION.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 0837884 before this commit; the G14b branch is at 9430c22 on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T15:40:00+03:30
NEXT_ACTION: Codex executes G14b-2 with TARGET_HANDOFF_ID=HANDOFF-20260917-OWNER-APPROVAL-G14B2. Then:
1. Guardian review.
2. The owner decides the merge.
3. Then the Q8 CCR, then G14c.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-G14B1-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's Q1-Q10 decisions and releasing G14b-2

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 0837884, and origin/codex/v1-public-export is 9430c22 (published by the Guardian). The runtime was verified after the G15 merge and is unchanged.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
