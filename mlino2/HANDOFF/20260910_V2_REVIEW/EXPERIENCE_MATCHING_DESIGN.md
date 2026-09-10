# MLINO V2 — Experience Matching Design

Author: Codex, Product Architect role.

Status: **finalized for the bounded design scope; closure review pending**. This document builds on the finalized [Intent Context Contract Redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md) and [Intent Finalization](INTENT_CONTEXT_FINALIZATION.md). The four conditions from [the B architecture gate](EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md) are resolved in this document and [Experience Matching Finalization](EXPERIENCE_MATCHING_FINALIZATION.md). This status does not authorize code, schema, API, migration, production matching, live V1 integration, advertising, or data collection.

Approved working boundary: local processing, one foreground Intent task in one tab/session, manual context, and experimental/mock business data. The user's exact confirmed Intent revision remains the authority for matching.

## Design Flow

> Confirmed Intent revision
>
> + permitted current-task context
>
> + read-only Business Capability and Evidence
>
> ↓
>
> eligibility evaluation
>
> ↓
>
> Experience Candidate
>
> ↓
>
> relevance ordering
>
> ↓
>
> explainable User Experience
>
> ↓
>
> user-chosen next action

An Experience Candidate cannot exist for personalized use before the Intent revision is confirmed. Matching never turns context, confidence, proximity, an offer, business payment, or business demand into user Intent.

## 1. Experience Entity

### 1.1 Definition

An **Experience** is a bounded, explainable opportunity through which a user can make progress toward a current confirmed goal using a business capability that is supported by current evidence.

It joins four independent authorities without merging them:

- the user's confirmed Intent revision defines the desired outcome, constraints, preferences, task window, and permitted next action;
- permitted context defines where and when the request applies without claiming facts about the person;
- V1/business evidence defines what the business can actually provide and under which conditions;
- V2 decides whether the combination is relevant, which supported experience form fits, and how to explain it.

An Experience is broader than a recommendation card and narrower than an open-ended customer journey. It may contain a recommended business and a supported next action, or become one step in a longer guided journey. The atomic matching unit is still one evidence-backed opportunity tied to one confirmed Intent revision. Several opportunities may form a result set; they do not become a feed independent of the user's goal.

### 1.2 Boundaries

An Experience is not:

- an advertisement or a paid placement;
- a business profile shown without a user-relevance reason;
- a confidence score, prediction, or claim about the user;
- the Business Capability itself;
- proof that the user visited, bought, completed, or benefited;
- a durable user preference or cross-session memory;
- permission for a business to contact the user.

A recommendation is one possible presentation of an Experience. An action is a user-controlled step the Experience may support. An interaction is possible only when the user initiates it and its separate data/identity rules exist. A journey is an ordered series of user-authorized Experiences; the current bounded slice does not create persistent journeys.

### 1.3 Conceptual obligations

Every Experience Candidate must be able to answer:

1. Which exact confirmed Intent revision does it serve?
2. Which Business Capability satisfies the goal?
3. Which evidence supports every material claim and hard constraint?
4. Which permitted context makes it relevant now?
5. What remains unknown or unsupported?
6. What user-controlled next action is genuinely available?
7. When must the candidate be invalidated or rechecked?

These are semantic obligations, not proposed data fields.

### 1.4 Independent availability

An Experience Candidate is transient. It may be considered, become eligible, be selected for presentation, become unavailable, or be discarded. These conditions do not alter the User Intent lifecycle or Business Offer lifecycle. An expired explicitly requested offer can remove one candidate while the Intent remains Active. An expired incidental offer removes only the dependent enhancement when the underlying discovery remains independently supported. A stopped or expired Intent invalidates its candidates without changing business facts.

Candidate generation, presentation, and action require current **Active-use authority**, not confirmation alone. Before presentation and again before an action, V2 must verify the current revision, confirmation, processing permission, task/session state, relevant context, and business evidence. A stale candidate has no authority merely because it was once valid.

