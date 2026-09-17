HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-CCR-REVIEW
AUTHOR: CLAUDE
PHASE: Q8_CCR_ACCEPTED_OWNER_DECISION_PENDING_G14C1_REISSUED
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: The Q8 CCR (70b73d6 and e74191f; published by the Guardian) is ACCEPTED. The document (1fa0fcd0, DRAFT) is a sound decision basis.
Verified:
- exactly three allowed files; the handoff is append-only; no schema, migration, code, test or config change; the CCR is unchanged since its first commit; the worktree is clean
- the hash I computed matches the report; GW2-P recorded; nothing was executed
- citations verified independently: builder.ts:168-178 is the MULTIPLE_PUBLISHED_PROFILES skip; the projection trigger really updates business_profiles.publication_status; the PublicationStatus enum matches
- strongest evidence: the existing 20260910020000_add_external_workspace_link migration already documents the same Prisma partial-unique limitation and solves it with raw SQL, so the proposal follows an accepted in-repo pattern
Technical assessment: the invariant is exactly one PUBLISHED profile per organization, leaving UNPUBLISHED and WITHDRAWN rows free; the preflight, lock and DDL form one atomic unit following the published_content migration; publishing a second profile fails on the trigger UPDATE with 23505 and rolls the whole transaction back; the error mapping must be constrained to this constraint name and proven by a test; withdraw frees the slot and REPLACED does not apply to profiles; no automatic data repair is proposed.
Guardian consistency check: publish A, withdraw A, publish B remains legal and still yields exactly one record, so the DB constraint and the producer logic do not conflict; the producer's fail-closed skip stays as a second layer.
Guardian owner package: approve the CCR; OQ-Q8-1=A (stop, never auto-pick a winner); OQ-Q8-2=A (transaction plus lock, harmless on today's empty table); OQ-Q8-3=A (ship the mapping and migration together); authorize Q8-2 (migration, error mapping and tests on a disposable DB). Q8-3, applying to the local DB with a backup, stays separate.
G14c-1 had not started, and this record changes the active handoff ID, so it is RE-ISSUED as CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-002 with the same content, targeting this handoff.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_PROFILE_UNIQUE_CCR.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). main is 6514b84 before this commit; the Q8 branch is at e74191f on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T19:00:00+03:30
NEXT_ACTION: The owner decides on the CCR and Q8-2 (suggested: "the profile unique-index CCR is approved (OQ-Q8-1=A, OQ-Q8-2=A, OQ-Q8-3=A); Q8-2 is authorized"). In parallel, Codex may run G14c1-002 against this handoff.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260917-Q8-PROFILE-UNIQUE-INDEX-CCR-001 and re-issuing G14c-1

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read e74191f from the shared object store: scope, the full CCR, the report, and independent verification of the cited lines in main.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the new Codex branch published unchanged. No credential, Docker, database or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
