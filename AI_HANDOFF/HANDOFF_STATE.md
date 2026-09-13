HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G9-REVIEW
AUTHOR: CLAUDE
PHASE: G9_REVIEWED_G9B_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: The G9 design skeleton is sound: W1 is mandatory, permissions come from Membership + Grant, projection is written only via Publication, all 13 triggers are mapped, tests run on tmpfs only, and no S item was decided by Codex. It is not yet ready for an owner decision:
- R1: the publish/withdraw revision contract and single-transaction offer replacement are missing.
- R2: OfferVersion is immutable from creation, not only after publish.
- R3: W1 is overclaimed; the DB guarantees only intra-row tenant consistency.
- R4: the founding/bootstrap flow is missing.
- R5: the per-operation permission table and the bounds on platform actions are missing.
- R6: the claim state machine is missing.
Yellow Y1-Y9:
- Evidence has exactly one owner, not "at most one".
- The OfferVersion projection fields are wrong.
- All triggers raise P0001, so mapping by message is fragile.
- The layering, audit and S-options sections are missing.
- The migration SHA-256 is wrong (...1167; the actual value is ...1169).
- My G9 instruction wrongly listed ExternalWorkspaceLink as a Core model.
- Codex continued despite the GW2 fetch failure.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9_CORE_SERVICE_LAYER_DESIGN.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The Codex core branch is at 75d5188 (design dfe6a9f). main is b41a172 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T17:30:00+03:30
NEXT_ACTION: Give Codex CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-001 (section 5 of the review). It is document only and needs no owner approval. The GW2 precondition is to stop if the review is unreadable from origin/main. After the Guardian reviews G9b, present the S decisions (with recommendations) plus the new bootstrap decision to the owner.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G8-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260913-G9-CORE-SERVICE-LAYER-DESIGN-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; the core branch is at 75d5188 and its scope is 3 allowed files. I checked the report hash, the schema and migration hashes from origin/main, every cited line range, and the trigger and CHECK bodies against the design claims.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