### 1.5 Session-state authority at the Experience boundary

| State | Meaning for Experience Matching | User action and transition |
|---|---|---|
| Active | The exact revision is confirmed, matching was deliberately requested, processing is allowed, and task/context/session prerequisites are valid. | Matching may generate, present, and recheck candidates. A correction, pause, rejection, stop, withdrawal, or expiry leaves this authority. |
| Paused | The task remains inside its session limit, but matching authority is suspended because the app/tab was hidden, the user paused/started editing, or a recoverable essential prerequisite is unavailable. | Visibility alone does nothing. Explicit Resume may restore the unchanged confirmed revision only after permission, deadline, context, and evidence checks. A material edit creates a new revision and requires confirmation. |
| Rejected interpretation | The user rejected the displayed hypothesis/revision. That revision is terminal and authorizes no candidate. Rejection is not a claim that MLINO knows the user's “real” intent. | Resume is unavailable. Only a new explicit user request can create another hypothesis/attempt. |
| Expired Intent task | The confirmed deadline, inactivity limit, or absolute session limit was reached. The old authority and task content are disposed under the Intent contract. | Resume and retry cannot revive it. A fresh task needs applicable processing permission, a new interpretation, and confirmation. |

Explicit stop, delete, processing-permission withdrawal, navigation/reload, or replacement by a different goal follows the terminal Ended rules in the Intent contract. A pre-pause candidate has no independent authority: after an explicit valid resume it may be used only after a fresh authority and evidence recheck. Pending results cannot display while Paused or after Rejected, Expired, or Ended state.

## 2. Business Capability Matching

### 2.1 Responsibility boundary

| Participant | Owns | Must not do |
|---|---|---|
| V1 / authoritative business side | Business identity, capability, products/services, knowledge, offer conditions, authoritative availability when available, provenance, validity, and revocation. | Decide a user's Intent, purchase relevance, customer presentation, or V2 interaction. |
| Business Directory boundary | Provide the approved read-only V1→V2 projection or the clearly labelled mock equivalent. Preserve source meaning, unknowns, and freshness. | Invent capability, convert missing values into positive facts, expose V1 internals, or carry Intent/user data back to V1. |
| V2 Experience Matching | Apply the confirmed Intent and permitted context, enforce eligibility, order eligible candidates, select an experience mode, explain relevance and unknowns, and recheck authority. | Duplicate V1 operational/business intelligence, change business facts, infer user needs from business demand, or write Intent/outcome data to V1. |
| User | Own the goal, constraints, preference order, corrections, confirmation, chosen action, and task ending. | — |
| Business | Maintain accurate capability, product/service, availability, offer, and evidence through its governed V1 path. | Target a person, require exposure, buy eligibility, override user constraints, or receive hidden Intent/context. |

V1 Knowledge may substantiate a capability only through the governed evidence projection. A V1 recommendation intended to help the business operate is not a command to rank that business for a user and cannot cross the boundary as an opaque relevance boost.

### 2.2 Matching sequence

1. **Authority gate:** require current Active-use authority: the exact confirmed Intent revision, valid processing permission and session/context prerequisites, plus a deliberate matching request. Confirmation alone is insufficient while Paused or after a terminal state.
2. **Need decomposition:** use only the goal, hard constraints/exclusions, optional user-ordered preferences, permitted context, and requested next action visible in that revision.
3. **Capability retrieval:** read candidate Business Capabilities and evidence through the Directory boundary. In the approved slice, this is labelled experimental/mock data.
4. **Evidence normalization:** distinguish supported, unsupported, unknown, stale, not-yet-valid, expired, and revoked claims without manufacturing certainty.
5. **Eligibility:** reject any candidate that fails a hard constraint, violates an exclusion, lacks evidence required for a positive mandatory claim, falls outside the confirmed area/task window, or cannot support the promised next action.
6. **Experience formation:** bind an eligible capability to the current Intent purpose, applicable context, evidence limits, and a supported experience mode.
7. **Relevance ordering:** compare eligible candidates using the model in §3. Eligibility cannot be bought or recovered through a high score.
8. **Presentation boundary:** disclose why the candidate is relevant, what evidence supports it, what remains unknown, and what action the user may choose.
9. **Action-time recheck:** invalidate stale authority, context, offer, availability, or capability evidence before the next action.

