# MLINO V2 — Open Decisions

This register lists decisions that block implementation or require product/architecture approval. It complements the V2 HANDOFF reports and does not replace V1 contracts.

## Current technical-design review — 2026-09-10

The product owner's current request confirms Architecture Closure and Implementation Plan approval. [V2_TECHNICAL_ARCHITECTURE_DESIGN.md](HANDOFF/20260910_V2_REVIEW/V2_TECHNICAL_ARCHITECTURE_DESIGN.md) is the technical-design reference. Earlier blocked/pending closure entries below are historical, not reopened architecture decisions.

Technical choices awaiting review: feature-scoped session controller/reducer; directly bound local interpreter; eligibility/ranking policy consuming Directory rather than the legacy scorer; task-only details navigation without persistent viewed history; injected adapters for lifecycle/privacy tests. These do not introduce new domain entities, schemas or APIs.

The separate instruction to implement remains outstanding. Runtime validation and delivery evidence remain future work. Live V1 evidence/availability/applicability contracts, production scale, modules, AR, Virtual Storefront and persistent memory remain separate future gates, not hidden prerequisites for the approved mock slice.

## V2 Local Discovery implementation plan

[V2_IMPLEMENTATION_PLAN.md](HANDOFF/20260910_V2_REVIEW/V2_IMPLEMENTATION_PLAN.md) is the current planning reference after the Architecture Gate A result. It defines phases, frontend/backend responsibilities, Mock/Real boundaries, required conceptual contracts, V1 dependency points, testing and completion criteria.

The plan does not create implementation authority. AR, Virtual Storefront, the full module marketplace and production integrations remain explicitly excluded.

## Historical V2 gate alignment — before closure acceptance

[V2_GATE_ALIGNMENT_UPDATE.md](HANDOFF/20260910_V2_REVIEW/V2_GATE_ALIGNMENT_UPDATE.md) applies pre-implementation review R1–R4 in the source documents and [readiness checklist](HANDOFF/20260910_V2_REVIEW/V2_IMPLEMENTATION_READINESS_CHECKLIST.md). **Documentation corrections applied; closure acceptance and separate implementation instruction pending.** No replacement A/B/C verdict or runtime approval is claimed.

| Canonical gate | Responsibility and evidence | Current status |
|---|---|---|
| CG-1 — Core / V1 / V2 responsibility boundary | Core owns shared Intent/Permission/Consent/Session/Orchestration/Routing mechanisms; user meaning, V1 business truth and governance remain authoritative. Ownership §§4–5; Orchestration §4. | Documentation aligned; acceptance pending. |
| CG-2 — Assistant permission, consent and memory boundary | Permission → Consent before interpretation; exact revision confirmation before Matching; correction/pause/resume and disposal; no transcript. Orchestration §§1–2; Memory §4.4. | Documentation aligned; acceptance pending. |
| CG-3 — Initial implementation scope | Local single-task/session, manual context, mock Directory, 0–3 businesses, one qualifying option per business and Open Business Details. Checklist §§2–5. | Scope preserved; no expansion authorized. |

Historical CG-1 maps to current CG-1 and CG-2 authority; historical CG-2 orchestration and historical CG-3 memory map to current CG-2. Current CG-3 scope does not retire a memory obligation. Original review identifiers and findings are preserved in the historical section below.

| Readiness item | Current disposition |
|---|---|
| IR-1 | R1–R4 documentation edits completed with scenario references in Alignment §6; closure acceptance remains open. |
| IR-2 | Separate product-owner instruction to implement remains open; this documentation request is not that instruction. |
| IR-3 | Experimental evidence only; no live stock/availability/freshness or product-discount assertion without evidence. |
| IR-4 | Runtime tests, privacy inspection, desktop/mobile verification and delivery evidence are future checks after implementation. |

Business truth, Capability, Evidence, Availability, Recommendations, Actions and Learning remain V1-owned. V2 owns Matching/Experience/Interaction. Assistant is not a business logic owner and cannot create facts/capabilities or bypass permissions. Selected role/screen/provider content grants no access.

Current-session cleanup is defined, not an unresolved retention choice: current-only wording, no transcript even temporarily, disposal at terminal controls or existing 30-minute/two-hour/session-ending limits. Future persistent-memory/audit/provider/AR rules remain separate and unavailable in this slice. Permission/Consent separation adds no new entity or permission service.

