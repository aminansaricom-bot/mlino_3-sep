# MLINO V2 — Experience Matching Final Architecture Gate Review

**B) APPROVED WITH MINOR CHANGES**

Reviewer: Codex, Principal Product Architect role. This is a document-based self-review, not independent external approval, runtime verification, or production certification.

## 1. Executive Decision and Review Baseline

The core decision architecture is sound for a local, single-session, manual-context experience over experimental business data. User authority, business evidence, and V2 relevance have distinct owners. Eligibility cannot be compensated for by ranking, and the Experience has a useful purpose and evidence boundary.

It is **not ready to start coding unchanged**. Four bounded closure items, EM-G1–EM-G4 below, must be resolved in the design and recorded as accepted before the product owner issues an implementation instruction. They require precise semantic alignment and selection of the first supported slice, not a new architecture or a schema.

Reviewed together at commit `993780fe11087cc2194f798030ae9db674437957`, branch `astra/visual-system-local-experience`:

- [Intent Context Contract Redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md) — user authority, lifecycle, matching constraints and V1/V2 ownership.
- [Intent Context Finalization](INTENT_CONTEXT_FINALIZATION.md) — explicit resume, adoption and bounded scope.
- [Experience Matching Design](EXPERIENCE_MATCHING_DESIGN.md) — proposed Experience semantics and matching flow.

The governing Intent contract remains authoritative; this review does not amend any of these three documents. Supporting checks read the existing [directory contract](../../app/src/directory/contract.ts) and [architecture principles](../../01_ARCHITECTURE_PRINCIPLES.md). No implementation conformance is inferred from those reads.

The scope does not include production, live V1 integration, passive sensing, persistent memory, external inference, interaction transactions or telemetry. Missing those capabilities does not block the bounded slice. Adding them would require a separate gate.

## 2. Approved Principles and Findings

### 2.1 Intent → Experience boundary

**Accepted, with lifecycle clarification EM-G3.** Matching Design §§1.1–1.3 and 2.2 tie the Experience to an exact confirmed revision, valid processing permission and deliberate matching action. Redesign §§2.4 and 5 preserve user correction, rejection and version-specific confirmation. A parser hypothesis, signal strength, confidence, saved business, or business promotion cannot supply this authority.

A direct utterance is not permission to add a product subtype or hidden preference. Meaningful edits require a new confirmed revision. Context remains user-approved task context, not a profile of the person. The Finalization session rule prevents app visibility from becoming a new request.

### 2.2 Eligibility before ranking

**Accepted, subject to EM-G1 and EM-G2.** Matching Design §§2.2 and 3.2 require evidence for goal fit, hard constraints, exclusions and promised actions before ordering candidates. An unknown mandatory fact does not pass. Payment, popularity, promotion, distance or a high score cannot rescue a failed requirement.

The design explicitly rejects paid ordering as well as paid eligibility. That distinction matters: preserving hard constraints alone would still allow advertising among eligible businesses. Preference ordering must remain governed by the user's confirmed choices.

Two local wording conflicts remain: an additional context-fit ordering tier and promotion of an explicit but optional offer preference into eligibility. These affect which businesses appear and in what order; they must be corrected before implementation.

### 2.3 Business Capability and V1/V2 boundary

**Accepted.** Redesign §8 and Matching Design §2.1 agree that V1 owns business facts, capabilities, knowledge, offers and evidence; V2 consumes through Business Directory and owns customer relevance, experience selection and explanation. A V1 operational recommendation is not a V2 customer-ranking command.

Checking a source offer's time interval or applying a confirmed distance constraint in V2 is consumption of evidence for a user task, not duplication of V1 business intelligence. Creating stock, offer applicability, business truth, or merchant demand from guesses would cross that boundary.

The broader live V1 capability feed is not asserted to exist. Existing mock records support only limited simulated claims. The Experience term means a V2 user opportunity and must not become an alias for V1's internal business Opportunity/event.

### 2.4 Experience definition

