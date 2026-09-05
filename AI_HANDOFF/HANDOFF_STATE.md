HANDOFF_ID: HANDOFF-20260905-AC2-MIN-POLICY-DESIGN
AUTHOR: CLAUDE
PHASE: V1_MINIMUM_AC2_ACCESS_POLICY_DESIGN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260905_V1_MINIMUM_AC2_POLICY_DESIGN_REPORT.md
REPORT_SHA256: ccfaea28f42ed7e66d9b39f55331354d9798afd2e9cf2fe0cf04606bdf0d19d1
DELIVERABLE_PATH: C:\mlino code\V1_MINIMUM_AC2_ACCESS_POLICY.md
DELIVERABLE_SHA256: 3f49e91d053325f15ee54d5cd2316ed08893891bd7a5a7c33a904facacfde4bf
ZIP_PATH: (none built this pass)
CREATED_AT: 2026-09-05T00:00:00
NEXT_ACTION: WAIT — design document delivered directly under product-owner authorization (not via a Mamad CODEX_NEXT_INSTRUCTION.md instruction — disclosed honestly in the report). Awaiting independent review (Mamad) and, separately, the product owner's answers to the open questions in the design doc's §4 (who is "Consumer"; does internal clinic use of patient data require explicit consent) before any real AC2DecisionPort Adapter code is authorized.

BLOCKED_ATTEMPT (2026-09-05T19:15:00): Received CODEX-20260905-1908-AC2-REAL-ADAPTER-AUTH (real AC-2 Adapter, Option 1 org-membership policy + R8 gap doc). Its TARGET_HANDOFF_ID (HANDOFF-20260904-AC2HARDENING-REVIEW-ACK) and TARGET_REPORT_SHA256 (62b5d208...) do NOT match this HANDOFF_ID/REPORT_SHA256 above (they match the PRIOR handoff, before this design-doc pass) — real mismatch, not a misread. Refused to execute per protocol; registered as HANDOFF-20260905-BLOCKED-AC2-ADAPTER-MISMATCH (see AI_HANDOFF/CLAUDE_REPORTS/20260905_BLOCKED_HANDOFF_MISMATCH_AC2_REAL_ADAPTER.md). No code or files from that instruction's scope were touched. This HANDOFF_ID/REPORT_SHA256 above remain the correct target for a corrected reissue.

PREVIOUS_HANDOFF_ID: HANDOFF-20260904-AC2HARDENING-REVIEW-ACK
EXECUTED_INSTRUCTION_ID: (none — direct product-owner chat authorization, no CODEX_NEXT_INSTRUCTION.md instruction this pass)
NOTE: Produced V1_MINIMUM_AC2_ACCESS_POLICY.md — a pure design document (no Adapter code written) covering: decision inputs (grounded in actual current code — none of the ownership/consent fields exist in shared-contracts/types.ts or prisma/schema.prisma today), a formalized 10-rule minimum policy, a two-level Opportunity/Evidence access-check split (with an explicit decision to deny the whole candidate rather than silently redact when no official Redacted view exists), the core open policy/legal question (who is "Consumer"; does internal clinic use require explicit patient consent) left deliberately unanswered pending product-owner/legal input, a deferred full-Consent-infrastructure GAP list, a 17-scenario mandatory test plan for the eventual real Adapter, and 10 required design outputs including a finding that implementing the real ownership/consent fields will require a formal CCR (touches the frozen shared-contracts/types.ts and prisma/schema.prisma), not just an Implementation Design. Honest finding surfaced: applying the new policy strictly to today's actual data would deny everything, since no Opportunity/Evidence in V1 carries any ownership classification yet — this is disclosed in the doc, not hidden. No code, frozen file, or contract was touched. Mock always-allow remains Test/Development-only; explicitly prohibited in Production per the product owner's own instruction.
