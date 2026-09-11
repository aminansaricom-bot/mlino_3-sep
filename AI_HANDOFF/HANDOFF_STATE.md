HANDOFF_ID: HANDOFF-20260911-ADR-REVIEW-CORRECTIONS
AUTHOR: CLAUDE
PHASE: ADR_REVIEW_CORRECTIONS_APPLIED
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REVIEW_VERDICT: Corrections R1-R9 and the clarification notes applied to ADR-0010, ADR-0011 and ADR-0012; consistency check against 15 decisions finds no remaining contradiction; all three remain "Draft - Pending Owner Approval - Not Approved"
REPORT_PATH: AI_HANDOFF/CLAUDE_REPORTS/20260911_ADR_REVIEW_CORRECTION_REPORT.md
REPORT_SHA256: d81d05549056eee4f34da08788d5ab013b473c7ca95cef2d53a81c2d7dc46444
ZIP_PATH: (none built this pass)
CODE_COMMIT_SHA: (none - documentation only, zero code change). Content Studio f6946a8 remains local only, see OD-09.
CREATED_AT: 2026-09-12T01:45:00+03:30
NEXT_ACTION: Return for the owner's decision on ADR-0010, ADR-0011 and ADR-0012. An independent second review (Mamad or Codex) is still recommended before approval, because drafter, reviewer and editor are the same model. After approval, a separate instruction is needed to record the ADRs in the register and changelog and to change the status line. ADR-0007, ADR-0008 and ADR-0009 still await review. Implementation blockers unchanged: OD-05, OD-08, the V1 publication path, OD-01 for personal data only, M1 CCR authorisation, the link-consent CCR, D-71 physical planning before roadmap step 3, and OD-09 (operational, BLOCKED).

PREVIOUS_HANDOFF_ID: HANDOFF-20260911-ADR-REVIEW-BEFORE-APPROVAL
EXECUTED_INSTRUCTION_ID: OWNER-20260911-ADR-REVIEW-CORRECTIONS (no explicit id was supplied by the owner; this identifier is assigned by me for traceability and is recorded as assigned, not as received)

MODEL_ROUTING_NOTE: Routed to "Claude Opus 5 - MLINO Architecture ADR Editor", which is the model that executed it. Disclosure: the same model drafted and reviewed these ADRs.

HANDOFF_PRECONDITION_CHECK: Repository state was inspected before editing: in sync with origin at 47ae844, clean working tree, and the last change to mlino_book/adr/ was my own drafts commit 5f48ba4, so no other agent had edited the ADRs. The push was preceded by a check that origin/main was still 47ae844.

SCOPE_CONSTRAINT_NOTE: Only the three ADR files were edited, plus the new mlino_book/ADR_REVIEW_CORRECTION_REPORT.md and the AI_HANDOFF files. No architectural decision was changed and no new decision introduced; D-58 to D-71, the register, the changelog, the roadmap, the OD-40 document, contracts, the schema, code, migrations and APIs were not touched. The owner's own wording, including "Core database", was kept verbatim; clarifications were added next to it, not in place of it.

CARRIED_FORWARD_OPEN_REVIEW: HANDOFF-20260907-V1-DOCKER-LOCAL-RUN is still DELIVERED_AWAITING_INDEPENDENT_REVIEW; Mamad has not reviewed it and part B remains deliberately unexecuted. ADR-0007, ADR-0008 and ADR-0009 await the owner's review.

NOTE: ADR-0010 corrections. The data row now names D-31's five sources, with integration as one source and a transport mechanism, not the only origin, carrying data only (R1). Holder removal is added: only by a verified external document through the ownership-recovery path, and partner disputes only by external document (R8). ADMIN_ACTION is stated as a link basis value (D-25), never a grant basis (D-57). The context risk is the organization_id token claim (R9b). Automation is stated as a direction rule: close or restrict only, never grant, with no specific act declared automatic. One CCR is on the link; the D-58 grant bases are part of D-57's implementation (R9a). ADR-0011 corrections. A D-65 reading note is added for the linked OD-40 document (R4). Module storage is created separately from its first build and is not migrated from Core; M2 is code relocation only (R3). An explanatory sentence after the owner's "Core database" wording says the physical form (separate schema or separate database) stays with implementation planning; the rejected alternative no longer implies a mechanism. The namespace syntax is left to the M1 CCR, and "no migration" is limited to existing columns. ADR-0012 corrections. The two assistants are separated: the Customer Assistant carries no one's authority and this ADR does not require its login, while session and background-work constraints apply only to the Operator Assistant (R2). "V2 creates the experience" (R5). No session carries organisation context for any user or assistant, and the Operator Assistant's organisation context is per request (R6). The AC-2 recognised-role check stays until M1 (R7). "V2 only renders" is limited to orchestration. D-64 and D-67 boundaries and the D-53 clarification are unchanged. A mechanical check confirmed none of the flagged phrases remain and "Approved" appears only inside "Not Approved".