### 2.3 Capability and offer rules

A capability is evidence-backed ability to provide a product, service, or supported interaction. A category label or business description may support limited directory discovery; it does not prove inventory, opening status, fulfilment, quality, or availability.

Offers are conditional facts attached to an otherwise relevant capability. An offer may improve the usefulness of an eligible Experience when it is valid and relevant to the confirmed goal. It cannot:

- make an irrelevant capability eligible;
- replace capability or availability evidence;
- override a hard constraint or exclusion;
- move a business ahead because it paid or requested reach;
- trigger matching, notification, or an Experience without user authority.

The controlling order is:

> User requirement → Eligibility → Relevant Experience → Optional offer enhancement

For the initial Intent-Guided Local Discovery scope, the confirmed meaning governs offer treatment:

- An **explicit user request** for an offer, discount, or promotion is a user requirement. It participates in eligibility and must have evidence that satisfies the exact requirement; it does not create capability relevance by itself.
- An **incidental offer** may be attached after relevance is established. It is an enhancement only: it cannot create relevance, change eligibility, change ordering, trigger matching, or create a notification.
- An offer preference that is not an explicit requirement has no ranking effect in this first scope. A future product decision may define that behavior separately; it is not active here.

Showing an offer requires a traceable business/offer identity, a current source record, satisfied `valid_from`/`valid_until`, non-revoked status where the source supports it, all stated conditions, and evidence that its scope applies to the capability/product/service being claimed. The current mock directory links offers to a business, not to a specific product or service. It may therefore show a time-valid **business-level offer** with that scope made explicit, but it cannot claim that the offer discounts the user's matched item. Product-specific offer requirements are unsupported without product-applicability evidence.

If an incidental offer expires, V2 removes the enhancement and rechecks the independently supported discovery Experience. If an explicitly requested offer/discount/promotion expires or lacks applicable evidence, that candidate is ineligible. An acceptable listed price may satisfy a price requirement without an offer when the item, amount, currency, and comparison basis are supported.

## 3. Relevance Model

### 3.1 Value definition

An Experience is valuable when it helps the user make credible progress toward the confirmed goal with appropriate effort and timing, while creating a real opportunity for a capable business to serve that need.

Value requires all of the following:

- **goal fit:** the supported capability addresses the requested outcome;
- **constraint integrity:** every mandatory requirement and exclusion is respected;
- **context applicability:** the experience fits the chosen area, time purpose, and other permitted current-task context;
- **evidence integrity:** material claims are supported, current enough for their use, and not revoked;
- **actionability:** the promised next step is supported and under user control;
- **transparency:** uncertainty, unsupported preferences, and validity limits are visible.

Popularity, engagement likelihood, business payment, margin, or a desire to fill business capacity are not user-value substitutes.

Intent answers **what the user wants**. Context supplies the confirmed constraints and conditions under which that goal can be fulfilled, such as selected area, time window, radius, building, or floor. Context modifies Experience suitability only through that confirmed meaning. It does not create a separate goal, hidden preference, user profile, or independent ranking signal. A contextual condition is either a hard constraint, an explicitly ordered optional preference, or part of the approved distance fallback; it cannot be counted twice.

### 3.2 Eligibility before ordering

Eligibility is a truth-and-authority gate, not a numeric score.