## Historical readiness register — before alignment

The following IR/CG statuses record the earlier review baseline. The current register above and alignment crosswalk govern subsequent work.

### Historical V2 Local Discovery implementation readiness

[V2_IMPLEMENTATION_READINESS_CHECKLIST.md](HANDOFF/20260910_V2_REVIEW/V2_IMPLEMENTATION_READINESS_CHECKLIST.md) required components, V1 dependencies, mock/real boundaries, exclusions and validation evidence for the bounded first implementation. **Implementation remains blocked.**

| ID | Decision or gate | Status |
|---|---|---|
| IR-1 | Close and accept CG-1–CG-3 using the governing Intent, Orchestration and memory rules. | Open — required before coding. |
| IR-2 | Product owner accepts the closed entry gate and issues a separate, explicit implementation instruction. | Open — required before coding. |
| IR-3 | Treat the existing Directory data as experimental evidence only: no claim of live availability, stock, freshness, offer-to-product applicability or production provenance. | Adopted for the mock slice. |
| IR-4 | After any future implementation, provide conformance, privacy/session, matching, product, desktop/mobile and delivery evidence against the exact commit. | Future delivery gate. |

Live V1 projection, provider permission/handoff, production availability and offer applicability, persistent memory, cross-session inference, modules, AR/Virtual Storefront, telemetry and business outcome measurement remain future decisions. They are not hidden dependencies of the approved mock slice and cannot enter it without a separate gate.

### Historical V2 architecture closure gate

[V2_ARCHITECTURE_CLOSURE_REVIEW.md](HANDOFF/20260910_V2_REVIEW/V2_ARCHITECTURE_CLOSURE_REVIEW.md) records **B) Ready with minor changes** at baseline `0495d4ab253020a7a71dfc851c5ec244774cffb2`. Scope: local single-task/session Intent-Guided Local Discovery over experimental data, manual context, 0–3 businesses and Open Business Details.

The current product-owner instruction explicitly approves Intent Context, Experience Matching, Core-owned Assistant and session-only memory. Earlier proposal/pending labels below remain historical evidence; they do not reopen those choices. Core stewardship never changes the user's ownership of Intent meaning or V1 Governance's authority.

| ID | Pre-coding closure required | Status and owner |
|---|---|---|
| CG-1 | Qualify V1 Business OS versus shared V2 Core responsibilities; Assistant consumes/enforces authority; selected role/screen does not grant access; no privileged module or V1 write operation in this slice. | Open — V2 architect; preserve frozen V1 ownership. |
| CG-2 | Align Orchestration entry, clarification, correction, current-revision confirmation, late-result invalidation, pause/resume, no-match recovery and user-reported completion with the approved Intent contract. | Open — V2 product/architecture owner. |
| CG-3 | Make Intent Redesign §6.2 and Finalization §2.4 govern Assistant memory: current-only content, superseded/rejected wording discarded, existing session caps, no persistent transcript/log/audit exception. | Open — V2 architect. |

These three items require documentation alignment and closure review before a separate implementation instruction. They introduce no new entity, schema, API, retention duration or ownership model.

Future blockers are tracked separately: provider capability/permission/handoff contracts; live V1 projection and any new data direction; persistent preferences/history; AR spatial/assets/permissions and storefront actions; production evaluation and telemetry. Their absence does not expand or silently block the deliberately limited discovery scope. Specific closure scenarios and evidence are in report §6.

## Current Intent contract status

The current governing reference is [INTENT_CONTEXT_CONTRACT_REDESIGN.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md). The [final gate review](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_FINAL_GATE_REVIEW.md) returned **B — Approved with minor changes**. [INTENT_CONTEXT_FINALIZATION.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_FINALIZATION.md) closes the session-resume rule, document alignment, and bounded product-scope adoption required by that gate.

No unresolved conceptual decision blocks further **Experience Matching design** for the approved local, single-session, experimental-data scope. This status does not authorize implementation, schema, API, live V1 integration, or production deployment.

## Knowledge Loop terminology alignment — OD-30

