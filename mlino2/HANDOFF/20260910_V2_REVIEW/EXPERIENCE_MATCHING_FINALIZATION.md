# MLINO V2 — Experience Matching Finalization

Author: Codex, Product Architect role.

Status: **EM-G1–EM-G4 closed in design; closure review pending**.

This document resolves the four minor changes required by [the Experience Matching Architecture Gate](EXPERIENCE_MATCHING_FINAL_GATE_REVIEW.md). It aligns and amends the bounded semantics in [Experience Matching Design](EXPERIENCE_MATCHING_DESIGN.md) while preserving the authority of the [Intent Context Contract Redesign](INTENT_CONTEXT_CONTRACT_REDESIGN.md) and [Intent Finalization](INTENT_CONTEXT_FINALIZATION.md).

The scope remains local processing, one foreground task in one tab/session, manual context, and experimental/mock business data. This is product and architecture documentation only. It does not create or authorize code, schema, API, migration, live V1 integration, new AR behavior, persistence, telemetry, advertising, or production deployment.

## 1. Closure Summary

| Gate item | Final decision | Status |
|---|---|---|
| EM-G1 — Context and ordering | Context is expressed only as a confirmed hard condition, an explicitly user-ordered optional preference, or the approved distance fallback. There is no independent context-fit score or tier. | Closed in design. |
| EM-G2 — Offer semantics | Mandatory offer requirements affect eligibility; optional offer preferences affect ordering at the user's chosen position; incidental offers enhance only an already relevant Experience. Exact claim scope needs evidence. | Closed in design. |
| EM-G3 — Session authority | Active, Paused, Rejected, Expired, and Ended states have distinct matching authority and transitions. Confirmation alone cannot authorize matching while Paused or after terminal state. | Closed in design. |
| EM-G4 — Initial Experience | The initial mode is Intent-Guided Local Discovery with zero to three business-level results, one slot per business, incidental business-level offer awareness, and Open business details as the supported next action. | Closed in design. |

These closures make the bounded architecture internally consistent. A reviewer must still verify this package, and the product owner must issue a separate implementation instruction before coding begins.

## 2. Context Role Clarification

### 2.1 Intent and context have different authority

**Intent answers:** “What does the user currently want to achieve?”

**Context answers:** “Under which permitted conditions can that goal be fulfilled now?”

Context may include the user's selected area, radius, time/task window, destination, building, floor, or other current-task conditions. It modifies the suitability of an Experience only through the exact meaning shown in the confirmed Intent revision.

Context does not:

- create a user goal;
- confirm or activate an Intent;
- become a hidden preference;
- create an independent relevance score;
- establish physical presence from a manual point;
- accumulate into a cross-session profile;
- receive a second ranking benefit after it has already acted as a constraint.

### 2.2 Context classification rule

Every contextual property used by matching must have exactly one role:

1. **Hard condition:** required for eligibility because the confirmed revision says it must hold. Unknown does not pass.
2. **Explicit optional preference:** used only at the position the user assigned among optional preferences, with supported comparable evidence.
3. **Distance fallback:** nearest distance inside the already confirmed search area, used after user-ordered optional preferences.
4. **Display-only context:** shown for orientation but used for neither eligibility nor ordering.

If the role is unclear, it is not used until the user clarifies or edits the interpretation. The same fact cannot occupy more than one role for the same revision.

### 2.3 Final ordering rule

Ordering is deterministic and lexicographic:

1. all candidates have already satisfied the goal and every hard condition;
2. compare explicit optional preferences in the user's confirmed order, using only supported and comparable evidence;
3. use nearest distance within the confirmed search area;
4. use stable business identity as the final tie-break.

Missing, stale, or incomparable optional evidence receives no positive credit. Unordered optional context receives no invented priority. Payment, popularity, promotion, engagement likelihood, business margin, capacity pressure, and an opaque model cannot alter inclusion, order, candidate quantity, or timing.

## 3. Offer Versus Requirement

### 3.1 Controlling boundary

> User requirement → Eligibility → Relevant Experience → Optional offer enhancement

Capability evidence must first show that a business can satisfy the confirmed need. An offer is a conditional business fact; it is not a substitute for capability matching.

An offer cannot:

- create Intent or relevance;
- make an irrelevant capability eligible;
- override a hard condition or exclusion;
- replace product/service/capability or availability evidence;
- create another result slot for the same business;
- improve ordering unless the user explicitly made it an optional preference;
- trigger a notification, background match, or unsolicited Experience;
- gain influence from payment or requested reach.

### 3.2 Mandatory, optional, and incidental treatment

| Confirmed meaning | Matching behavior | Expiry or failed evidence |
|---|---|---|
| Mandatory offer/discount condition | Part of eligibility. The exact requirement and applicability must be supported. | Candidate becomes ineligible; the Intent may remain Active and receive another result or no match. |
| Optional offer/price preference | Compares eligible candidates only at the preference position chosen by the user. | Receives no positive credit; independently supported discovery remains eligible. |
| Incidental business offer | May be attached after the business is selected as relevant. It does not affect inclusion or ordering. | Remove the enhancement; recheck the underlying Experience without ending the Intent. |
| Price requirement without offer | Evaluate the relevant listed price only when item, amount, currency and comparison basis satisfy the confirmed rule. | Unknown/incomparable price cannot pass a mandatory condition; no discount is invented. |

