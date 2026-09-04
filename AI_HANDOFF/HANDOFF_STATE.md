HANDOFF_ID: HANDOFF-20260904-AC2-DUP-HARDENING
AUTHOR: CLAUDE
PHASE: AC2_DUPLICATE_DECISION_HARDENING
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260904_AC2_DUP_HARDENING_REPORT.md
REPORT_SHA256: 844b45959f92403e85a435ddf4890322d3533b05c211e7003c42c1a042491f51
ZIP_PATH: (none built this pass)
CREATED_AT: 2026-09-04T17:10:00
NEXT_ACTION: WAIT — stop condition per Mamad's instruction (CODEX-20260904-1647-AC2-DUP-HARDENING-AUTH, bond 5.5). Independent review of this delivery is Mamad's next step; no new phase begins without explicit product-owner decision.

PREVIOUS_HANDOFF_ID: HANDOFF-20260904-RETRACTION-REVIEW-ACK
EXECUTED_INSTRUCTION_ID: CODEX-20260904-1647-AC2-DUP-HARDENING-AUTH
NOTE: F-1 hardening implemented exactly per authorized scope — evaluateAC2FailClosed now denies (a) any candidate sharing a duplicated opportunity_correlation_id in the INPUT array, before ever calling the Port, and (b) any candidate for which the Port returns >1 AC2Decision for the same opportunity_correlation_id, regardless of order/content (never "last one wins"). Existing fail-closed matrix (throw/non-array/missing/invalid-allow/empty subject refs/evidence-injection filter/malformed authorized_evidence_refs) unchanged. Only 3 files touched: ac2-decision-port.ts (production) + opportunity-read.spec.ts + fake-ac2-decision-port.ts (test infra, same file touched in the prior self-review pass for the analogous malformed-evidence scenario). 4 new regression tests (exceeds the required 3). 130/130 tests pass on real Postgres (126 previous + 4 new, zero regressions), tsc clean, zero drift on both frozen files (types.ts, schema.prisma — checksums match the RETRACTION review's reference values exactly). Code commit fe1bdf08df32a76553cff730bc513922258a30f3 pushed to origin/main (rebased cleanly onto Moji's independent, non-overlapping mlino2/ Phase 1 delivery b4a5d5a). This HANDOFF_STATE update + report is pushed in a second, separate commit per the two-commit evidence pattern. Open gaps unchanged: R4 (BLOCKED), R5-Concurrency (OPEN by design), real AC-2 Adapter (not built), RETRACTION for F-01/F-03 (out of scope). Independent review of this delivery is Mamad's next step.
