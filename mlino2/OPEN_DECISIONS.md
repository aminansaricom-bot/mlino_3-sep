# MLINO V2 — Open Decisions

This register lists decisions that block implementation or require product/architecture approval. It complements the V2 HANDOFF reports and does not replace V1 contracts.

## Current Intent contract status

The current governing reference is [INTENT_CONTEXT_CONTRACT_REDESIGN.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md). The [final gate review](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_FINAL_GATE_REVIEW.md) returned **B — Approved with minor changes**. [INTENT_CONTEXT_FINALIZATION.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_FINALIZATION.md) closes the session-resume rule, document alignment, and bounded product-scope adoption required by that gate.

No unresolved conceptual decision blocks further **Experience Matching design** for the approved local, single-session, experimental-data scope. This status does not authorize implementation, schema, API, live V1 integration, or production deployment.

## Experience Matching design — pending review

The current proposal is [EXPERIENCE_MATCHING_DESIGN.md](HANDOFF/20260910_V2_REVIEW/EXPERIENCE_MATCHING_DESIGN.md). It defines an Experience as a transient, explainable opportunity tied to one confirmed Intent revision and evidence-backed Business Capability. Eligibility is decided before relevance ordering; business payment, proximity, engagement, or an offer cannot repair failed eligibility.

The following decisions remain open before any bounded implementation instruction:

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
