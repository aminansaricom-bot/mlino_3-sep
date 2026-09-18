HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-2B-REVIEW
AUTHOR: CLAUDE
PHASE: M2_2B_REVIEWED_M2_2C_RELEASED
STATUS: APPROVED_WITH_FIXES
REVIEW_VERDICT: The M2-2b key adapter design is sound: scope is clean, no leak, and all 4 mutations are detected. However, the Guardian's run under the owner's account (galexy, profile loaded; isolated git-archive copy, no .env, no DATABASE_URL) gave 8 passed and 1 FAILED.
Findings:
- F1 (serious): DpapiProtector never works. Its PowerShell script, joined with '; ', yields "}; else {", which PowerShell rejects ("The term 'else' is not recognized"). The stub test could not see it, and the real test was skipped in the sandbox.
- F2 (serious): buildV2TrustBundle emits a numeric version, but the V2 parser (540ad2d trustBundle.ts:35) requires a string. V2 would reject every key.
- F3 (minor): an unset keystore path causes a TypeError instead of a fixed error code.
Rule from now on: a test skipped in the Codex sandbox is NOT evidence until the Guardian runs it.
Released CODEX-20260918-M2-2C-DPAPI-KEY-ADAPTER-FIXES-001: fixes plus a sandbox-runnable PowerShell parse test, a V2-rules trust-bundle test, and mutations (v) and (vi).
REPORT_PATH: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_2B_DPAPI_KEY_ADAPTER.md
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: the Guardian published codex/public-export-key-adapter at fda7803b72f4aa8bfc684d322d48601008e6b62e as a fast-forward with a lease on b6d07f7. main was 3e15475 before this commit.
CREATED_AT: 2026-09-18T17:00:00+03:30
NEXT_ACTION: Codex executes M2-2c with TARGET_HANDOFF_ID=HANDOFF-20260918-GUARDIAN-M2-2B-REVIEW. Then the Guardian re-runs dpapi.integration.spec.ts under the owner's account; it must PASS, not skip. Real key, M2-3 and M2-4 each need a separate approval.
PERMANENT RULE: never run npm test or jest in _PUSH_STAGING.

PREVIOUS_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-2-DPAPI-STOP
EXECUTED_INSTRUCTION_ID: CLAUDE-ARCHITECT-GUARDIAN-001 (standing role), reviewing CODEX-20260918-M2-2B-DPAPI-KEY-ADAPTER-CONTINUE-001

MODEL_ROUTING_NOTE: Executed by Claude Opus 5 as Architecture Guardian.

HANDOFF_PRECONDITION_CHECK: origin/main was 3e15475, and the branch was at b6d07f7 before the fast-forward. fda7803 descends from b6d07f7.

SCOPE_CONSTRAINT_NOTE: Only the review and AI_HANDOFF files changed on main. The Guardian's test run used random bytes and generated TEST keys in a scratchpad copy that has since been removed. No real key, credential store, Docker or database.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted.
