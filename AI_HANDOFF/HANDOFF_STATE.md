HANDOFF_ID: HANDOFF-20260913-GUARDIAN-G3-CCR-REVIEW
AUTHOR: CLAUDE
PHASE: ARCHITECTURE_GUARDIAN_REVIEW_G3_CCR_DRAFT
STATUS: DELIVERED_AWAITING_OWNER_DECISION
REVIEW_VERDICT: APPROVED_WITH_FIXES. The CCR is not yet approvable. R-1 and R-2 are real holes against the approved design; R-3 needs new owner decision D6; R-4..R-7 are alignment, test-coverage and documentation fixes. Next step is G3b: fix the CCR text, add tests T1..T12, and re-validate from scratch in a new g3b folder. schema.prisma and the product migration stay BLOCKED.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3_CCR_DRAFT.md
REPORT_SHA256: 753859b2087357baedf49e9a801c781fa6c98d750a5f82d95fbb083ab6098c57
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-13T02:10:00+03:30
NEXT_ACTION:
1. Owner decides D6, the content_revision increment mechanism for Profile and Capability public fields. A = a DB BEFORE UPDATE trigger that auto-increments on change (guardian recommends A); B = domain service only.
2. Give Codex CODEX-20260913-G3B-CCR-FIXES-001 (review section 4) with OWNER_DECISION_D6 filled in. Branch codex/core-prisma-foundation; TARGET_HANDOFF_ID HANDOFF-20260912-CORE-PRISMA-FOUNDATION.
3. After G3b: guardian review, then owner approval of the CCR (DRAFT -> APPROVED), then a separate instruction for schema.prisma and the migration.
Findings:
- R-1 (red): the C15 guard triggers are BEFORE UPDATE OF publication_status only. A direct UPDATE of published_content_revision (business_profiles, capabilities) or published_at (offer_versions) bypasses the guard and publishes edited content without a Publication event. Blocker resolution 5.2 required all three columns. Not tested.
- R-2 (red): offer_version_capabilities guards only UPDATE and DELETE. INSERT can change the capability links of a published version, contradicting FY2 (insert/delete only while published_at IS NULL; update never). Not tested.
- R-3: the CCR does not say how content_revision is incremented (blocker resolution 4.3 requires DB or a single write path). This is owner decision D6.
- R-4: allow PUBLISHED -> PUBLISHED with a higher content_revision, as design 5.2 requires; the current trigger forbids it.
- R-5: add tests T1..T12. The Profile and Capability publication paths were never exercised; C12 DELETE and the per-table C8 checks are missing; the closed trigger-list inventory must compare the exact set.
- R-6: the Membership model and table were renamed to OrganizationMembership / organization_memberships without a reason. Revert, or record the reason.
- R-7: state explicitly in the CCR that the D1 mechanism includes transition validation (equivalent to proposal P2).
Accepted and verified independently:
- The C6 three-valued-logic defect was found and fixed; all 12 corrected pair checks were read.
- Scope is clean with zero forbidden paths; the handoff change is append-only.
- The read-only _PUSH_STAGING Prisma fingerprint equals the baseline in all four folders.
- g3-tooling is gone and no g3 container remains.
- LF hashes match canonical-git-hashes.log; D1-D5 are recorded; D4 is respected; D5 map names are used; W1 gives P2003.

PREVIOUS_HANDOFF_ID: HANDOFF-20260912-GUARDIAN-G2-REVIEW
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role; triggered by the owner relaying the G3 report)

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as MLINO Architecture Guardian.

HANDOFF_PRECONDITION_CHECK:
- Fetched and pruned: origin/codex/core-prisma-foundation is at 48834d1, equal to local.
- Checked the diff scope from ee7fb95.
- Read the full CCR (1067 lines) and the full assertions.sql.
- Grepped the g3 SQL for guards, grants and external-link references.
- Recomputed the _PUSH_STAGING fingerprint.
- The push was guarded on origin/main still being 89aef7a.

SCOPE_CONSTRAINT_NOTE: Only the new AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3_CCR_DRAFT.md and the AI_HANDOFF files were added or changed on main. Nothing on either Codex branch, in Docker, in any database or in _PUSH_STAGING/implementation was modified. No schema.prisma, no migration, no ADR, no code.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