[KNOWLEDGE_LOOP_ALIGNMENT.md](HANDOFF/20260910_V2_REVIEW/KNOWLEDGE_LOOP_ALIGNMENT.md) resolves OD-30. **Reality**, **Knowledge**, and **Learning** are conceptual layers/processes over the existing architecture, not new domain entities.

| Concept | Adopted meaning | Existing architectural home |
|---|---|---|
| Reality | The operational world outside MLINO, reported through observations and events. | External/business/user reality; V1 Event inputs preserve evidence and history. |
| Knowledge | Governed, traceable understanding and derived state with provenance, validity, and explicit unknowns. | Memory & Knowledge Event Log/Projections, Business Context, facts, capabilities and approved V1 projection. |
| Learning | A governed process that evaluates valid outcomes/feedback and improves future derived behaviour. | V1 Learning & Feedback boundary; current V2 scope remains consented, task-scoped and non-persistent. |

OD-30 therefore requires no new entity, schema, API, migration, storage layer, or parallel knowledge store. Future decisions for outcome/evaluation vocabulary, consent and retention, aggregate learning, model effects, telemetry, and any reverse V2→V1 direction remain open. This alignment does not authorize implementation or change frozen V1/Backend contracts.

## Historical Experience Orchestration proposal — prior to approved direction and alignment

[EXPERIENCE_ORCHESTRATION_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_ORCHESTRATION_DESIGN.md) defines the next V2 design layer without authorizing implementation. It preserves the confirmed Intent → Context → Capability → Evidence → Eligibility → Ranking → Experience boundary and proposes a bounded lifecycle, Assistant posture, Core/Module split, and future AR/Virtual Storefront dependencies.

| Area | Current decision or proposal | Status |
|---|---|---|
| Experience lifecycle | Discovering, Asking, Matching, Presenting, Comparing, Acting, Completed, Abandoned, Expired; initial slice excludes Comparing until separately approved. | Product review required. |
| Assistant | Recommended Option A: Core-owned cross-module orchestration with module-scoped capability providers; no hidden inference, business ranking, autonomous action, or ownership of module truth. | Ownership decision documented; product approval required. |
| Core vs Modules | Core owns shared Intent, privacy, lifecycle, evidence, explanation, and handoff policy; Modules own domain data, capability, rules, and actions. | Product/architecture review required. |
| AR / Virtual Storefront | Future modes requiring authoritative projection, option-level applicability, spatial/privacy governance, interaction contracts, and evaluation. | Deferred; dependencies open. |

Implementation, schema, API, AR activation, module integration, persistent memory, telemetry, and payment policy remain blocked until these decisions are reviewed and approved.

## Historical Assistant memory proposal — prior to approved direction and alignment

[ASSISTANT_MEMORY_BOUNDARY_DECISION.md](HANDOFF/20260910_V2_REVIEW/ASSISTANT_MEMORY_BOUNDARY_DECISION.md) recommends **Option A — session-only memory** for the current local, single-session V2 scope.

| Option | Disposition | Boundary |
|---|---|---|
| Session-only memory | Recommended for current scope. | Minimal confirmed Intent, permitted context, answers, corrections, Experience state, selected option, and authorized handoff context until task/session expiry. |
| User preference memory | Future only. | Requires explicit save action, separate consent, visible purpose/expiry/edit/delete, and protection against overriding new Intent or hard constraints. |
| Business context memory | Not Assistant-owned. | V1/business source owns Business Context, Knowledge, capability, products, offers, availability, provenance, and freshness; Assistant consumes approved projection. |
| Full historical conversation | Out of scope. | No indefinite transcript, cross-session personalization, training use, or module-wide history without a new privacy/product decision. |

This decision does not authorize persistence, schema, API, telemetry, cross-session behavior, external model processing, or AR spatial history. Cleanup, audit retention, module handoff minimization, saved preferences, and transcript policy remain future decisions.

## Experience Matching finalization — current status

[EXPERIENCE_MATCHING_FINALIZATION.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINALIZATION.md) closes EM-G1–EM-G4 in the bounded design and amends [EXPERIENCE_MATCHING_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_DESIGN.md). [EXPERIENCE_MATCHING_CLOSURE.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_CLOSURE.md) is the current documentation-level closure record. The conditional Gate remains historical evidence.