**Accepted as a conceptual unit.** Matching Design §1 gives an Experience a purpose, relation to one Intent revision, capability evidence, explanation, validity and supported next action. It can be recommended, acted upon, or form a journey step without becoming the entire business profile or proof of a completed journey.

Its availability is independent of the user goal and the offer. Offer expiry invalidates an offer-dependent Experience, not the user's need. User withdrawal invalidates the user's Experiences without changing merchant data.

The proposed consideration/eligibility/presentation/unavailability terminology does not need a new database state machine for approval. Before coding, EM-G3 must make the authority transitions unambiguous, and EM-G4 must choose the permitted candidate granularity and next action. A discovery opportunity to inspect a listed product is supportable without claiming that product is in stock.

### 2.5 Economic model protection

**Accepted as a non-advertising boundary; no paid product is approved.** Matching Design §§3–4 prohibit payment, popularity, margin, capacity pressure and requested reach from defining relevance. Business value comes from an accurate capability meeting an actual need and a voluntary next step.

Simultaneous user and business value is a constrained objective: a capable business obtains an opportunity to serve a user who finds it useful. Merchant revenue, occupancy or a subscription cannot compensate for poorer user fit or remove user choice. This architecture does not guarantee conversions or measurable revenue.

Any future payment may fund tools that improve actual service or the accuracy of business information. Improvements affect matching only through ordinary, substantiated facts under the same rules for all businesses. Paid badges, preferential interpretation, earlier candidate retrieval, additional candidate slots or guaranteed exposure would be indirect paid ranking and must not be introduced as “opportunity quality.”

A useful counterfactual rule is: with identical permitted user inputs, business facts, evidence and validity, changing only subscription/payment/promotion/popularity must change neither eligibility, candidate inclusion, ordering nor timing. If a real capability or offer changes, its newly supported user value may matter within the confirmed request; payment itself still does not.

### 2.6 Privacy and business-value evidence

**Accepted within the finalized scope.** Matching Design §6 inherits local processing, separate consent, no hidden profiling, no private Intent/context disclosure to businesses and no V2→V1 writeback. User confirmation never authorizes data export. A request for a service or lower price does not establish a sensitive trait.

The business-value measurement ambition is not an analytics permission. A displayed result, click or route launch is not a verified visit, purchase or satisfaction signal. Current-session user feedback can inform that task within the Intent contract; persistent learning, merchant attribution and analytics remain excluded. Architectural acceptance does not prove economic effectiveness.

## 3. Architectural Risks

| Risk | Concrete failure | Required control |
|---|---|---|
| Silent preference change | An optional discount becomes mandatory, or selected context secretly changes ordering. | EM-G1/EM-G2; preserve exact confirmed meaning. |
| Paused or terminal task revival | A valid confirmation is reused while Paused, or expired/withdrawn authority is treated as retryable. | EM-G3; check active-use authority, not just confirmation. |
| Evidence overreach | Category, active listing or business-level offer is treated as proof of product availability or discount applicability. | EM-G4; trace each claim to actual evidence and keep unknowns explicit. |
| Legacy-path bypass | Existing parser, LLM, matcher, map or AR paths lack the new permission/revision boundary. | Later integration must demonstrate containment; this review makes no runtime claim. |
| Indirect paid exposure | Paid merchants get more candidates or earlier retrieval while formal ranking appears neutral. | Apply the economic counterfactual across retrieval, formation, ordering and timing. |
| Selection churn and duplicate exposure | Multiple products/offers/modes from one business dominate the result set or stale results replace newer ones. | Choose bounded candidate granularity in EM-G4; preserve revision/evidence authority. |
| Unproven value | Deterministic relevant listings are reported as acquisition, retention or sales improvement. | Distinguish simulated relevance evidence, user reports and future verified business outcomes. |

Production fairness, measurement, device behavior and scaling remain future concerns. They are not excuses to expand this review into an infrastructure or database project.

## 4. Required Changes Before Coding

### EM-G1 — Restore a single relevance ordering rule

