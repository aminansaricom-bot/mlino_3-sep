# Stage 3 Recommendation

Stage 3 must remain a product-owner decision. The options below are alternatives, not parallel implementation instructions.

| Path | User value | Business value | Complexity | Suggested priority |
|---|---|---|---|---|
| **A — Intent Understanding** | Lets the user express a need in natural language and receive a more relevant set of nearby options. | Improves relevance of discovery and reduces exposure that feels like untargeted advertising. | **Medium–High**: intent schema, ambiguity handling, evidence rules, and matching tests are needed. | **1 — Recommended first** |
| **B — Virtual Storefront / Business Experience** | Makes the selected business more useful before a visit through richer, trustworthy product/service presentation. | Gives a business a clearer presence and a reason to keep its offer data accurate. | **High**: data freshness, inventory boundaries, floor/AR behavior, and content ownership must be defined. | **2 — After contract review** |
| **C — Business-user Interaction** | Allows a customer to ask a business a question or request information. | Creates a direct contact path and possible future conversion signal. | **Very High**: identity, authorization, tenant isolation, response responsibility, retention, moderation, and availability evidence. | **3 — Later, after governance** |

## Recommended sequence

Start with a review and design milestone for **A**, bounded to intent understanding over the existing local discovery data. It should preserve the current evidence-first empty states and must not silently change V1 ranking. In parallel, define the data and ownership prerequisites for **B**; do not present inventory, reviews, social proof, or freshness until their contracts exist. Defer **C** until messaging governance and business responsibility are approved.

## Required gates before coding

- Product owner selects one path.
- Independent review accepts the Stage 2 architecture and user journey.
- Data ownership, consent, unknown values, freshness, and failure behavior are documented.
- Any V1↔V2 gateway or contract change receives its own review and compatibility tests.

No Stage 3 implementation is included in this package.
