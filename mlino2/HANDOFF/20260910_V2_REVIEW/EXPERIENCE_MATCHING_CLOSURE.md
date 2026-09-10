# MLINO V2 — Experience Matching Closure

Author: Codex, Design Closure Assistant
Status: **Documentation-level closure for review; implementation is not authorized**
Scope: Intent-Guided Local Discovery, local processing, one foreground task in one session, manual context, and experimental/mock business data.

This document closes the offer-policy and evidence-granularity corrections requested after the Experience Matching architecture gate. It is governed by [EXPERIENCE_MATCHING_FINALIZATION.md](EXPERIENCE_MATCHING_FINALIZATION.md), amends [EXPERIENCE_MATCHING_DESIGN.md](EXPERIENCE_MATCHING_DESIGN.md), and does not change V1, Backend, frozen contracts, schemas, APIs, or runtime behavior.

## 1. Offer Policy Alignment

The controlling order is:

> User requirement → Eligibility → Relevant experience → Optional offer enhancement

For the initial Intent-Guided Local Discovery scope:

### Offer is not

- a creator of user intent or relevance;
- a substitute for capability, product/service, availability, or evidence matching;
- a ranking override or a source of additional result slots;
- a reason to relax a hard requirement or selected context constraint;
- an advertising trigger, notification trigger, or paid-placement mechanism.

### Offer is

An offer is an enhancement attached to an experience that is already valid for the confirmed user requirement. It may make that experience more useful or actionable when its own validity, conditions, and scope are evidenced. It cannot rescue an otherwise ineligible business.

### Explicit offer requests

When the confirmed Intent explicitly requests an offer, discount, or promotion, that request becomes a user requirement and is evaluated as an eligibility condition. The underlying capability must still match first. A qualifying offer must then satisfy the exact requested scope and conditions. If no single qualifying option has applicable offer evidence, the business is ineligible for that request; the offer is not silently downgraded to a ranking hint.

Ambiguous wording such as “a discount would be nice” must be clarified or treated as incidental according to the confirmed Intent revision. It must never be converted into hidden offer ranking.

### Evidence required for an offer claim

Every shown offer requires:

- traceable business and offer identity;
- current source data, clearly labelled as experimental where applicable;
- valid `valid_from` and `valid_until` at evaluation/display time;
- stated conditions and non-revoked status when the source supports them;
- evidence of the scope to which the offer applies;
- wording limited to what that scope proves.

The current mock directory stores offers at business level and does not link them to a particular product or service. It may therefore show a valid business-level offer with that scope explicitly stated. It must not claim that the offer discounts the matched product/service without product-applicability evidence.

## 2. Single Business Result Evidence Rule

### 2.1 One result, one qualifying option

A business result is valid only when **one qualifying option, product, or service from that business satisfies every required user condition**. Required conditions include the confirmed goal, hard constraints, selected context constraints, and any explicit offer/discount/promotion requirement.

Evidence may not be combined across catalogue entries. The following is false:

> Product A satisfies requirement 1 + Product B satisfies requirement 2 = one combined match.

If no single option satisfies all hard conditions, the business is ineligible even when the union of its products appears to satisfy them. This rule prevents a business-level result from promising an experience that no actual option can provide.

### 2.2 Evidence ownership

V1/Directory owns the business facts and their provenance: capability, product/service descriptions, prices, offer conditions, availability fields, freshness, and source status. V2 owns relevance evaluation and experience orchestration. V2 may evaluate evidence, but it must not invent facts, merge incompatible options, or convert a business-level fact into a product-level claim.

Every material explanation claim must be traceable to the same qualifying option used to pass eligibility. If the source cannot establish the required fact for that option, the fact is unknown or unsupported and cannot pass a mandatory condition.

### 2.3 Multiple options within one business

Several options may qualify independently, but the business still receives one result slot. The explanation identifies the option that supports the presented result; it does not aggregate options into a fictional bundle. Additional options may be listed as clearly separate alternatives only when the product surface supports that distinction and each alternative is independently evidenced.

Comparison between options is valid only when all of the following hold:

- the options represent the same semantic item/service or an explicitly comparable class;
- unit and currency are the same;
- the comparison criterion is present in the confirmed user requirement or preference;
- the underlying values are evidenced for each compared option.

Without that common basis, V2 makes no “cheaper,” “better,” “best,” or cross-option aggregate claim. After eligibility, the approved business-level ordering and stable tie rules apply.

## 3. Acceptance Examples

### 3.1 Valid experience match

Confirmed Intent: “Find a running shoe under 3,000,000 IRR in the selected mall.”

Business A has one listed option, `Trail Runner 2`, with category running shoe, price 2,700,000 IRR, a location inside the selected mall, and current source evidence. The option satisfies every required condition. Business A is eligible for one business-level Experience. The explanation names `Trail Runner 2`, states the evidenced price and location, labels the experimental source, and does not claim stock or guaranteed suitability.

### 3.2 Invalid combined product match

Business B lists Product A as a running shoe but its price is 3,400,000 IRR. Product B costs 2,500,000 IRR but is a casual sneaker and does not satisfy the confirmed running-shoe requirement. No single option satisfies both category and price. Business B is excluded; Product A and Product B must not be combined into one result.

### 3.3 User-requested discount

Confirmed Intent: “Show only a running shoe with a valid discount.”

Business C has a qualifying running-shoe option but only a business-level offer with no evidence that it applies to that option. The business is not eligible for this explicit requirement. If Business D has one qualifying running-shoe option and a current offer whose scope, conditions, and validity explicitly apply to that same option, Business D is eligible. The offer is shown as evidence for that option; it still does not create relevance, improve ranking, or create another slot.

## 4. Closure and Boundaries

The first implementation scope therefore has one consistent offer policy and one evidence granularity rule:

1. Capability and user requirements establish eligibility.
2. A single option must satisfy all required conditions.
3. Explicit offer/discount/promotion requests are eligibility conditions.
4. Incidental offers enhance only already valid experiences.
5. No offer, payment, popularity, or promotion bypasses relevance or constraints.
6. One business receives at most one result slot.

This closure does not authorize implementation, schema design, API creation, live V1 integration, advertising, persistence, telemetry, production scale, or new AR behavior. Those remain separate governance decisions.

## 5. Updated References

- [Experience Matching Design](EXPERIENCE_MATCHING_DESIGN.md)
- [Experience Matching Finalization](EXPERIENCE_MATCHING_FINALIZATION.md)
- [MLINO Book](../../MLINO_BOOK.md)
- [Roadmap](../../03_ROADMAP_PHASES.md)
- [Open Decisions](../../OPEN_DECISIONS.md)

من کدکس هستم
