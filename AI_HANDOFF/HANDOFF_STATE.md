HANDOFF_ID: HANDOFF-20260906-COMPOSITION-ROOT-DESIGN
AUTHOR: CLAUDE
PHASE: V1_COMPOSITION_ROOT_DESIGN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260906_COMPOSITION_ROOT_DESIGN_REPORT.md
REPORT_SHA256: 4e01b081cad3a2f9e2e77b0a1c31581f983b06b680d45e60f1cfdfe2acee19de
DELIVERABLE_PATH: C:\mlino code\V1_COMPOSITION_ROOT_DESIGN.md
DELIVERABLE_SHA256: 16b1c166c5f706d92b7f469bd36289afb2087e1758133ac1e459a8dd5ea586de
ZIP_PATH: (none built this pass)
DESIGN_COMMIT_SHA: b792359
CREATED_AT: 2026-09-06T02:10:00
NEXT_ACTION: WAIT — chain with no shortcut: Mamad reviews this design, then the product owner picks an entry-point option from section 1 and decides whether the Malino connector outranks the entry layer, and only then is any code authorized. Open gaps unchanged: R4 (BLOCKED), R5 (OPEN by design), R8-a and R8-b (OPEN).

PREVIOUS_HANDOFF_ID: HANDOFF-20260906-CCR-APPLY-AC2-ADAPTER
EXECUTED_INSTRUCTION_ID: CODEX-20260906-0056-CCR-ADAPTER-REVIEW
NOTE: Design-only pass, zero code. Produced V1_COMPOSITION_ROOT_DESIGN.md at the repository root following the existing V1_*.md convention rather than inventing a new folder structure. The pass began by verifying Mamad's review of the previous two stages: full approval, all five flagged cross-boundary decisions upheld. The decisive finding, from a direct code survey rather than assumption, is that the wiring problem is really two problems: the read side is genuinely wireable today (projection tables, OpportunityReadService, the real AC-2 adapter and resolveActorContext all exist; only an entry layer and JWT mapping are missing), while the detection side is not (all three value-engine repositories have in-memory implementations only, with no real Malino connector, so a scheduler today would run detectors over empty arrays). Four entry-point options are laid out with tradeoffs and a recommendation of the combined approach, explicitly marked as engineering preference rather than a decision - no option was chosen. Determination recorded: no CCR or frozen-file change is required, this is pure composition, with the standing rule that if implementation proves otherwise the answer is a CCR and not a patch. One security point was made explicit: getOpportunityById returns null for both not-found and not-allowed by design, so the HTTP boundary must return an identical 404 for both rather than reintroducing the existence oracle. Six product questions are listed unanswered, including who issues JWTs at all (only issueTokenForTesting exists today) and whether the connector outranks the entry layer. Evidence of zero code: tsc clean, npm test still exactly 146/146, and zero drift on both frozen files against the post-CCR values.