| Factor | Role | Rule |
|---|---|---|
| Confirmed Intent and permission | Authority gate | Missing, withdrawn, expired, or stale authority means no personalized candidate. |
| Intent/capability fit | Eligibility | Evidence must support that the capability addresses the requested goal. |
| Hard constraints and exclusions | Eligibility | All must pass. Unknown cannot count as satisfied. Only the user may relax a constraint through a new revision. |
| Context conditions | Eligibility or explicit preference | Required area, time, floor, and task-window conditions must pass when material to the request. Optional context affects ordering only when the user explicitly made and ordered it as a preference. Manual context is not proof of physical presence. |
| Availability | Eligibility when promised or required | Authoritative positive evidence is required for a positive availability claim. Missing availability remains unknown. |
| Offer validity | Eligibility only when the offer is part of the request/experience | `valid_from`, `valid_until`, conditions, and source status must pass independently. |
| Supported next action | Eligibility for the promised experience mode | V2 cannot promise contact, purchase, booking, navigation, or fulfilment without an approved capability for it. |

A candidate failing eligibility may be explained as unsupported or no-match, but it cannot be presented as a close recommendation that quietly weakens the user's request.

### 3.3 Ordering eligible candidates

For the bounded experimental slice, ordering is lexicographic and explainable:

1. all candidates have already satisfied the goal and every hard constraint;
2. compare the user's explicitly ordered optional preferences, in that order, using only comparable supported evidence;
3. use nearest distance within the confirmed search area;
4. use stable business identity only as a deterministic tie-break.

Missing, stale, or incomparable optional evidence receives no positive credit and is disclosed. A comparison may be made only when the meaning, units, currency, scope, and evidence are comparable for the confirmed preference. If the user did not order optional preferences, V2 must not invent weights from context, behavior, business economics, popularity, or an opaque model. It uses distance plus the stable tie-break among eligible candidates. The same contextual fact cannot act first as a constraint and again as a ranking bonus.

Evidence freshness controls whether a claim can be used; it does not act as a promotional bonus. In the initial scope, an offer never outranks another eligible experience. If the user explicitly requests an offer/discount/promotion, that requirement is checked at eligibility and does not become a ranking boost.

### 3.4 Relevance outcomes

The evaluation must return one of four honest conceptual outcomes:

| Outcome | Meaning | Experience behavior |
|---|---|---|
| Supported match | At least one candidate satisfies all gates with sufficient evidence. | Present ordered Experiences with reasons, limits, and supported actions. |
| No supported match | Evidence was usable, but no capability met all hard requirements. | Preserve the Active Intent; offer user-controlled edit or separate broad discovery. |
| Unsupported requirement | The data vocabulary cannot evaluate a mandatory requirement. | Name the unsupported requirement; do not drop or guess it. |
| Recoverably unusable | The task/session and permission remain valid, but a recoverable essential context, directory, freshness, or evidence prerequisite is currently unavailable. | Suspend affected matching and provide an explicit retry/edit path. Terminal withdrawal, rejection, ending, or expiry is handled by §1.5 and is never labelled retryable. |

### 3.5 Explanation boundary

The user-facing reasoning must be derivable from the confirmed request and business evidence: “matches your requested service,” “inside your selected area,” or, where scope evidence exists, “this valid offer applies to the requested product.” In the bounded mock slice, the permitted offer wording is limited to a time-valid business-level offer because product applicability is absent. Reasoning must not cite hidden traits, inferred emotion, assumed purchasing power, or confidential business ranking logic.

The explanation states material unknowns and unmet optional preferences. It never claims that a click, detail view, route launch, or business display proves a visit, purchase, satisfaction, or completed goal.

## 4. Business Value

Businesses gain value when accurate capabilities meet a real, confirmed customer need. The model creates five legitimate value paths:

1. **qualified discovery:** the business appears because it can support the current goal, reducing irrelevant exposure;
2. **capability visibility:** specific products, services, evidence, and limitations become understandable at the moment they matter;
3. **useful offers:** a valid offer adds value to an already relevant experience or satisfies an explicit price/deal need;
4. **voluntary action:** the user may choose a supported next step such as viewing a storefront or, in a future governed layer, contacting the business;
5. **trust incentive:** accurate evidence, freshness, and honest unknowns improve continued eligibility and user confidence.

