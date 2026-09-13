HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G9B-RUN2-REVIEW
AUTHOR: CLAUDE
PHASE: G9B_RUN2_REVIEWED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: The G9b Run2 design (4b69fdc6..., codex 0159971/645f6e2) closes the G9 red items R1-R3 and mostly R6. GW2-P passed for both references and the migration hash is corrected. All 10 trigger messages in the error table match the migration.
Remaining gap is authority creation (R5/S10). The permission table omits these operations:
- create Membership
- issue Grant
- submit Claim
- start Verification
- human-confirm Capability/Evidence
There is no anti-escalation rule, and the DB does not enforce founding-once, grantor-holds-key or no self-grant.
Also:
- Membership is wrongly shown as a claim status actor.
- REJECTED->PENDING wipes the claim audit (S11).
- Evidence exactly-one (C7) was not actually added.
- Offer has no updated_at.
- Three citations are wrong.
- S3 is framed as W1-or-W2, but W1 is fixed by D2.
The minor fixes F1-F9 go into G9c together with the owner decisions.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9B_RUN2_DESIGN_FIXES.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The Codex core branch is at 645f6e2. main is 59322dc before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T18:20:00+03:30
NEXT_ACTION: The owner decides S1-S11 and R4; section 4 of the review gives Guardian recommendations. The Guardian then issues CODEX-20260913-G9C-CORE-SERVICE-LAYER-OWNER-DECISIONS-001, pinned, to record the decisions and apply F1-F9 (document only). Codex waits until then.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G9B-STOP-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-002

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; core is at 645f6e2 and the scope is 3 allowed files with no deletions in the handoff or earlier reports. diff --check is clean. I checked the report and design hashes and re-verified the GW2-P pins. Every design claim was checked against schema.prisma:327-655 and the migration (403-1009).

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