### 3.3 Evidence required before showing an offer

Every shown offer needs:

- a traceable business and offer identity;
- a current authoritative or clearly labelled experimental source record;
- a valid start/end interval at display and action time;
- non-revoked status where the source supports revocation;
- satisfied offer conditions rather than assumed eligibility;
- evidence of the scope to which the claim applies;
- wording that matches that scope and does not imply stock, fulfilment, quality, or a product discount without evidence.

The current mock directory associates an offer with a business and does not associate it with an individual product or service. The initial Experience may show a time-valid **business-level offer**, explicitly labelled as such. It cannot state or imply that the offer discounts the matched product/service. A mandatory product-specific discount request is therefore unsupported in the bounded slice.

## 4. Session State Model

### 4.1 State authority

| State | Entry | Matching authority | Required next action |
|---|---|---|---|
| Active | Current revision confirmed; the user deliberately requested matching; processing permission, session and essential context are valid. | Candidate generation, presentation and supported action are permitted, subject to evidence recheck. | User may inspect a result, pause, correct, reject/stop the task, or allow it to expire. |
| Paused | App/tab hidden, explicit pause, editing begins, or a recoverable essential context/evidence prerequisite becomes unavailable. Time limits continue. | No generation, display of pending results, or action on stale Experiences. Confirmation remains attached to the unchanged revision but is insufficient by itself. | Explicit Resume after validation may restore the unchanged revision. A material edit creates a new revision and needs confirmation. |
| Rejected interpretation | User rejects the displayed hypothesis/revision. | That revision is terminal and authorizes no matching or Experience. | Resume is unavailable. A new explicit request may create a new hypothesis/attempt. |
| Expired Intent | Confirmed deadline, 30-minute inactivity limit, or two-hour absolute session cap is reached. | Terminal. Old candidates and task content are disposed under the Intent contract. | A fresh task needs applicable processing permission, a new interpretation, confirmation, and deliberate matching request. |
| Ended task | User stops/deletes, withdraws processing permission, navigates/reloads/closes the tab, reports completion, or starts another goal. | Terminal. Pending and presented candidates lose authority. | A later task starts fresh; old authority cannot be revived. |

Rejection describes the user's rejection of MLINO's interpretation; it does not let MLINO define the user's actual intent. Expiry is a disclosed time boundary, not a rejection. Paused is temporary, but it never suspends the inactivity or absolute clock.

### 4.2 Resume rule

App/tab visibility is not a user action and cannot restart matching. Matching may resume only when:

1. the user explicitly selects Resume/Continue;
2. the task/session has not expired or ended;
3. processing permission remains valid;
4. the exact confirmed revision and material context are unchanged;
5. required context and business evidence are usable again; and
6. the requested action remains supported.

A pre-pause candidate has no independent authority. After an explicit valid resume, it may be presented only after current revision, permission, session, context and evidence are rechecked. A material change requires a new candidate revision and confirmation. A late result after rejection, stop, withdrawal, expiry, or replacement is discarded.

## 5. Initial Experience Scope

### 5.1 Product decision

The first MLINO V2 Experience is **Intent-Guided Local Discovery**.

It is the smallest experience that can prove all three intended values:

- **User value:** a credible, explainable shortlist for the user's confirmed need, with honest unknown/no-match behavior.
- **Business value:** qualified visibility for businesses whose listed capabilities actually satisfy that need, plus truthful awareness of an applicable business-level offer.
- **Architectural learning:** proof of confirmation authority, evidence-backed eligibility, deterministic ordering, lifecycle invalidation, explanation and the V1→Directory→V2 boundary before richer modes are attempted.

Complex AR is excluded. Guided Shopping, direct contact/booking/messaging, purchase, rich Virtual Storefront composition, new navigation behavior, persistence and measurement are also excluded.

### 5.2 Input and output

**Input:**

- one current Active confirmed Intent revision;
- its goal, mandatory constraints/exclusions and optional user-ordered preferences;
- manual selected area/radius and any confirmed time/building/floor conditions;
- processing permission and valid single-session authority;
- read-only experimental Business Directory capability and evidence.

**Output:**

- zero to three ordered business-level Experiences;
- at most one slot per business, even when several products or offers match;
- a reason tied to the confirmed goal and supported listing evidence;
- selected-area distance where evidence exists;
- a visible experimental-data/source label;
- material unknowns and unmet optional preferences;
- any applicable validity limit;
- one matching-owned next action: **Open business details**;
- an incidental business-level offer only when §3 evidence is satisfied.

The result set is not padded. When only one business qualifies, show one. When none qualify, return the appropriate honest outcome instead of broadening the user's constraints.

Opening business details is the useful first business/user interaction: the user deliberately inspects a business that is relevant to the confirmed task. It does not disclose the user's Intent/context to that business and does not prove contact, visit, purchase, fulfilment, or satisfaction.

