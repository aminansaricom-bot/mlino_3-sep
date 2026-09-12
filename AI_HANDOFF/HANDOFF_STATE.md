HANDOFF_ID: HANDOFF-20260912-GUARDIAN-G1C-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G1C_AND_G1_GATE
STATUS: DELIVERED_AWAITING_OWNER_DECISION
REVIEW_VERDICT: APPROVED_NEXT_STEP. G1 gate: PASS WITH CONDITIONS (G1-C1..G1-C7; none requires re-running tests). Next step G2 option C, pending owner confirmation. schema.prisma stays BLOCKED until G2 and G3 close.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1C_VALIDATION.md
REPORT_SHA256: a586156cdad4d9551876ec6545408503591580d78569461b19d328274e7f8f81
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T21:10:00+03:30
NEXT_ACTION:
1. Owner confirms G2 option C: a new branch codex/core-prisma-foundation from fresh origin/main; the V2 branch is untouched; documents are copied byte-identical only, with no implementation transfer and no merge.
2. After confirmation, give Codex CODEX-20260912-G2-CORE-BRANCH-001 (review section 6). Its TARGET_HANDOFF_ID is the new HANDOFF-20260912-CORE-PRISMA-FOUNDATION; the V2 handoff HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION stays active for the V2 branch only.
3. Owner decisions for G3 (the CCR):
   - G1-C1: the C15 mechanism. Guardian recommends B1, a pg_trigger_depth() > 1 guard with a closed list of triggers allowed to write projection columns.
   - G1-C2: W1 (tenant only from auth context, as a direct scalar) recommended mandatory; W2 optional.
   - G1-C5: pin Prisma to exactly 5.22.0.
   - G1-C6: the ExternalWorkspaceLink to Organization FK in CCR 1. Recommended: no.
   - G1-C4: two CCR rules. Every migrated table must be modeled in schema.prisma, and manual constraint names must match Prisma defaults or be declared with map:.
Verified independently from the evidence:
- The C15 leak tests (same transaction, savepoint, pg_trigger_depth variant) are real.
- The MATCH SIMPLE half-pair demo is real.
- W1 wrote organizationId=org-b with parents from org-a and got P2003; W2 rejected the contradictory input with Unknown argument.
- Concurrency: READ COMMITTED 20 runs with 23505; SERIALIZABLE 12 runs with 40001 and 8 with 23505; the error log is empty.
- The --from-migrations baseline diff is empty, and the follow-up diff only adds a column.
- The inventory SHA-256 is identical; DR-03 and FK-07 pass on the live and history paths.
- The orphan volume was removed and the protected V1 volume remains; no secrets; scope is clean.
Findings:
- N1: checksums verify 47/47 on the CRLF working tree but only 16/47 against LF git blobs (core.autocrlf=true, no .gitattributes). Fix in G2 via an LF-canonical manifest plus .gitattributes.
- N2: the noisy initial diff log was not preserved.
- N3: the fixture adds an ExternalWorkspaceLink FK; this is not a decision.
- N4: Prisma auto-installed at the repo root again (cleaned and evidenced).
- N5: Codex's G2 documents contradict each other. Resolved as option C; this supersedes the merge advice in MLINO_PRE_PRISMA_DECISION_NOTE section 1.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-GUARDIAN-APPROVE-GOVERNANCE-FIXES
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G1c report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: The Codex clone was fetched; origin equals local HEAD at f4d326f. The scope diff from ebca267 shows no forbidden paths. The evidence was read directly: assertions, write path, concurrency, diff, inventory and cleanup logs. Checksums were verified both against the working tree and against git blobs. Docker volumes were listed independently. The push was guarded on origin/main still being 3a6cd2c.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1C_VALIDATION.md and the AI_HANDOFF files were added or changed on main. Nothing on the Codex branch, in Docker or in any database was modified. No schema.prisma, no migration, no ADR, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
