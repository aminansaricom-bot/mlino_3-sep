HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12B-MERGE-G10C
AUTHOR: CLAUDE
PHASE: G12B_MERGED_G10C_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved directly in chat ("تصویبش کن"): the G12b merge, G10c, and S13-A.
- G12b merge: the Guardian merged codex/v1-test-guard-hardening a3aff63 into main bf9e54b with --no-ff. Merge commit e7ffce1; tree cdbac19 equals the merge-tree; no deletions; guarded push; runtime unchanged (read-api a07858b3, DB StartedAt unchanged, 0 restarts, 6 migrations, dspr=4). The V1 test DB guard (G12a + G12b) is complete in main.
- S13-A DECIDED: a profile links only to a VERIFIED same-org claim.
- G10c released.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12B_MERGE_G10C_RELEASE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: e7ffce1712bfbed41230fc6ec5a26eeb3918fbe6 (merge commit on main). The core branch is at 2d2bc17. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T03:30:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G10C-CORE-PROFILE-CAPABILITY-SLICE-001 (section 2 of the record), targeting THIS handoff ID and pinned to the record. It goes on the new branch codex/core-g10c-profile-capability from main:
- BusinessProfileService (D6; S13-A claim link; C4)
- CapabilityService (D6; key unique; human confirm)
- PublicationService for profile/capability (R1 FOR UPDATE; S4/E2 ALREADY_PUBLISHED no-op; withdraw with the published revision; S7 gate_snapshot)
After the Guardian review: a short owner confirmation to merge.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12B-REVIEW
EXECUTED_INSTRUCTION_ID: Owner direct approval in chat, 2026-09-14 (G12b merge; G10c; S13-A)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched main and the hardening branch. main is bf9e54b and clean; the hardening branch is a3aff63.
- merge-tree gives cdbac19; the local merge tree matches; no deletions.
- Runtime baseline recorded; the push is guarded on bf9e54b.

SCOPE_CONSTRAINT_NOTE: main received the approved merge plus this record and the AI_HANDOFF files. No build, restart, migration, test or data action. No credential action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
