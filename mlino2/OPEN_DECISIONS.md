# MLINO V2 — Open Decisions

This register lists decisions that block implementation or require product/architecture approval. It complements the V2 HANDOFF reports and does not replace V1 contracts.

## Intent and context layer — Stage 3

The governing proposal is [INTENT_CONTEXT_DECISIONS.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DECISIONS.md).

The formal conceptual contract is [INTENT_CONTEXT_DATA_CONTRACT.md](HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md). It is a semantic contract only; it does not authorize a schema, API, storage model, or implementation.

1. Exact retention windows for session, day-bound, future, and saved intent.
2. Question cooldowns across map, assistant, detail, and AR surfaces, including cross-device behavior.
3. User-facing confidence, confirmation, correction, and rejection language.
4. Minimum evidence and freshness required for a business capability to satisfy an intent.
5. Versioned read-only V1↔V2 projection: ownership, provenance, unknown values, expiry, deletion, and compatibility.
6. Consent, minimization, and retention rules for outcome learning and aggregate measurement.
7. Policy and labels for any future sponsored business experience.
8. Jurisdiction-specific treatment of location, movement, accessibility, and sensitive data.
9. Offline and permission-denied behavior for context capture and matching.

## Intent data contract review — new unresolved questions

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

No item above is approved for implementation by being listed here. Each item needs an owner, decision record, and compatibility review where it touches V1. Stage 3 implementation remains blocked until the contract review closes the relevant items.
