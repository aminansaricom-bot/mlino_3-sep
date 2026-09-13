HANDOFF_ID: HANDOFF-20260913-OWNER-APPROVAL-G8
AUTHOR: CLAUDE
PHASE: G8_OWNER_APPROVED
STATUS: G8_RELEASED
REVIEW_VERDICT: The owner approved G8 in direct conversation ("تصویبش کن"): rebuild the V1 read API image from main and restart it. The approval covers building the V1 stack images from main, replacing the mlino-v1-read-api container and a no-op v1-migrate. There must be no data, schema or volume change.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G8_RUNTIME_REBUILD.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - governance record only). main 9d1c423. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T18:35:00+03:30
NEXT_ACTION:
Give Codex CODEX-20260913-G8-V1-RUNTIME-REBUILD-001 (section 4 of AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md) with:
  OWNER_APPROVAL: G8 approved: rebuild the V1 read API image from main and restart it (recorded: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G8_RUNTIME_REBUILD.md)
Rollback anchor: the current read-api image is sha256:6e092dddeeecbd09579005db577204338b4d9e67d3f1271d5baf3416f6283c84 (implementation-v1-read-api:latest). Tag it mlino-v1-read-api:pre-g8 before any rebuild.
Preconditions at approval:
- mlino-v1-read-api is running with Restarts 0.
- mlino-v1-local-db is healthy with Restarts 0, six migrations, and empty Core tables.
- main is 9d1c423.
Hard stops:
- The backup (B1-B6) or the pre-g8 tag fails.
- v1-migrate applies any migration.
- Any of the verification checks a-e fails; in that case restore the pre-g8 image.

PREVIOUS_HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G7B-REVIEW
EXECUTED_INSTRUCTION_ID: Owner direct approval in chat, 2026-09-13

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Fetched; main is 9d1c423 and local is clean. docker inspect was run on both containers and the image list was read. The backup directory holds the pre-core dump. The push was guarded on origin/main still being 9d1c423.

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. Claude ran no Docker build, restart or database action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