**Evidence:** Matching Design §3.3 inserts “context fit” after user-ordered preferences and before distance. Redesign §7.3 specifies hard constraints → explicitly ordered optional preferences → distance → stable business identity. Selecting context alone does not define a separate preference priority.

**Required change:** remove the independent context-fit tier. A contextual requirement is either a confirmed hard constraint, an explicitly optional user-ordered preference, or the already approved distance fallback. Do not count the same property twice. Unordered optional preferences must not acquire an implicit order.

Specify handling of unknown/incomparable optional evidence without positive credit or invented comparisons; the documented fallback must give repeatable results. No numeric weighting system is needed.

**Closure example:** two eligible listings remain in the same order when only unprioritized context is available. If the user later makes a contextual preference explicit and ordered, a new confirmed revision may change that order.

### EM-G2 — Keep optional offers optional

**Evidence:** Matching Design §2.3 says an explicitly requested deal, price condition or current offer becomes eligibility. That includes wording such as “a discount would be nice,” which can be explicitly optional. Redesign §§7.1–7.2 require preserving the confirmed hard/soft distinction and make offers optional unless required.

**Required change:** eligibility must depend on whether the confirmed revision makes the offer/price condition mandatory, not merely whether it is explicit. A supported optional deal may affect ordering only at its user-assigned preference position. An incidental valid offer may be disclosed without an independent boost. A numeric price requirement does not inherently require a discount offer.

Separate the validity of an offer claim from the eligibility of the underlying listing: if an optional offer expires, suppress that claim and reassess the remaining supported Experience. If the goal requires that offer, the candidate no longer qualifies. Neither event ends the user's goal.

**Closure examples:** “discount optional” retains a qualifying business with no deal; “valid discount required” excludes it; an acceptable listed price can satisfy a price constraint without an offer; expired optional offers do not erase otherwise supported discovery.

### EM-G3 — Make lifecycle authority explicit at the Experience boundary

**Evidence:** Matching Design §§1.4/2.2 mention confirmed/valid authority, but §3.4 groups session and permission failures with “Temporarily unusable.” Finalization §2 distinguishes Paused from permanently ended/expired tasks and prohibits automatic resume. A programmer must not infer that every unusable result permits retry.

**Required change:** require current Active use authority before candidate generation, presentation and action. Confirmation alone is insufficient while Paused. Map:

- recoverable essential-context/evidence failure to suspension of the affected use and an explicit permitted recovery path;
- hidden/background return to Paused until explicit Resume, with unchanged revision and all prerequisites checked;
- correction to invalidation of old revision use and fresh confirmation of changed meaning;
- rejection, stop, permission withdrawal, task/session expiry or reload to terminal invalidation/disposal as defined in the Intent contract, with no retry that revives the old task.

Rechecking and removing an expired claim must not be mistaken for permission to restart paused matching or generate a notification. Pending responses cannot display while paused or after their authority has ended. Clarify whether any pre-pause result may be reused after explicit resume and revalidation; it cannot retain independent authority.

**Closure examples:** a late match after stop is discarded; visible-again alone starts nothing; a still-valid explicit resume can continue the same confirmed revision; expiry while hidden requires a fresh task.

### EM-G4 — Declare the bounded delivery slice and its evidence obligations

**Evidence:** Matching Design §7.1 still leaves mode selection and the mock evidence matrix open. The existing directory contract contains listings and business-level offers but no general stock/opening-status capability or structured offer-to-product association. Names, descriptions, dates and synchronization timestamps cannot establish all promised claims.

**Required change:** record product adoption of the first mode and supported next action, then approve a small conceptual claim/evidence matrix using existing data. Recommended first slice: Discovery with incidental, evidenced offer awareness; Guided Shopping only if separately selected within the same asking budget. Direct interaction, rich storefront and new AR behavior remain excluded.