| ID | Adopted bounded decision | Closure status |
|---|---|---|
| EM-G1 | Context acts only as a confirmed hard condition, explicit user-ordered optional preference, display-only context, or the approved distance fallback. It has no independent ranking tier and cannot be counted twice. | Closed in design; closure review pending. |
| EM-G2 | In the initial scope, an explicit user request for an offer/discount/promotion is an eligibility requirement; incidental offers only enhance an already relevant Experience. No offer creates relevance, overrides constraints, changes ranking, or triggers advertising. | Closed in design; closure review pending. |
| EM-G3 | Active-use authority is required for generation/display/action. Paused may resume only through explicit valid user action; Rejected, Expired and Ended authority cannot resume. | Closed in design; closure review pending. |
| EM-G4 | First scope is Intent-Guided Local Discovery: zero to three business-level results, one slot per business, Open business details as the matching-owned action, and incidental evidenced business-level offer awareness. | Closed in design; closure review pending. |

No semantic choice from the four Gate conditions remains open for the bounded authoring scope. The single-business/single-qualifying-option rule and the three acceptance examples are recorded in [EXPERIENCE_MATCHING_CLOSURE.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_CLOSURE.md). Closure verification and a separate product-owner implementation instruction remain process gates. They do not authorize code, schema, API, live V1, new AR, telemetry or production.

## Experience Matching architecture gate — historical conditional status

This section preserves the Gate state at commit `e84a83846bdc548edaa710b988332cddb2caffc8`. Its EM-G1–EM-G4 closure status is superseded by the current Finalization section above; the Gate findings and review history remain valid.

[EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md) records **B — Approved with minor changes**, reviewing all three governing/design documents at `993780fe11087cc2194f798030ae9db674437957`. This is Codex self-review, not external approval or runtime validation.

Core ownership, eligibility-before-ranking, V1/V2 separation, explanation and non-advertising principles are accepted. Exactly four pre-coding closure items remain:

| ID | Required closure | Owner/responsibility |
|---|---|---|
| EM-G1 | Align ordering with the Intent contract; remove independent context-fit priority, preserve user ordering, and define comparable/unknown optional evidence behavior. | V2 design author; product/architecture review accepts closure. |
| EM-G2 | Preserve optional versus mandatory offer/price meaning; distinguish offer-claim validity from underlying discovery eligibility. | V2 design author; product review accepts worked examples. |
| EM-G3 | Enforce Active-use authority at generation/display/action; distinguish Paused recovery from terminal stop/withdrawal/expiry. | V2 architecture review verifies consistency with Finalization. |
| EM-G4 | Adopt the bounded mode/action, evidence matrix, claim limits, candidate granularity, explanation minimum and conformance examples. | Product owner selects scope; V2 architecture review verifies evidence limits. |

Original proposal questions 1 and 5 have their conceptual principles accepted, subject to these closures; question 4 must align with the already finalized Intent ordering; questions 2 and 3 remain product/evidence choices under EM-G4. Original question 6 (perform the gate) is completed by this report, but its conditions remain open.

The next step is documentation-only closure, then closure verification and a separate implementation instruction. No approval of paid matching, telemetry, live V1 or schema/API work follows from this result. Prior Intent Finalization remains closed.

## Experience Matching design — historical pre-gate proposal

The earlier proposal was [EXPERIENCE_MATCHING_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_DESIGN.md). It defined an Experience as a transient, explainable opportunity tied to one confirmed Intent revision and evidence-backed Business Capability. Eligibility was decided before relevance ordering; business payment, proximity, engagement, or an offer could not repair failed eligibility. The same file now incorporates the Finalization decisions.

The following decisions were open before the Gate and are preserved for traceability:

1. Adopt or revise the eligibility-before-ordering model, four relevance outcomes, explanation boundary, and business-influence limits.
2. Choose the first delivery mode: Discovery with relevant offer awareness only, or a separately bounded Guided Shopping step.
3. Approve the exact mock evidence matrix and list every unsupported claim in the experimental directory.
4. Approve user-ordered optional preferences and the proposed distance/stable-identity fallback when the user gives no preference order.
5. Approve the minimum explanation: relevance reason, source/test-data label, unknowns, unmet optional preferences, validity limit, and supported next action.
6. Complete an architecture gate against the finalized Intent Contract and protected V1/V2 boundary.

