HANDOFF_ID: HANDOFF-20260917-GUARDIAN-G14B1-REVIEW
AUTHOR: CLAUDE
PHASE: G14B1_ACCEPTED_OWNER_DECISIONS_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: G14b-1 (477075c and 9430c22; published by the Guardian as the new branch codex/v1-public-export) is ACCEPTED. The design document (5eebd9ff, DRAFT) is a good decision basis.
Verified:
- exactly the three allowed files; the FINAL contract, schema, migrations, code and the V2 branch are untouched; the worktree is clean
- the DTO block is byte-equal to section 7 of the FINAL contract; nothing added
- no key or secret anywhere; no S decision reopened; no E9 question decided
- content comes only from snapshots; live rows only hide; the ROW_NUMBER query implements the selection rule on existing indexes
- the signature covers the whole snapshot with a domain separator, excluding only signature.value, and key_id is inside the signed bytes
- canonical byte rules, atomic write, two retained artifacts, and the producer never writes to the DB
Two real gaps, both independently confirmed by the Guardian:
- No capability snapshot carries fresh_until (the approved CCR allowlist is capability_key, name, short_description, audience), yet the DTO has the field.
- business_profiles has no unique constraint on organization_id alone, so one organization can have several profiles.
Guardian owner package Q1-Q10: Q1 Ed25519; Q2 OS secret store with a versioned key_id; Q3 a 60s scheduled task plus the CLI, two retained artifacts; Q4 polling with a fail-closed TTL; Q5 null the field; Q6 drop that offer; Q7 DIFFERS from the document - treat fresh_until as LIVE eligibility metadata (the document's "hide capabilities lacking it" would hide every capability in v1); Q8 at most one PUBLISHED profile per organization via a small partial-unique-index CCR, fail-closed meanwhile; Q9 DIFFERS - state policy v1 explicitly as confirmation plus freshness only; Q10 as_of as part of the input, with byte identity defined over data plus as_of plus policy plus key_id.
Runtime verified after the G15 merge, read-only, at the owner's request: 7 migrations, jsonb column, CHECK validated, triggers 13, CHECKs 30, publications 0, registry 4, 22 tables, both containers up with 0 restarts and the same images, read-api 401, all three backups present.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G14B1_EXPORT_DESIGN.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - review only). main is 2eb8947 before this commit; the G14b branch is at 9430c22 on origin. Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-17T15:00:00+03:30
NEXT_ACTION: The owner decides (suggested: "Guardian recommendations for Q1-Q10 approved; G14b-2 authorized"). Then the Guardian records the decisions, releases G14b-2, and separately proposes the small partial-unique-index CCR if Q8 is approved.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-G14B1
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260917-G14B1-PUBLIC-EXPORT-DESIGN-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read 9430c22 from the shared object store (scope, the leak grep, the full design document, the report). Independently checked the BusinessProfile uniqueness in schema.prisma and the migration, and the capability snapshot allowlist in the approved CCR. Read-only Docker and DB verification.

SCOPE_CONSTRAINT_NOTE: Only the new review and the AI_HANDOFF files were added or changed on main, plus the new Codex branch published unchanged. No credential, Docker write, database write or code action.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
