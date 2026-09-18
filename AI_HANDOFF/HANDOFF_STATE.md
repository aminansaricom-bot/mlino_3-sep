HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-3
AUTHOR: CLAUDE
PHASE: M2_3_RELEASED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The owner wrote «M2-3 (اتصال روی میزبان) م». The message was cut off and was read as «مجاز است», following the Guardian's preceding proposal.
The approval covers code, configuration and tests on branches ONLY. Any real host change needs a NEW owner grant:
- a real folder or ACL;
- a V2 container rebuild or up;
- any real key.
Released two PARALLEL instructions on the SOL model; an Astra review/debug round follows after the Guardian review.
- CODEX-20260918-M2-3A-PUBLIC-EXPORT-DISTRIBUTION-001 (V1, new branch codex/public-export-distribution from main):
  - a distribute step that verifies the signature, freshness and no-rollback rule, then atomically copies ONLY the current artifact to the public dir;
  - setup/verify PowerShell scripts for an NTFS ACL with inheritance disabled (G1);
  - tests use TEST keys and temp dirs, with mutation proofs.
- CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-001 (V2, new branch codex/v2-public-export-route from 540ad2d):
  - exact-match Nginx locations with no SPA fallback, no-store and nosniff;
  - a read-only mount with an empty default;
  - public build args;
  - version.json plus a guarded one-time reload (G2);
  - tests with mutation proofs, and no Docker.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_3_HOST_WIRING.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - approval record only). main was 696d59a before this commit. The V2 branch is at 540ad2d.
CREATED_AT: 2026-09-18T18:30:00+03:30
NEXT_ACTION: Codex executes M2-3a and M2-3b with TARGET_HANDOFF_ID=HANDOFF-20260918-OWNER-APPROVAL-M2-3. The Guardian then reviews both, running any ACL or Nginx tests the sandbox skipped. Then comes an Astra review round, then an owner grant for the real host application with a TEST key. After that: real key (G5), then M2-4.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-2-MAIN-MERGE
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), recording the M2-3 approval and releasing M2-3a and M2-3b

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian. Codex model per owner request: SOL for writing, Astra for the completion review and debugging.

HANDOFF_PRECONDITION_CHECK: origin/main is 696d59a and origin/codex/v2-intent-flow-foundation is 540ad2d. V2 nginx.conf currently has "location /" with an index.html fallback. The V2 compose file mounts only certificates. vite envPrefix is VITE_ and V2_.

SCOPE_CONSTRAINT_NOTE: Only the approval record and the AI_HANDOFF files changed on main.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
