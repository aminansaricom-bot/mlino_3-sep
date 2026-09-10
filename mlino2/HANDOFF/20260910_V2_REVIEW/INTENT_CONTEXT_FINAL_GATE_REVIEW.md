# MLINO V2 — Intent Context Final Architecture Gate Review

**B) APPROVED WITH MINOR CHANGES**

Reviewed document: `INTENT_CONTEXT_CONTRACT_REDESIGN.md`, exactly as committed at `267bb81a753c6b99594519e0c5c4e146bd202a74`, branch `astra/visual-system-local-experience`.

Reviewer: Codex, architecture-review role. This is an evidence-based self-review of the document, not an independent reviewer attestation, runtime validation, legal assessment, or production certification. Only this review document is created. No source contract, implementation, schema, API, or migration is changed.

## 1. Executive Decision and Approval Scope

The redesigned architecture is acceptable for the expressly bounded first slice: one foreground intent task in one tab, local interpretation and matching against the existing mock directory, manual search context, visible version-specific confirmation, and in-memory session processing. It no longer requires fundamental redesign of intent ownership, interpretation authority, or the relationship between user goals and business evidence.

Approval is conditional on the three finite pre-coding items M1–M3 in section 5. They resolve a narrow resume ambiguity, documentation precedence, and product adoption of proposed limits. They do not require another Intent model or a schema-first design exercise. This review does not authorize implementation during the current task.

The scope excludes live V1 integration, external-model processing from this Intent flow, passive/device location capture, background sensing, persistent or cross-device intent, reminders, business messaging, purchases, and telemetry. This is not approval of the full future platform. Those exclusions are part of the architecture being accepted, not optional implementation shortcuts. [Redesign §2.2][Scope]

The previous gate remains historical evidence for the old contract. This review evaluates the new revision and its declared scope; it does not retroactively approve the old document or assert that existing code already conforms.

## 2. Approved Decisions and Review Findings

### 2.1 Intent ownership

**Accepted.** The user owns the task's meaning, correction, start, stop, and completion. MLINO can form a candidate interpretation but cannot activate it merely from context, signal strength, confidence, or a business request. Active-use authority depends on a current confirmed revision, appropriate processing permission, valid context, and a still-valid task. [Redesign §2.1][Ownership]

A direct statement establishes what the user said; it does not validate a parser-added subtype or constraint. Existing parser output remains a candidate and cannot bypass the new confirmation boundary. This resolves the principal risk that MLINO's interpretation could silently become the user's goal. [Redesign §4][Confidence]; [§8][V1V2]

### 2.2 Interpretation versioning and traceability

**Accepted.** The contract can answer “What exactly did the user confirm?” The answer is the displayed immutable revision, including goal, mandatory constraints/exclusions, optional preferences, context, task window, and next-action scope. Confirmation is tied to that exact meaning; it is not a reusable permission attached only to a task identifier. [Redesign §2.4][Versions]

Material changes create a new candidate and require new confirmation. Editing suspends previous authority immediately. Late matching results and delayed acceptance of an old revision cannot restore it. Unchanged display formatting does not create new meaning; uncertainty about equivalence is treated conservatively as a semantic change.

No database representation or revision-number algorithm is needed to approve these semantic obligations. Future implementation must demonstrate them at result display and action time, not just when a request begins.

### 2.3 Signal Strength, Intent Confidence, and User Confirmation

**Accepted.** Signal Strength describes the quality, directness, freshness, and independence of evidence. Intent Confidence describes support for a particular interpretation. User Confirmation is an affirmative user act, not a score. Goal Specificity is explicitly named separately, and the ambiguous old term Strength is retired. [Redesign §4][Confidence]

These concepts may influence explanation or clarification but cannot substitute for one another. Correlated repetitions do not become confirmation. Lower confidence cannot silently relax a confirmed requirement, and higher confidence cannot grant consent. The qualitative model is adequate for this slice; a numeric threshold is not an unresolved activation requirement.

### 2.4 Lifecycle separation