Business influence is limited to improving truthful inputs and fulfilment readiness. A business may describe and substantiate capabilities, products/services, offers, availability, and experience possibilities. It cannot submit “show this to nearby users,” choose a user segment, purchase rank, weaken constraints, see private Intent/context, or convert an unavailable capability into a match.

“Measurable business value” is a future evidence question, not permission for surveillance. The bounded slice can demonstrate qualified relevance and user-chosen actions during evaluation. Persistent conversion analytics, attribution, business dashboards, outcome learning, and data writeback remain outside scope until their purpose, consent, evidence, aggregation, retention, and V1/V2 direction are separately approved.

## 5. User Experience Modes

### 5.1 Initial bounded Experience — Intent-Guided Local Discovery

The first MLINO V2 Experience is **Intent-Guided Local Discovery**. It is selected because it gives the user a credible answer, gives a genuinely capable business qualified visibility, and tests the central Intent→Evidence→Experience architecture without adding AR, messaging, transactions, or persistence.

**Input:** the exact Active confirmed Intent revision; manual selected area/radius and any confirmed time/building/floor constraints; optional user-ordered preferences; and read-only experimental directory capability/evidence.

**Output:** zero to three ordered business-level Experiences. There is one candidate slot per business; multiple products or offers from the same business provide supporting detail and never create duplicate exposure. Each presented Experience includes the confirmed purpose it serves, the supported listed capability/product/service, why it qualifies, selected-area distance where available, the experimental-data/source label, material unknowns and unmet optional preferences, applicable validity, and the supported next action **Open business details**.

Opening details is a voluntary user/business interaction boundary: it lets the user inspect the relevant business information but does not share private Intent/context with the business and is not proof of contact, visit, purchase, fulfilment, or satisfaction. Existing save/like/navigation behaviors are outside this matching decision and gain no outcome meaning from it.

Offer awareness is incidental in this slice. A verified time-valid business-level offer may be attached to an already relevant business with its scope stated; it neither creates a slot nor changes order. No product-specific discount is claimed without applicability evidence. Guided Shopping, direct business interaction, rich Virtual Storefront composition, and new AR behavior are excluded from the initial Experience.

The bounded slice must support all four honest outcomes: supported match, no supported match, unsupported mandatory requirement, and recoverably unusable context/data. It never pads the result set with ineligible businesses.

### 5.2 Mode catalogue and scope

The matching layer selects a conceptual mode only after eligibility. Mode selection changes how the opportunity helps; it does not change facts or ranking authority.

| Mode | Product purpose | Entry requirement | Current design status |
|---|---|---|---|
| Discovery | Show a small set of explainable businesses/capabilities relevant to the confirmed need. | Supported goal/capability match and usable context. | Selected core mode for the bounded slice. |
| Guided shopping | Help the user compare or narrow eligible choices through explicit, minimal decisions. | Multiple viable options or one material ambiguity; questions remain inside the approved asking limit. | Future design; excluded from the initial Experience. |
| Offer awareness | Make a valid incidental offer visible when it serves an already relevant capability. An explicit deal/price request is handled as eligibility. | Eligible capability plus independently valid offer evidence, or the separate evidence required by an explicit offer requirement. | Enhancement only in the initial Experience; never a standalone ad trigger or ranking input. |
| Direct business interaction | Let the user deliberately initiate contact, booking, reservation, or another supported exchange. | Verified interaction capability plus identity, consent, tenant, moderation, retention, and failure rules. | Future gated capability; unavailable in the bounded slice. |
| Virtual Storefront | Let the user explore a business's relevant products, services, offers, availability, and supported actions around the current goal. | Governed storefront data and evidence projection; user remains in control of navigation/actions. | Future product layer; matching may supply entry context but does not design it here. |
| Visual/AR discovery | Present an already eligible Experience through a spatial or visual surface. | Current evidence plus device/permission/location/anchor validity and field-tested presentation rules. | Presentation adapter only; no new AR/GPS authority is approved here. |