The matrix must cover:
- category/named listing versus fulfilment and stock;
- selected search area, distance, building/floor evidence and unknowns;
- price comparability, currency/units and unsupported comparisons;
- offer interval versus applicability to the exact requested item/service;
- supported, no-supported-match, unsupported and recoverably unusable outcomes;
- candidate granularity and stable duplicate/tie treatment without business-paid exposure;
- minimum explanation: confirmed purpose, supporting source/test-data label, reason, unknowns/unmet optional preferences, validity and supported action.

Business co-location of a product and offer is insufficient to connect them. Without explicit applicable evidence, do not claim the offer discounts that item. No new fields or contract modifications are authorized to fill these gaps.

**Closure evidence:** a small set of worked examples maps every permitted claim and outcome to the current experimental data, plus counterexamples for unsupported claims. Adopt the conformance checks below as future runtime requirements. Product choice must be recorded, not assumed from this review.

## 5. Disposition of Existing Open Decisions

This review addresses Matching Design §7.1 without erasing its historical proposal:

| Original question | Gate disposition |
|---|---|
| 1 — Adopt core model and protections | Architectural principles accepted; EM-G1–EM-G3 must align the operational meaning before coding. |
| 2 — First delivery mode | Product choice remains open under EM-G4. |
| 3 — Mock evidence matrix | Remains open under EM-G4. |
| 4 — Preference behavior | Governing Intent ordering already exists; align it through EM-G1 rather than invent another model. |
| 5 — Explanation minimum | Existing conceptual minimum accepted; bind it to supported modes/examples under EM-G4. |
| 6 — Architecture gate | Performed here; conditional result, not completed pre-coding closure. |

No prior Intent Finalization item is reopened. EM-G1–EM-G3 align the newer matching design to it.

## 6. Conformance Evidence Required After an Authorized Implementation

These are review scenarios, not executable tests or claims of passed validation:

| Scenario | Required result |
|---|---|
| Strong implicit signals, no confirmation | No personalized candidate generation or ranking. |
| Revision A confirmed, then corrected to B | A cannot present/action late results; B needs confirmation. |
| High-paying/popular merchant fails a hard constraint | Ineligible; no compensating score or promotional mode. |
| Only merchant payment status changes | No change in candidate inclusion, quantity privilege, order or timing. |
| Discount optional versus required | Different eligibility behavior exactly follows confirmed hard/soft meaning. |
| Price condition without a discount | Comparable listed price may satisfy it; no fabricated offer requirement. |
| Offer valid in time, item applicability unknown | No item-specific discount claim. |
| Stock/opening status unsupported | No positive availability promise or silently weakened requirement. |
| Optional offer expires | Remove dependent claim; retain only independently supported discovery where allowed. |
| Missing/incomparable optional evidence | No invented credit, comparison or unconfirmed priority. |
| Tab hidden then visible; task later expires | Explicit resume for valid task only; expiry never revives old authority. |
| Consent withdrawn or task stopped with pending result | No display/action/retry; disposal follows finalized rules. |
| No qualifying business | Honest no-match, with Intent preserved if still Active; only user revision changes requirements. |
| Detail viewed or route launched | No asserted purchase/visit; no private Intent export or analytics. |

Later validation must cover integration with existing paths, not only isolated matching comparisons. Historical Stage 2 test counts do not demonstrate this new behavior.

## 7. Delivery and Next Step

Only this report, [MLINO Book](../../MLINO_BOOK.md), [Roadmap](../../03_ROADMAP_PHASES.md) and [Open Decisions](../../OPEN_DECISIONS.md) are updated. The three reviewed sources, V1, Backend, implementation and integration contracts are unchanged.

Validation here consists of reading and comparing source documents and the existing directory vocabulary, then checking documentation scope and references. Graphify could not run, and its existing graph contained none of the three reviewed documents; it was not used as evidence for this verdict. No runtime tests were run or required for this documentation review.

Next: close EM-G1–EM-G4 in a documentation-only revision, verify their closure, and obtain the owner's bounded implementation instruction. Do not start coding from this conditional verdict. Do not claim external reviewer approval or production readiness.

من کدکس هستم