### 5.3 Candidate granularity and duplicate protection

The ranking unit is a business-level Experience. Matching product/service listings are supporting evidence inside that Experience. Multiple matching listings, offers, visual modes, or paid features cannot create additional slots or duplicate exposure for the same business.

If several listings within one business are relevant, the explanation may identify the supported ones without asserting stock. The business occupies one ordering position determined by the user's preferences, then distance and stable business identity. The bounded slice does not define an internal product order beyond what is necessary to explain the match.

## 6. Experimental Claim and Evidence Matrix

| Claim or condition | Current evidence allowed | Permitted statement/use | Unsupported extension |
|---|---|---|---|
| Business/category match | Directory business identity and category. | The business is listed in that category. | Quality, popularity, suitability beyond the confirmed generic category. |
| Named product/service listing | Product entry, or business/category text where it explicitly names a service, in the experimental record. | The item/service is listed by the business and textually supports the confirmed need. | Current stock, fulfilment, exact suitability, merchant guarantee, or a structured service fact that the directory does not contain. |
| Selected area/distance | User-selected search point/radius plus directory latitude/longitude. | Listed location is within the selected radius; geometric distance from the selected point. | User physical presence, route time, accessibility, travel feasibility. |
| Building/floor | Directory `building_id`/`floor_level` plus manual confirmed context. | Recorded building/floor satisfies an exact confirmed condition. | Inferring the user's floor, treating null as a match, GPS proof. |
| Listed price | Relevant listing amount and currency. | Display exact price; evaluate a supported maximum-price condition when item and currency align. | Cheapest/lower comparison without common item/unit/currency basis; affordability inference. |
| Business-level offer | Offer identity/title/description and valid interval on the business record. | Display a time-valid experimental business-level offer with explicit scope. | Claim that it discounts a matched item/service; stock, redeemability, hidden conditions or fulfilment. |
| Freshness | Loaded experimental dataset and timestamps. | Label the source as experimental and recheck time-bound facts. | Production freshness, live merchant state, truth guaranteed by `last_synced_at`. |
| Opening/stock/booking/interaction availability | None in the current approved vocabulary. | Mark unknown/unsupported when material. | Any positive “open now,” in-stock, bookable, contactable or guaranteed claim. |
| Open business details | Existing local detail surface as a user-controlled action. | User can inspect available local business information. | Contact, booking, navigation success, visit, conversion, or business notification. |

The four possible outcomes remain distinct:

- **Supported match:** every hard condition and presented material claim has allowed evidence.
- **No supported match:** usable evidence was evaluated, but no business met all requirements.
- **Unsupported requirement:** the current vocabulary cannot evaluate a mandatory request.
- **Recoverably unusable:** a non-terminal permission/context/evidence prerequisite prevents current matching; terminal session/Intent state is handled under §4 and is not called retryable.

## 7. Closure Examples

| Scenario | Required result |
|---|---|
| User selects a mall but gives no mall-related optional preference. | The selected area constrains eligibility; it receives no additional ranking score. |
| User explicitly orders “same floor” as an optional preference. | Compare it only at that confirmed preference position; unknown receives no credit. |
| “A discount would be nice.” | Businesses without an offer remain eligible; supported offers affect order only at the user's selected preference position. |
| “Only show a valid discount.” | Offer evidence is mandatory; no qualifying evidence means ineligible. |
| Product is listed and the business has a valid offer with no product link. | Show the listing and, if relevant, a separately labelled business-level offer; do not claim a product discount. |
| Optional offer expires. | Remove the enhancement; preserve independently supported discovery after recheck. |
| Tab becomes visible after pause. | Show no new/pending Experience until explicit Resume and all authority checks pass. |
| Session expires while hidden. | Dispose the old task/candidates; a new task, permission and confirmation are required. |
| User rejects the interpretation. | That revision cannot resume or match; a new explicit request is required. |
| Four products from one business match. | One business-level Experience slot; products remain supporting evidence. |
| Only one business qualifies. | Return one result; never pad with an ineligible listing. |
| Payment status changes while user inputs and evidence remain identical. | No change to retrieval, inclusion, number of slots, ordering, mode or timing. |
| User opens business details. | Record no inferred visit, purchase or conversion; disclose no private Intent to the business. |

## 8. Documentation and Delivery Boundary

[Experience Matching Design](EXPERIENCE_MATCHING_DESIGN.md) is updated to carry these decisions. [MLINO Book](../../MLINO_BOOK.md), [Roadmap](../../03_ROADMAP_PHASES.md), and [Open Decisions](../../OPEN_DECISIONS.md) identify this Finalization as the current closure record. The conditional Gate remains unchanged as historical review evidence.

No bounded semantic decision from EM-G1–EM-G4 remains open in this authoring step. Two process gates remain: review and accept this closure, then issue a separate implementation instruction. Future production, live V1, richer Experience modes and measurement decisions remain open in their existing register and are not pulled into the initial scope.

No implementation, schema, API, migration, V1/Backend change, integration-contract change, runtime test, or production claim is included.

من کدکس هستم