**Accepted, subject to the narrow visibility clarification M1.** User Intent, Business Offer, and Experience availability have distinct authorities and expiry causes. An expired offer removes that offer from eligibility; it does not mean that the user stopped wanting the product. A valid goal can remain Active with no qualifying result. [Redesign §3.1–3.2][Lifecycles]

Separation does not mean that these concepts have no dependencies. A user withdrawal must invalidate intent-derived experiences, and expired offer evidence must disable an offer-dependent action. Those are deliberate, one-way dependency effects. They must not expire the user goal merely because a business condition changed, modify the offer because the user stopped, or turn an unavailable experience into a completed goal.

Detected is placed at the signal stage. Rejection, pause, ending, and expiry have explicit meanings; archival is not automatic and is excluded from the first slice. Session limits continue while paused. These changes resolve the prior model's conflation of activity and retention.

### 2.5 Confirmation, consent, and privacy

**Accepted for the bounded processing scope.** Processing permission is obtained before interpreting task data; confirmation separately accepts the displayed meaning. Confirming an intent does not authorize storage, export, reminders, business contact, or external inference. General app use and OS permissions are not substitutes. Withdrawal stops processing and invalidates pending results. [Redesign §5–6][Consent]

Retention is limited to the current in-memory task under explicit session bounds. Intent content is excluded from persistent storage, URLs, caches, logs, analytics, model prompts, and outbound business/map requests. There is no general audit exception for personal transcripts. [Redesign §6.2][Retention]

Sensitive inference remains prohibited. A generic dental-service request is not evidence of a diagnosis; a price constraint is not evidence of financial standing. Explicit incidental personal details are not authorization for sensitive profiling. External processing and sensitive personalization remain excluded even if a user would consent to them. The existing LLM path is not an implicit exception. [Redesign §6.3][Privacy]

### 2.6 Context and matching readiness

**Accepted for the supported mock-data claims.** User-declared context takes precedence over passive observations. A manual point is a search destination rather than proof of physical presence. Essential missing context pauses matching; optional missing context does not force unnecessary questioning. Context changes that alter meaning require a new confirmed revision. [Redesign §2.3][Context]

The matching boundary requires evidence for hard constraints and exclusions; unknown evidence cannot silently pass. Preferences operate only among eligible candidates and do not become invented positive facts. Unsupported stock, opening hours, quality, or fulfilment claims are explicitly excluded from the current directory's capabilities. [Redesign §7][Matching]

Offers are optional unless required by the user. The existing nearest-active-offer selector cannot be treated as the general Intent matcher. Unconfirmed hypotheses cannot personalize, filter, or order business results under the guise of a labelled suggestion. Businesses contribute factual capability evidence rather than commands to target people. These decisions preserve the experience-layer vision and prevent a default advertising feed.

### 2.7 V1/V2 responsibility boundary

**Accepted.** V1 owns business capabilities, knowledge, evidence, offer conditions, and authoritative availability where those concepts actually exist. V2 owns intent understanding, customer relevance, experience selection, explanation, and user interaction. V1's business intelligence ownership does not relocate customer matching into V1. [Redesign §8][V1V2]

Business Directory Service remains the sole V1-aware component in V2. Data direction remains V1 → V2, with no intent, confirmation, personal context, or outcome writeback. User consent cannot amend this architectural boundary. These rules agree with the existing architecture principles and the integration document's allocation of customer matching to V2. [Architecture principles][Architecture]; [Integration responsibilities][Integration]

The review approves ownership and consumption boundaries, not the existence of a live capability/knowledge/availability feed. The redesign correctly acknowledges that the current mock directory cannot establish production freshness, stock, or business fulfilment. Live integration still requires separately approved V1 evidence and compatibility work.

## 3. Disposition of the Nine Previous Blockers

