HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-1-REVIEW
AUTHOR: CLAUDE
PHASE: M2_1_REVIEWED_AWAITING_OWNER_O1_O5
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The M2-1 operations design is accepted as DRAFT and ready for owner decisions.
- Document: mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md, 112 lines, git-show sha e00849ed...b295.
- Scope: 3 allowed files, 0 code, no leak.
- The Guardian spot-checked the cli, nginx, compose and builder citations; all are accurate.
Guardian notes:
- G1 (a condition on M2-3): on Windows, fs mode is effectively ignored, so NTFS ACLs must be set and measured explicitly.
- G2 (proposed for M2-3, drilled in M2-4): a no-store version file fetched each cycle forces open tabs to reload after a redeploy. It carries no keys and does not change C8-3.
- G3: an O1 concrete option is a DPAPI-protected PKCS8 key limited to the producer account, loaded into a KeyObject in memory. It is compatible with the current adapter contract.
- G4: the stricter-than-needed logging ban is accepted.
Recommended: O1=A, O2=A, O3=A, O4=A (conditional: no real operation until the tab refresh is proven), O5=B. Also merge the document into main.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_1_OPERATIONS_DESIGN.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: the Guardian published codex/public-export-operations-design at 62f07c7f289357d90a5ef093d900e6090857b4a0 (new branch, empty lease). Its merge against main is clean. main was 0a7727b before this commit.
CREATED_AT: 2026-09-18T15:00:00+03:30
NEXT_ACTION: The owner decides O1-O5, the document merge into main, and M2-2. M2-2 is the key adapter plus tests with TEST keys only; real key generation needs a separate approval and is done by the owner or an operator. No Codex instruction is outstanding.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260918-M2-1-PUBLIC-EXPORT-OPERATIONS-DESIGN-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main was 0a7727b, and the branch descends from it.

SCOPE_CONSTRAINT_NOTE: Only the review and AI_HANDOFF files changed on main. No credential, Docker or database action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
