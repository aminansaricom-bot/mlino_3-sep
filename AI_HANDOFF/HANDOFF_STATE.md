HANDOFF_ID: HANDOFF-20260912-GUARDIAN-G2-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G2_CORE_BRANCH
STATUS: DELIVERED_AWAITING_OWNER_ACTION
REVIEW_VERDICT: APPROVED_NEXT_STEP. G2 gate PASS, with one documentation condition, G2-C1: hash convention. G1-C3 is closed by G2. Next step: G3 CCR draft plus validation of its exact text. schema.prisma stays BLOCKED until the owner approves the CCR.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G2_CORE_BRANCH.md
REPORT_SHA256: 4d65b222a0baa39461d5124c41f0d264dd0888f54ddd9eb0e47b82fff08b3f02
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T21:45:00+03:30
NEXT_ACTION:
1. Owner gives decisions D1-D5, preferably together with the G3 instruction:
   - D1: C15 mechanism. Guardian recommends B1, pg_trigger_depth() > 1 with a closed trigger list.
   - D2: W1 mandatory, W2 optional.
   - D3: pin Prisma to exactly 5.22.0.
   - D4: no ExternalWorkspaceLink to Organization FK in CCR 1.
   - D5: adopt the two G1-C4 rules (model every migrated table; manual constraint names must match Prisma's or use map:).
2. Give Codex CODEX-20260912-G3-CCR-DRAFT-001 (review section 5) with OWNER_DECISIONS filled in. Branch codex/core-prisma-foundation; TARGET_HANDOFF_ID HANDOFF-20260912-CORE-PRISMA-FOUNDATION.
   - Output: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md (DRAFT), validation evidence in mlino2/validation/g3/, and a report. Then STOP for guardian review.
3. After the guardian reviews the CCR and the owner approves it, a separate instruction for the schema.prisma change and migration.
Verified independently:
- The branch base is origin/main 28438f2, linear, with no merge, rebase or cherry-pick.
- Only the 11 allowed files, all added.
- The 7 documents have git blob IDs identical to the source f4d326f.
- .gitattributes is exactly "mlino2/validation/** -text"; implementation/ is untouched.
- The V2 branch (f4d326f) and main (28438f2) are unchanged.
- Manifest: 83/83 LF-canonical hashes recomputed and matching; manifest SHA-256 546bc02b...
- The handoff file is correct, the report hash matches, and no leftover package files remain.
G2-C1: the report's schema.prisma and five migration SHA-256 values are CRLF working-tree hashes. The canonical LF git-blob values are in review section 2 (schema.prisma e1c79133...). From now on, every hash is computed over git show bytes.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-GUARDIAN-G1C-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G2 report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned: origin/codex/core-prisma-foundation is at ee7fb95.
- Checked merge-base, name-status diff, git blob ID equality for the 7 documents, and the .gitattributes bytes.
- Recomputed the manifest over all 83 source blobs.
- Compared LF, CRLF and working-tree hashes for the schema and migrations.
- Checked the parent-folder leftovers.
- The push was guarded on origin/main still being 28438f2.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G2_CORE_BRANCH.md and the AI_HANDOFF files were added or changed on main. Nothing on either Codex branch, in Docker or in any database was modified. No schema.prisma, no migration, no ADR, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
