HANDOFF_ID: HANDOFF-20260912-POSTGRES-VALIDATION-PLAN
AUTHOR: CLAUDE
PHASE: G1_POSTGRES_VALIDATION_PLAN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: Validation plan only; no tests executed. 62 tests (PC 16, FK 12, ID 12, CT 10, IM 7, DR 5), each with an expected SQLSTATE. 15 approved constraints (C1-C15) with DDL, plus 12 new proposals (P1-P12) for the owner to decide. 3 findings in the existing design: C15 flag leakage, MATCH SIMPLE, and the ExternalWorkspaceLink FK inconsistency.
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260912_POSTGRES_VALIDATION_PLAN_REPORT.md
REPORT_SHA256: 6afcbaf54b739b52eeb3599289b901400eac37e34484603ec135a848ec8fc6ad
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - plan only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T15:30:00+03:30
NEXT_ACTION:
1. Execute mlino_book/MLINO_POSTGRES_VALIDATION_PLAN.md.
   - Environment: disposable PostgreSQL 16 container outside the repo, credentials in env only, Prisma 5.20.0.
   - Baseline: the 5 existing origin/main migrations, then experimental Core DDL. This makes G1 independent of G2.
   - Output: PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md.
2. Owner decisions arising from the plan:
   - (a) Is the ExternalWorkspaceLink to Organization FK in CCR 1? Blocker resolution section 3.2 lists it; design sections 4.1 and 7 and gate report section 8 exclude it. I recommend no.
   - (b) Accept or reject P1-P12 after the G1 results, especially P2 (transition validation and row lock in the publication trigger), P3 (pg_trigger_depth guard instead of a transaction-local flag), P6 (revoke DELETE and TRUNCATE on history tables), P7/P8 (terminal-state guards), P9 (auto-increment content_revision) and P10/P11 (identifier normalisation floor rejecting Persian/Arabic digits; C collation).
Findings:
- F-1: the set_config transaction-local flag proposed in blocker resolution section 5.2 stays on until commit, so a later direct UPDATE in the same transaction passes the guard. PC-04 decides between B1 (pg_trigger_depth) and B2 (reset flag).
- F-2: under the default MATCH SIMPLE, a composite FK with any NULL column is not checked, so C6 is mandatory, not a nicety; MATCH FULL is proposed as a second layer (P1).
- F-3: the ExternalWorkspaceLink FK inconsistency above; FK-12 is evidence only.
Also: FK-07 must see RESTRICT ('r') in pg_constraint. Prisma NoAction maps to NO ACTION ('a'), which is not the approved policy.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FINAL-READINESS
EXECUTED_INSTRUCTION_ID: CLAUDE-20260912-POSTGRES-VALIDATION-DESIGN-001 (received from the owner)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5.

HANDOFF_PRECONDITION_CHECK: Both clones fetched. The Codex branch is at 7666d94; the design is unchanged since 84420ad; blocker resolution is at 78223bd. main was fast-forwarded from f23e297 to dd374df (new review/MLINO_CORE_PRISMA_READINESS_REVIEW.md, read). The push was guarded on origin/main still being dd374df.

SCOPE_CONSTRAINT_NOTE: Only the new mlino_book/MLINO_POSTGRES_VALIDATION_PLAN.md and the AI_HANDOFF files were added or changed on main. Nothing on the Codex branch was modified. No schema.prisma, no migration, no code, no tests executed.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