| Blocker | Final review disposition | Evidence / remaining condition |
|---|---|---|
| R1 — terminology | Semantic issue resolved. | Separate concepts in §4; outdated source wording must be marked historical through M2. |
| R2 — confirmation authority | Resolved. | Immutable revision, exact scope, edit invalidation, rejection, and stale-result checks in §2.4 and §5. |
| R3 — lifecycle | Fundamental issue resolved; small clarification remains. | Separate intent/offer/experience lifecycles in §3; tab visibility resume clarified by M1. |
| R4 — context | Resolved for manual, single-task scope. | Context precedence and material-change rules in §2.3; live sensing expressly excluded. |
| R5 — retention/permission | Resolved as a bounded proposal, pending policy adoption. | In-memory limits, explicit processing permission and disposal in §3.3/§6; M3 records owner acceptance. |
| R6 — sensitive/external processing | Resolved for local-only scope. | Prohibited inferences, unsupported sensitive personalization, no remote fallback or intent export in §6.3. |
| R7 — matching semantics | Resolved for existing mock evidence. | Hard constraints, unknowns, supported claims, preference order, and action-time checks in §7. |
| R8 — ownership/data direction | Resolved. | Directory-only V1 boundary, V2 customer matching, no writeback in §8; M2 removes ambiguity from old references. |
| R9 — bounded scope/evaluation | Resolved as a proposal, pending documented adoption. | Scope and exclusions in §2.2, asking limits in §5.3, acceptance scenarios in §9.3; M3 records acceptance. |

“Resolved” here describes design sufficiency within the declared slice. It is not a claim that software has been changed, runtime tests passed, or all future platform dependencies disappeared.

## 4. Remaining Risks

- **Existing-path bypass.** Legacy parser, matcher, LLM, map, and detail paths may not carry the new revision and permission authority. Integration must prove that a pre-existing path cannot silently process or disclose new intent content. The document's prohibition is sound; enforcement remains future work.
- **Asynchronous invalidation.** Delayed results, duplicate acceptance, tab suspension, clock changes, and return from browser history can resurrect stale state if implementation checks only at request time. Authority must be checked again before presentation/action. No forensic memory-erasure guarantee is implied.
- **Privacy containment.** Local processing reduces exposure but does not by itself prevent copying raw text into logging, URLs, shared UI state, or outgoing requests. Manual context can also reveal a precise place. Boundary validation must inspect those destinations, not merely assert that no new API exists.
- **Evidence versus real-world truth.** A mock listing supports a simulated directory claim, not stock, opening status, merchant response, or successful physical action. Wider storefront and business-value claims remain unproven.
- **Interaction friction.** A processing choice, interpretation statement, and possible clarification can feel cumbersome. The one-question limit and explicit task entry are reasonable starting policies, but usability needs later evaluation. Friction must not be reduced by dropping confirmation or consent.
- **Unverified policy effectiveness.** Thirty minutes of inactivity and a two-hour maximum are proposed product bounds, not empirically optimized or legally certified retention periods. M3 requires explicit adoption; public/live deployment needs the assessments already excluded by the redesign.

These are risks to control during implementation and later validation. Apart from M1–M3 below, they are not grounds to invent additional pre-coding architecture work for excluded features.

## 5. Required Changes Before Coding

Exactly three pre-coding items remain. They require documentation and adoption, not implementation first. This review records them; it does not modify the source documents on the user's behalf.

### M1 — Make hidden-tab resume behavior explicit

**Evidence:** §3.2 says a Paused task resumes only through explicit user action. §3.3 says hiding the tab pauses processing and return rechecks validity before showing results. It does not explicitly say whether returning automatically resumes a task or only makes a resume control available. [Lifecycle table][Lifecycles]; [Session rule][Session]

**Required clarification:** define hiding the tab as entering the existing Paused state. Returning alone must not restart matching or actionable experiences. After deadline/permission/revision checks, show an explicit resume action. That action may resume the unchanged confirmed revision; a changed meaning requires confirmation again. An expired session is disposed of and requires a new task with permission and confirmation. Pausing does not reset the inactivity or absolute cap.

**Closure evidence:** one consistent sentence/rule in the redesign plus a hidden-tab/return scenario with that outcome. This chooses the conservative behavior already present in the Paused model; it does not introduce a new state or subsystem. Product/V2 review should acknowledge the clarification.

### M2 — Establish the authoritative implementation reading path

