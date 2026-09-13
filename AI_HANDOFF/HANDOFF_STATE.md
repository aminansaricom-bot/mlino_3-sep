HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-CORE-SERVICE-DECISIONS
AUTHOR: CLAUDE
PHASE: CORE_SERVICE_DECISIONS_APPROVED_G9C_RELEASED
STATUS: G9C_RELEASED
REVIEW_VERDICT: The owner approved all Guardian recommendations in direct conversation ("تصویبش کن"). S1-S11 and R4 are DECIDED:
- S1: internal in-process service in V1
- S2: single issuer; the selected org is validated against an ACTIVE Membership
- S3: W1 mandatory (D2); W2 not adopted
- S4: natural idempotency through the revision contract, with no new column
- S5: independent platform identity adapter
- S6: stable domain errors plus a transport adapter
- S7: gate_snapshot = grant id + policy version
- S8: a separate Core folder in implementation/
- S9: versioned read-only contract for V2
- R4: bootstrap by AC-2, in one transaction, once per organization
- S10: grant delegation (grantor holds the key, no self-grant, founding only in bootstrap, last-admin protection, membership-manage key); enforced in the service
- S11: REJECTED and EXPIRED claims are terminal; resubmitting means a new claim row
These are design decisions, not an implementation authorization.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_CORE_SERVICE_DECISIONS.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - governance record only). The Codex core branch is at 645f6e2. main is c6667bb before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T18:35:00+03:30
NEXT_ACTION: Give Codex CODEX-20260913-G9C-CORE-SERVICE-LAYER-OWNER-DECISIONS-001 (in the approval record).
- Pin for the G9b Run2 review: c6667bb, sha256 2cb32c0a...1a0c.
- The pin for the approval record is relayed with the instruction.
- The task is document only: record the decisions and apply F1-F9.
- Then the Guardian reviews G9c, and the owner gives final design approval before G10 implementation.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G9B-RUN2-REVIEW
EXECUTED_INSTRUCTION_ID: Owner direct approval in chat, 2026-09-13

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: main is c6667bb and clean. The push is guarded on origin/main still being c6667bb. The shared refs of the Codex clone are refreshed after the push, so GW2-P can pass.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
