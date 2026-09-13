HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-MERGE-G10D
AUTHOR: CLAUDE
PHASE: G10C_MERGED_G10D_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved directly in chat ("تصویبش کن"): the G10c merge, G10d, and S14-A.
- G10c merge: the Guardian merged codex/core-g10c-profile-capability 908e956 into main 8aa4eaf with --no-ff.
  - Merge commit 5c71c73; tree 74acffb equals the Guardian merge-tree; no deletions; guarded push.
  - Runtime unchanged: read-api a07858b3; DB StartedAt unchanged, 0 restarts; 6 migrations; dspr=4.
- S14-A DECIDED: any actual public-field change on a HUMAN_CONFIRMED capability resets it to UNCONFIRMED (confirmer fields null) in the same update. It is implemented within G10d.
- G10d released.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_MERGE_G10D_RELEASE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: 5c71c732c72ce4c92928baa355c65b05d22b4dfc (merge commit on main). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T05:40:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G10D-CORE-OFFER-SLICE-001 (section 2 of the record), targeting THIS handoff ID and pinned. It goes on the new branch codex/core-g10d-offer from main:
- OfferService: key unique; version_number under an Offer lock; R2 immutable; links only before the first publish; allowlists.
- PublicationService for OfferVersion: org → Offer → version locks; null revision; ALREADY_PUBLISHED; single-tx REPLACED (withdraw old, then publish new).
- S14-A in CapabilityService.
After the Guardian review: a short owner confirmation to merge.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C3-REVIEW
EXECUTED_INSTRUCTION_ID: Owner direct approval in chat, 2026-09-14 (G10c merge; G10d; S14-A)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched main and the G10c branch. main is 8aa4eaf and clean; the G10c branch is 908e956.
- merge-tree gives 74acffb; the local merge tree matches; no deletions.
- Runtime baseline recorded; the push is guarded on 8aa4eaf.

SCOPE_CONSTRAINT_NOTE: main received the approved merge plus this record and the AI_HANDOFF files. No build, restart, migration, test or data action. No credential action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