**Evidence:** the redesign states that it will govern conflicting semantics upon adoption, but MLINO BOOK, Open Decisions, and the roadmap still direct readers primarily to the old decisions/data contract. Those older documents retain the old Strength meaning, combined retained confirmation, and ambiguous reverse-transfer wording. [Redesign adoption rule][Adoption]; [Book][Book]; [Open Decisions][Open]; [Roadmap][Roadmap]

**Required change:** in a subsequent documentation-only revision, point those current navigation/status documents to the accepted redesign and this gate; mark the conflicting earlier Intent sections as superseded for the bounded slice, preserving their history. Record R1–R9 dispositions and distinguish excluded future work from current conditions. Do not rewrite or relax the protected V1 integration contract, or erase the earlier review.

**Closure evidence:** a reader following Book → Roadmap/Open Decisions → governing contract reaches one consistent set of current rules. Product/V2 review verifies the document set. The status must still identify M3 as pending until adoption is actually recorded.

### M3 — Record adoption of the proposed scope and product limits

**Evidence:** the redesign explicitly leaves its initial scope, session/asking policy, relevance policy, and conformance scenarios proposed for product adoption. This gate request authorizes architecture review; it does not establish that all product/privacy approvals listed there have already occurred. [Redesign §9.1][AdoptionItems]

**Required record:** product-owner adoption of the local/mock/manual-context slice and exclusions; the 30-minute inactivity and two-hour absolute session limits; explicit local-processing choice and no durable intent retention; one clarification per submitted request and silence after dismissal; hard-constraint evidence and user-ordered preferences; and the conformance scenarios in §9.3. Record the designated V2/privacy review responsibility without inventing a person's approval. No V1 change or live projection is being approved by this record.

**Closure evidence:** an identifiable approval of those concrete choices, recorded in the current handoff/decision documentation. If the owner changes an exclusion or material policy instead, review the affected boundary before enabling it. Do not claim adoption from silence or from this document's existence.

### Closure rule

Once M1–M3 are documented, the reviewer can verify their closure without repeating the entire initial redesign exercise. Before coding, the product owner must issue the implementation instruction for the bounded slice. The current request remains review-only. A runtime delivery gate after implementation is still required; this architecture review cannot replace it.

## 6. Evidence, Validation Boundary, and Handoff

This gate was performed by reading the redesigned contract at the pinned commit, comparing it to the original nine-blocker review, checking the older Intent documents and current governance pointers, and checking V1/V2 source architecture responsibilities. No runtime tests, schema generation, API work, or implementation changes were performed. Stage 2's existing test results are not evidence that the new contract has been implemented.

The review's acceptance baseline for future validation is the redesign's §9.3 scenarios, plus M1's hidden-tab case. In particular, later evidence must demonstrate that unconfirmed/withdrawn/stale revisions never authorize matching, unsupported hard requirements never become positive claims, and task data never reaches an excluded store or recipient. [Acceptance scenarios][Scenarios]

Future V1 production data, GPS/movement, persistent/cross-device goals, external AI, messaging, telemetry, and public deployment remain separate expansion gates. Their absence does not invalidate approval of the bounded architecture; adding them would expand the scope and require review.

Delivery scope: only `INTENT_CONTEXT_FINAL_GATE_REVIEW.md`. No amendment to the reviewed contract, no implementation start, and no assertion of independent approval. The next authorized step is closure of M1–M3, followed by the owner's bounded implementation instruction.

[Scope]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L52
[Ownership]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L31
[Versions]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L72
[Confidence]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L128
[Lifecycles]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L88
[Session]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L118
[Consent]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L145
[Retention]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L183
[Privacy]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L198
[Context]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L62
[Matching]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L210
[V1V2]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L248
[Adoption]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L7
[AdoptionItems]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L274
[Scenarios]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_CONTRACT_REDESIGN.md#L305
[Architecture]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/01_ARCHITECTURE_PRINCIPLES.md#L5
[Integration]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md#L62
[Book]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/MLINO_BOOK.md
[Open]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/OPEN_DECISIONS.md
[Roadmap]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/267bb81a753c6b99594519e0c5c4e146bd202a74/mlino2/03_ROADMAP_PHASES.md

من کدکس هستم
