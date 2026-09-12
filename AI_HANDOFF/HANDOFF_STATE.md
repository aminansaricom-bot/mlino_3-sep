HANDOFF_ID: HANDOFF-20260912-G1-CLOSURE-REVIEW
AUTHOR: CLAUDE
PHASE: G1_POSTGRES_VALIDATION_CLOSURE_REVIEW
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: G1 NOT CLOSED. It is close, and it does not depend on G2 or schema.prisma. 12 of the 14 reported PASSes are accepted (4 with limited scope). "Index preserved after manual DDL" is not accepted as a migration test.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260912_G1_CLOSURE_REVIEW_REPORT.md
REPORT_SHA256: 21d5f67cb657e813b5e6dc95ce7aa836700258fee72d482a25380b46c363a9b1
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T16:10:00+03:30
NEXT_ACTION:
Run "G1b" (R1-R4). It needs no G2, no schema.prisma and no repo change: temp folder outside the repo, disposable PostgreSQL 16, the origin/main migration chain copied in, and Prisma 5.22.0 (already installed in the _PUSH_STAGING/implementation/node_modules clone).
- R1: record the fixture DDL, trigger bodies and per-test SQL as a text appendix in the report (not committed as schema or migration).
- R2: C15 leak test. After an event insert, a direct projection UPDATE on another target in the same transaction, and after ROLLBACK TO SAVEPOINT, must be rejected. Compare against a pg_trigger_depth() guard (P3). The tested candidate is the transaction-local flag variant whose leak the main plan predicted.
- R3: Prisma Migrate on 5.22.0:
  - DR-01: migrate diff must be empty after the manual SQL.
  - DR-02: a second migration after an unrelated field must contain only that field.
  - DR-03: the same check for the existing external_workspace_link_active_unique index.
  - FK-07: onDelete/onUpdate Restrict must show confdeltype/confupdtype 'r', not 'a'.
  - Also validate and generate with shadow pairs and composite FKs to @@unique([id, organizationId]), plus the Client write pattern.
- R4: the tests missing from the Codex plan:
  - C6 shadow pairs, including the MATCH SIMPLE demonstration (FK-05).
  - C2, C3 and C4.
  - The circular Organization/Membership FK.
  - DELETE on publications.
  - FY2: link rows for a published version.
  - Wrong-order version replacement, which must fail with 23505.
Can move to G2:
- M1: ExternalWorkspaceLink artefacts on the implementation branch.
- M2: C7-C11 against the final CCR DDL text.
- M3: re-run with real names.
- M4: extended concurrency (40 runs, SERIALIZABLE, replacement, claim and publish-vs-withdraw races).
- M5: normalisation and collation.
Documentation only:
- D1: Prisma is 5.22.0 in both lockfiles and installed on main; docs saying 5.20.0 are stale; pin it in the CCR.
- D2: the recorded plan SHA 72d18031... matches no LF or CRLF version of either plan.
- D3: two same-named plans (main 62 tests, Codex 13 tests); execution followed Codex's.
- D4: the ExternalWorkspaceLink to Organization FK is an owner decision (recommend: not in CCR 1).
- D5: none of P1-P12 applied (correct).
- D6: update the Codex handoff to G1_CLOSED after G1b.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-POSTGRES-VALIDATION-PLAN
EXECUTED_INSTRUCTION_ID: CLAUDE-20260912-G1-VALIDATION-REVIEW-001 (received from the owner)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5.

HANDOFF_PRECONDITION_CHECK: Both clones fetched. Codex at 76589be (results ce28f32; Codex plan 7411754); the design and blocker resolution are unchanged. main at a2fb238. The Prisma versions were read from both lockfiles and from the installed node_modules in the main clone. The plan hashes were computed from git objects in both LF and CRLF forms. The push was guarded on origin/main still being a2fb238.

SCOPE_CONSTRAINT_NOTE: Only the new mlino_book/MLINO_G1_CLOSURE_REVIEW.md and the AI_HANDOFF files were added or changed on main. No schema.prisma, no migration, no ADR, nothing on the Codex branch. No tests executed.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