The same business may support more than one mode, but V2 chooses the mode that best advances the confirmed task with the least required interaction. It cannot select a more promotional mode because the business prefers it.

## 6. Privacy Boundaries

Experience generation inherits every Intent privacy and retention rule and adds the following matching boundaries:

- Only the exact confirmed revision and explicitly permitted current-task context may influence personalized eligibility or ordering.
- Intent text, confirmation, precise context, preference order, and candidate reasoning remain on the V2 user side. They are not sent to businesses or written to V1.
- The Directory projection is read-only V1→V2. User consent cannot silently create a reverse data path.
- Saved businesses, earlier searches, clicks, dwell time, detail views, map movement, app resume, or prior sessions are not hidden preference signals in this slice.
- Sensitive personal characteristics, diagnoses, emotional state, financial status, protected traits, or inferred vulnerability cannot be matching dimensions. An explicit service request may be matched generically without turning it into a personal diagnosis/profile.
- Manual destination defines a search context, not the user's physical presence. Passive GPS, movement, background sensing, and cross-session behavioral inference remain unavailable.
- Businesses receive no user identity or private context merely because their Experience is shown. Any future contact is user-initiated and requires a separate interaction contract.
- Explanations reveal only the minimum context needed to justify relevance. They must not expose raw Intent content to business-facing surfaces or analytics.
- No external model, persistent profile, telemetry, conversion attribution, or outcome learning is authorized by this design.

If privacy authority, current revision, or processing permission becomes invalid, matching stops and pending/stale candidates are discarded under the finalized session rules.

## 7. Finalization and Remaining Decisions

### 7.1 Bounded design decisions closed

The [B architecture gate](EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md) accepted the core model and raised EM-G1–EM-G4. [Experience Matching Finalization](EXPERIENCE_MATCHING_FINALIZATION.md) records these bounded answers:

1. Context has no independent ranking tier; it acts only through confirmed constraints, user-ordered preferences, or the distance fallback.
2. In the initial scope, an explicitly requested offer/discount/promotion is an eligibility requirement; an incidental offer is an enhancement only. No offer creates relevance, overrides constraints, changes ranking, or triggers advertising.
3. Active, Paused, Rejected, Expired, and Ended authority at the Experience boundary follows the finalized Intent lifecycle.
4. The first mode is Intent-Guided Local Discovery: zero to three business-level results, one slot per business, Open business details as the only matching-owned next action, and incidental business-level offer awareness.

These are design closures for review. They do not authorize implementation. Closure verification and a separate product-owner implementation instruction remain required process gates, not unresolved semantic choices.

### 7.2 Future expansion decisions

1. Versioned live V1→V2 projection for capability, products/services, knowledge, offers, availability, provenance, freshness, revocation, unknowns, tenant boundaries, and compatibility.
2. Authoritative semantics for inventory, opening hours, booking capacity, fulfilment, price comparability, service area, and interaction availability.
3. Production-scale ranking evaluation, fairness, diversity, tie behavior, observability, rollback, abuse protection, and proof that payment cannot influence eligibility or relevance.
4. Direct interaction identity, consent, messaging, moderation, retention, failure, and business-response responsibilities.
5. Virtual Storefront composition, ownership, freshness, navigation, and action contracts.
6. Outcome measurement and business-value attribution without hidden profiling, false conversion claims, raw Intent disclosure, or unauthorized V2→V1 data.
7. GPS/passive context, external AI, persistent/cross-session Intent, accessibility context, sensitive domains, sponsored experiences, and public deployment as separate architecture/privacy gates.

The bounded design is finalized for closure review. It advances no implementation state and changes no V1, Backend, schema, API, integration contract, or production scope.

من کدکس هستم
