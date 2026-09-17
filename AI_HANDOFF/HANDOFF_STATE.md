HANDOFF_ID: HANDOFF-20260918-GUARDIAN-Q8-3-MERGE
AUTHOR: CLAUDE
PHASE: Q8_COMPLETE_G14C1_PENDING
STATUS: APPROVED_NEXT_STEP
REVIEW_VERDICT: Q8-3 (53cef38, 8bf18a1, 9630be3; published by the Guardian) SUCCEEDED and its evidence is merged.
The owner granted the connection exception in chat: «اجازه‌ی فقط-حافظه‌ی خواندن DATABASE_URL برای Q8-3 هم برقرار است.» That exception EXPIRED with Q8-3; any future live-DB step needs a fresh one.
Guardian verification, read-only and independent:
- 8 finished migrations, none rolled back; the newest is 20260917010000_add_business_profile_published_unique
- the index exists, is UNIQUE and valid, with the predicate WHERE publication_status = 'PUBLISHED'
- triggers 13 and CHECKs 30 unchanged; registry 4; business_profiles 0; publications 0
- both containers unchanged; read-api returns 401; no temp dump in the container; no dump in the repository
- backup mlino_v1_pre_q8_20260917T202400Z.dump on the host: 103980 bytes, SHA-256 3ed1d514... equal to the in-container value, PGDMP header, 215 restore entries
- c0.log carries only booleans; the five grep hits are the script's own redaction patterns and a localhost curl
- migrate status exiting 1 was correctly read as "one migration pending", not as a failure; deploy ran once with exit 0
- two earlier attempts stopped on script bugs BEFORE any DB connection, backup or migration, and their logs are kept
Merged into main: merge commit c482318894e4b2dacc1ba3b18f9bee56bebdae1a, tree 8f39a942, parents 0bc1eb4 and 9630be3; 28 files, additions only, 0 product files.
THE COMPOSE-BUILD HOLD IS LIFTED: the migration is applied, so a build can no longer apply it unbacked.
Project state: G14a, G15, G14b and Q8 are all in main; G14a and Q8 are also applied to the local DB.
Remaining: (1) G14c, the V2 consumer, starting with the design; (2) the real key adapter and scheduling, an operational owner decision; (3) tightening the error mapping noted as N1 in the Q8-2 review.
G14c-1 is re-issued as CODEX-20260918-G14C1-V2-CONSUMER-DESIGN-006 against this handoff; only the id, target and pin change.
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_Q8_3_LOCAL_MIGRATION_MERGE.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: c482318894e4b2dacc1ba3b18f9bee56bebdae1a (an evidence-only merge). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-18T09:00:00+03:30
NEXT_ACTION: Codex may run G14c1-006 with TARGET_HANDOFF_ID=HANDOFF-20260918-GUARDIAN-Q8-3-MERGE. The owner decides the key and scheduling whenever they wish.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-MERGE-Q8-3
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260917-Q8-3-LOCAL-INDEX-MIGRATION-001 and merging its evidence

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: Read 9630be3 from the shared object store (scope, leak grep, report, all evidence logs). Independent read-only DB, container, read-api and backup-file verification. The trial merge-tree gave 8f39a942 and the merge tree equals it.

SCOPE_CONSTRAINT_NOTE: The evidence-only merge plus the AI_HANDOFF record files, and the Codex branch ref published unchanged. The Guardian performed no write to the database and never opened any .env file.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