This proposal does not authorize a scoring algorithm, schema, API, code change, live V1 connection, persistent measurement, or sponsored ranking.

## Future expansion decisions — still open

1. Versioned read-only V1→V2 projection for capability, knowledge, offers, availability, provenance, freshness, withdrawal, unknowns, tenant boundaries, and compatibility.
2. Production privacy, legal, consent, deletion, backup, audit, and retention policy by jurisdiction.
3. Durable, future, archived, concurrent, cross-tab, cross-session, or cross-device Intent ownership and conflict behavior.
4. GPS, movement, passive context, accessibility context, precision, freshness, permission-denied, and offline behavior.
5. External AI/model recipients, minimization, provider retention, deletion, sensitive-domain limits, and failure behavior.
6. Outcome measurement, telemetry, aggregate learning, business messaging, and any V2→V1 or other outbound data direction.
7. Public sponsored-experience policy and evidence proving that business influence cannot override user relevance.
8. Production matching evaluation, capability evidence thresholds, model/version rollout, observability, and scale limits.

Each item above needs a separate owner, decision record, and architecture/privacy review before it enters scope.

## Historical register before redesign — preserved

The following entries record questions raised by the earlier design and review. They are retained for traceability. For the bounded local/session-only slice, conflicting assumptions about Strength, version-specific confirmation, confirmation versus consent, intent/offer/experience lifecycles, automatic archival, and outcome data direction are superseded by the governing Redesign and Finalization documents.

The earlier governing proposal was [INTENT_CONTEXT_DECISIONS.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DECISIONS.md).

The earlier formal conceptual contract was [INTENT_CONTEXT_DATA_CONTRACT.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md). It remains historical evidence and never authorized a schema, API, storage model, or implementation.

1. Exact retention windows for session, day-bound, future, and saved intent.
2. Question cooldowns across map, assistant, detail, and AR surfaces, including cross-device behavior.
3. User-facing confidence, confirmation, correction, and rejection language.
4. Minimum evidence and freshness required for a business capability to satisfy an intent.
5. Versioned read-only V1↔V2 projection: ownership, provenance, unknown values, expiry, deletion, and compatibility.
6. Consent, minimization, and retention rules for outcome learning and aggregate measurement.
7. Policy and labels for any future sponsored business experience.
8. Jurisdiction-specific treatment of location, movement, accessibility, and sensitive data.
9. Offline and permission-denied behavior for context capture and matching.

## Historical data-contract review questions — preserved

14. Exact language and interaction distinguishing confirmation for the current task from saving an Intent for later.
15. Which entry points may create an immediate Confirmed Intent without a second confirmation step.
16. Product definition of task completion for each journey, without treating navigation or detail view as proof.
17. Experience behavior when a confirmed Intent has no matching capability and broad browsing is the best result.
18. Exact retention windows for session, day-bound, future, saved, and archived Intent.
19. Jurisdiction-specific consent and deletion requirements for location, movement, accessibility, and outcome learning.
20. Aggregate measurement policy that does not expose Intent text or exact location.
21. Versioned read-only V1↔V2 projection for capability, business context, offers, knowledge, and recommendations.
22. Provenance, freshness, unknown-value, deletion, and compatibility evidence required for each capability input.
23. Boundary between Intent interpretation, matching, and experience selection so business intelligence is not duplicated in V2.
24. Offline, permission-denied, stale-offer, and unavailable-V1 behavior.
25. Evaluation evidence required before an Intent interpretation can influence discovery.

## Existing V2 product gaps

10. Data contract for storefront richness, inventory, reviews, social links, freshness, and availability.
11. Deep-link and durable business handoff behavior.
12. Business-user messaging responsibility, identity, tenant isolation, retention, and moderation.
13. Field validation plan for map tiles, GPS, floor selection, camera, and AR anchors.

Historical questions that the Redesign answered are not reopened by remaining in this register. Questions tied to excluded capabilities become active only if that capability is proposed for scope. No item in this file authorizes implementation; Stage 3 coding remains blocked until a separate implementation decision and compatibility review are completed.
