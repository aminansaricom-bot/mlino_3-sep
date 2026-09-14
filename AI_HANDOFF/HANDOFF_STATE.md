HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A2
AUTHOR: CLAUDE
PHASE: G14A_CCR_APPROVED_G14A2_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner approved in chat: «CCR ستون published_content تصویب شد؛ OQ-1 تا OQ-5 طبق توصیه‌ی نگهبان (OQ-4 به‌صورت A′)؛ G14a-2 مجاز است.»
The CCR at ee25ead (sha256 95f4a3a1) is APPROVED.
- OQ-1 A: refuse if rows exist.
- OQ-2 A: audience in the snapshot and live; status live only.
- OQ-3 A: live fail-closed hide-only gates, including the Organization, Profile and Offer lifecycles.
- OQ-4 A-prime: contact and links sanitized now; business_hours and terms as-is until G14b.
- OQ-5 A: a single envelope.
Released CODEX-20260914-G14A2-PUBLISHED-CONTENT-IMPLEMENTATION-001:
- on codex/core-g14a-published-content from ee25ead; local commits only
- a disposable tmpfs postgres on 5499 (mlino-g14a2-testdb), removed at the end
- no local-DB apply, no push
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main is 7e16c98 before this commit. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-14T13:20:00+03:30
NEXT_ACTION: Codex executes G14a-2 with TARGET_HANDOFF_ID=HANDOFF-20260914-OWNER-APPROVAL-G14A2. Then:
1. Guardian review from the shared object store.
2. The Guardian publishes the branch.
3. The owner decides the merge into main and G14a-3 (local-DB apply with a backup), separately.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A1B-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the owner's CCR/OQ/G14a-2 approval

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main is 7e16c98, and origin/codex/core-g14a-published-content is ee25ead (published by the Guardian).

SCOPE_CONSTRAINT_NOTE: Only the new approval record and the AI_HANDOFF files were added or changed on main. No credential, Docker, database or Codex-branch action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
