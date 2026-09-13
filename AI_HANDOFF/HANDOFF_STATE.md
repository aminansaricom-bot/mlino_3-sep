HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-REVIEW
AUTHOR: CLAUDE
PHASE: G10C_REVIEWED_G10C2_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: G10c (codex/core-g10c-profile-capability; 06f5e91 and dedd015; base main 6a224dd) has a correct publication core:
- R1: FOR UPDATE on the target row; publish with the current revision; republish only at a higher revision; withdraw with the published revision.
- S4/E2: ALREADY_PUBLISHED with no insert. S7: exact gate_snapshot grantId.
- Publication insert only.
- Profile D6 via an allowlist; S13-A claim link; capability human confirmation.
Environment clean: live DB untouched; tmpfs; volume lists identical; 25 suites and 322 tests; manifest 5/5; merge-tree bb9287e clean.
R1-G10c (red): CapabilityService.updatePublicFields passes the caller input straight to Prisma (data: input). A capability.manage holder can set HUMAN_CONFIRMED with any member as confirmer, bypassing capability.confirm and forging the confirmer (ADR-0006/0009). It can also change capabilityKey, capabilityStatus and freshUntil.
Yellow:
- Y1: no capability publication tests.
- Y2: missing-permission tests only for capability.manage.
- Y3: the "initial guard" test actually tests the projection guard.
- Y4: non-uniform publish result.
- Y5: no runtime target validation.
- Y6: S13-A tested with PENDING only.
- Y7: an empty name is allowed on profile update.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_PROFILE_CAPABILITY.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). The G10c branch is at dedd015. main is 6a224dd before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T04:00:00+03:30
NEXT_ACTION: Relay CODEX-20260914-G10C2-PROFILE-CAPABILITY-FIXES-001 (section 4 of the review), targeting THIS handoff ID and pinned. It stays within the G10c authorization. The G10c merge is blocked until the G10c2 review passes; then a short owner confirmation.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12B-MERGE-G10C
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260914-G10C-CORE-PROFILE-CAPABILITY-SLICE-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched; the G10c branch is at dedd015 with merge-base 6a224dd.
- Scope and secret scan; read all three services, the adapter diff and the spec line by line.
- Initial/rerun/full test logs, volume before/after; manifest 5/5.
- Live DB counts and read-api image; read-only merge-tree.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main. No credential, Docker write, database write or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
