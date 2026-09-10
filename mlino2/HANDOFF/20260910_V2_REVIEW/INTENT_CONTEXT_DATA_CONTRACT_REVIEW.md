# MLINO V2 — Intent Context Data Contract Architecture Gate Review

Reviewed baseline: `704aadc2ceba9bd79b1c748da8688ef53eded3c5` on `astra/visual-system-local-experience`.

Reviewer: Astra, reviewing its own design. This is a document and boundary review, not an independent audit or runtime validation. The product owner's approval of Intent Context Decisions is accepted; it does not automatically approve this subsequent data contract.

Deliverable: this review only. The reviewed contract, approved decisions, application, V1, integration contract, and roadmap have not been amended by this review. Proposed resolutions below require review; they are not newly approved rules.

## 1. Executive Summary

**Gate result: C) Needs architectural changes. Implementation is not authorized.**

The contract is aligned with user ownership, explicit confirmation, restrained business influence, and evidence-based experiences. It is a useful statement of product intent. It is not yet an unambiguous foundation for implementation: the authority to activate an interpretation, the relationship between confirmation and retention, lifecycle invalidation, and the consumer boundary remain underspecified.

This is more than choosing timeouts or UI wording. Two implementations could follow the document and disagree about whether a saved hypothesis is confirmed, whether an old confirmation authorizes a changed interpretation, or whether an expired offer invalidates the user's goal. Those differences affect user control and require semantic architecture decisions before any schema or API work.

Nine blockers, R1–R9, are identified below. Each can be resolved in product/architecture prose and scenarios; none requires writing implementation first. Features outside the first implementation slice may be explicitly excluded instead of designing the entire future platform now.

| Review area | Assessment |
|---|---|
| Intent ownership | Correct principle; revision-specific authority and revocation propagation are missing. |
| Explicit / implicit separation | Clear at principle level; parser interpretation and unconfirmed suggestions create potential bypasses. |
| Confidence / confirmation / strength | Separate labels exist, but Strength conflicts with the current review brief. |
| Context | Correctly treated as signals; material change and conflicting evidence rules are missing. |
| Privacy and retention | Sensitive inference is prohibited; processing permissions, raw text, retention, and audit exceptions remain incomplete. |
| Business matching | Useful conceptual inputs; insufficient semantics for reliable capability matching or rich storefront claims. |
| V1 / V2 | Business data ownership is correct; matching ownership and permitted data direction need explicit reconciliation. |
| Implementation readiness | C — foundational corrections required, not merely minor parameter decisions. |

## 2. Approved Decisions

The following approved principles are supported by the reviewed text and should be preserved. Their inclusion here is not approval of missing enforcement semantics.

- **The user owns the goal.** MLINO represents an interpretation and cannot claim that passive context is an active intent. User correction, rejection, and deletion are recognized. [Contract §1][C1]
- **An implicit interpretation stays a hypothesis until confirmation.** High confidence is expressly insufficient to activate it. A direct request can confirm only its stated immediate scope; it does not authorize unrelated actions. [Contract §2][C2]
- **Confidence can be wrong.** It is revisable, subordinate to user correction, and cannot renew an expired intent. [Contract §3][C3]
- **Context supplies evidence rather than intent.** Location, time, environment, previous interactions, and session context are distinguished. Proximity does not prove entry and GPS does not prove a floor. [Contract §5][C5]
- **Sensitive profiling is excluded.** The contract prohibits sensitive personal assumptions and does not treat viewing, sharing, or navigation as proof of a purchase or visit. [Contract §6][C6]
- **Business capability does not authorize interruption.** The user controls constraints and an honest empty result remains valid. Missing capability, freshness, or availability cannot be invented. [Contract §7][C7]
- **Business data remains V1-owned.** V2 is a consumer through a controlled boundary. That principle agrees with the existing architecture. [Architecture principles §1–2][A1]

## 3. Architectural Risks

### R1 — Confidence, signal strength, and request specificity have conflicting meanings

The current gate brief defines Strength as signal strength. The contract defines it as how specific and actionable the request is; the preceding decisions use that same older definition. These are distinct concepts. Repeated weak signals may be numerous without being independent evidence, while a short explicit request may be clear without many signals. [Contract lines 88–98][C3]; [Decisions §3][D3]

The contract also calls explicit input high-confidence evidence for the words provided. That does not make the parser's interpretation high-confidence. “I need shoes” does not confirm a parser-added constraint such as running shoes. Treating validated parser output as user confirmation would violate ownership without changing any field labels.

Required resolution: distinguish source observation, interpretation confidence, signal strength, and goal specificity. Decide whether Strength retains its older meaning or changes; record the conflict openly. None may grant confirmation, contact permission, or spending authority. A numeric model or threshold is not required at this gate.

### R2 — Confirmation is not bound to a precise interpretation and purpose

The contract lists sources and confirmation states, but it does not specify which exact interpretation the user accepted, or what happens when that meaning is revised. An old “yes” could be applied to a new hypothesis; a delayed matching result could reopen a goal the user has already rejected. The newest-user-statement rule alone does not settle this. [Contract §4][C4]

Saving is listed as a confirmation source, while “Confirmed for retained purpose” combines agreement with the interpretation and permission to retain it. A save gesture might mean “keep this draft” rather than “this is what I want now.” Those meanings need distinct authority even if the final UX uses one clearly explained action.

Required resolution: define confirmation against the exact accepted meaning and scope; separately define retention, activation, sharing, reminder, and contact permissions. Specify the effect of correction and withdrawal on in-flight and cached results. Older evidence must not restore a rejected interpretation. User/session ownership must remain distinguishable from a durable cross-session identity.

### R3 — Lifecycle mixes intent validity with match availability and retention

Active is described as “currently actionable,” and it expires with time/context/evidence. The approved decisions also mention an offer window as an expiry cause. It is unclear whether the loss of one offer ends the user's goal or only invalidates that offer as a candidate. A user can still want running shoes after a discount expires. [Contract §1, §8][C1]; [Lifecycle table][C8]; [Decisions §2][D2]

Detected describes an observation before a goal exists; Archived describes retention. The six-state chain does not specify direct explicit-entry transitions, scheduled activation, completion, withdrawal, or restoration requiring fresh confirmation. Rejected is called terminal, while the confirmation model groups rejection and correction together. These cases cannot safely be left to individual implementers.

Required resolution: publish a complete conceptual transition table, including forbidden transitions and rejection/correction outcomes. Decide when context change invalidates the goal, when it pauses use, and when only candidate evidence expires. Define no-match behavior without automatically erasing the intent. Archival must not create indefinite retention or implicit reactivation. No extra lifecycle state is imposed by this review.

### R4 — Context precedence and freshness do not have operational meaning

Source, precision, recency, and expiry are named but their interaction is unresolved. A manually selected destination can legitimately differ from GPS position. Movement can invalidate a “near me now” search without changing a future destination request. Repeating an old search is not necessarily fresh intent evidence. [Contract §5][C5]

Required resolution: define precedence for declared versus inferred context, which context is essential to each task, material-change conditions, freshness behavior, and manual fallback. A stale or absent optional signal should not force a new question. No passive signal may silently alter a confirmed hard constraint. Rules for one-task versus concurrent goals and session boundaries must also be decided for the selected slice.

### R5 — Confirmation, processing permission, and retention permission are conflated

The explicit-intent section requires separate confirmation before retention. The privacy section nevertheless permits retaining searches, selected experiences, and confirmed interests, without clearly separating temporary task processing from saved history. “Temporary,” “quickly,” and “minimal approved governance need” do not define a deletion boundary. [Contract §2][C2]; [§6][C6]; [Archived state][C8]

Required resolution: define allowed task processing, saved history, expiry, deletion, and purpose-specific consent independently. Select retention limits and session-end semantics, or explicitly exclude durable intent storage in the first slice. Rejection suppression should not require retaining the rejected personal hypothesis indefinitely. Decide treatment of raw text, precise position, logs, caches, archives, and any audit exception; audit retention is not automatically justified by calling it governance.

### R6 — Prohibited inference is clear, but handling sensitive user input and external processing is not

A direct search for a service can contain sensitive information without authorizing an inference about the user's identity or condition. “Find a dentist” must not become “the user has a dental condition.” A blanket rule about assumptions does not define what happens to raw text, requested service details, incidental sensitive statements, or derived evidence. [Contract §6][C6]

There are already rule-based and LLM intent resolver paths. A future wrapper must decide what can cross that existing model boundary before confirmation, and what can appear in logs or provider retention. The declaration that no new API is created does not answer that question. Source inspection establishes the resolver boundary, not any claim of an observed privacy leak. [Existing resolver][Resolver]

Required resolution: approve a purpose-limited policy for explicitly supplied sensitive content, prohibited derivation, local/third-party processing, minimization, failure handling, and consent withdrawal. Alternatively, explicitly exclude relevant processing paths from the first slice. The review does not make legal-compliance claims or invent jurisdictional retention periods.

### R7 — Matching inputs do not yet define a supported match

The equation Intent + Context + Capability + Evidence is a sound direction, but it does not settle hard constraints versus preferences, unsupported concepts, negative constraints, partial matches, unknown values, or freshness at display/action time. [Contract §7][C7]

The current directory describes identity, location, products, offer windows, and last synchronization. It does not establish live stock, opening availability, fulfilment, arbitrary service capabilities, or verified experience outcomes. Product `is_active` and offer timing cannot stand in for these claims. [Existing directory contract][Directory]; [Integration draft §2][Integration]

| Future experience | Foundation present | Still required |
|---|---|---|
| Business discovery | User goal, geographic context, business identity | Constraint semantics, supported vocabulary, match reasons and unknown/no-match handling. |
| Offers | Offer identity and temporal windows | Separate offer validity from goal validity; define evidence freshness and conditions that can actually be claimed. |
| Virtual Storefront | Read-only identity and product presentation | Capability provenance, permission to display, availability limits, and honest unsupported attributes. |
| Relevant experiences | User-authorized presentation concept | Supported next actions and fulfilment evidence; no assumption of visit or purchase. |

Required resolution: define the minimum semantic matching input and output, their validity requirements, and supported claims for the selected slice. Decide whether unconfirmed hypotheses can only help form a question or can affect results; “labelled suggestion” must not become a route around confirmation. A rejected hard constraint cannot be relaxed merely to produce results.

### R8 — V1 ownership must be reconciled with existing V2 matching and one-way data flow

The existing architecture makes Business Directory Service the only component that knows about V1; the integration document assigns customer-need matching to V2. Owning business intelligence in V1 therefore does not mean moving all user matching or ranking into V1. [Architecture §2][A1]; [Integration responsibilities][Responsibilities]

The new contract's broad capability/knowledge/recommendation projection is not established by the current directory contract. Its clause permitting future personal-context transfer with consent must not be read as authorization for V2→V1 writes. The preceding decisions call a possible outcome transfer to V1 “read-only”; this is unresolved against the existing one-way V1→V2 rule. [Contract §6–7][C6]; [Decisions outcome flow][Outcome]; [Integration §1][Integration]

Required resolution: state ownership of interpretation, user confirmation, capability facts, matching, orchestration, and outcome learning separately. Route business facts through the directory boundary; identify the supported existing subset versus future V1 requirements. Define how existing parser outputs become candidates for interpretation, never authoritative user-owned Active Intents. Any reverse data flow needs its own approved architecture change; consent alone cannot amend that boundary.

The integration document describes itself as a draft pending V1 alignment. This is not permission to edit it: the user's restriction on integration/contract changes remains in force.

### R9 — The first implementation slice and acceptance evidence are not bounded

The contract leaves experience selection and evaluation open while the surrounding decisions also leave question fatigue limits unresolved. A global approval would allow incompatible assumptions about passive sensing, saved intent, reminders, model calls, and outcome learning. [Contract §9][C9]; [Open Decisions][Open]

Required resolution: name the first slice, enabled entry points, one-question policy, dismissal/cooldown behavior, permitted signal sources, and excluded capabilities. Establish qualitative acceptance scenarios and the owner of relevance evaluation before introducing numeric targets. If notifications, remote inference, archives, or telemetry are excluded, document and enforce that boundary rather than treating them as tacitly approved.

## 4. Missing Decisions

This is the exhaustive blocker set for this review. Related questions are grouped to avoid presenting every future product gap as a separate gate.

| ID | Required decision | Decision owners | Closure evidence |
|---|---|---|---|
| R1 | Meaning of Strength; separation of observed input, interpretation confidence, specificity, and confirmation | Product + V2 architecture | Consistent glossary across the decisions and contract; explicit/ambiguous examples. |
| R2 | Scope/revision of confirmation; correction, rejection, revocation, saving, and concurrent-result authority | Product + V2 architecture | Confirmation and permission rules with stale-answer and saved-draft examples. |
| R3 | Complete lifecycle and separate validity of goal, context, offer, match, and retained record | Product + V2 architecture | Conceptual transition table with actors, evidence, invalid transitions, and no-match outcome. |
| R4 | Context precedence, freshness, essential/optional signals, session and task scope | Product + V2 architecture | Conflict/fallback rules including manual destination, GPS, denied permission, and changed time. |
| R5 | Processing, retention, deletion, archive exceptions, and consent withdrawal | Product + privacy owner + V2 architecture | Approved purpose/retention policy or explicit exclusion of durable storage and archive. |
| R6 | Explicit sensitive content and third-party/model processing boundaries | Privacy owner + V2 architecture | Allowed/prohibited processing examples and approved local/external-processing boundary. |
| R7 | Required matching semantics, supported evidence, constraints, capability claims, and fallback | Product + V1 data owner + V2 architecture | Conceptual input/output obligations and supported claims; unsupported concepts remain unknown. |
| R8 | V1/V2 ownership and integration direction; existing parser/directory compatibility | V1 architecture + V2 architecture | Responsibility and data-flow decision consistent with existing boundaries, or separately approved change. |
| R9 | First implementation slice, asking limits, exclusions, and evaluation gate | Product + review owner | Explicit scope and acceptance scenarios, reviewed before implementation permission. |

No arbitrary retention duration, confidence threshold, cooldown, provider permission, or success percentage is chosen here. These require owner decisions. Exact database design, API paths, or migrations are not prerequisites for closing this semantic gate.

## 5. Implementation Readiness

**Selected: C) Needs architectural changes.** A is rejected because activation authority and data lifetime remain ambiguous. B is rejected because the gaps concern ownership and state semantics, not just minor UX settings.

The contract is ready for revision and another architecture gate. It is not ready to authorize production integration or even a general Intent Layer implementation. An explicitly bounded first slice could avoid some future dependencies, but that exclusion must be reviewed; this report does not grant a prototype exception.

Passing this gate later requires closure of R1–R9 for the declared slice, consistency with the approved decisions, review of affected V1 boundaries, and explicit product authorization to proceed. There is no need to finish future storefront, messaging, AR, or sponsored-placement design to approve a slice that excludes them.

Validation performed: read the contract and preceding decisions at the pinned baseline; compared the V1/V2 architecture and integration responsibilities; inspected existing directory and parser/resolver boundaries to check integration assumptions. Graphify source references supported navigation; its CLI could not run in this environment, so the existing graph and source documents were read directly. Graph output was not regenerated. No runtime tests were run: Stage 2's earlier test results cannot establish this contract's semantic readiness.

## 6. Required Changes Before Coding

1. Resolve R1–R3 in the decision and contract documents: terminology, confirmation authority, and lifecycle semantics. Reconcile the changed definition of Strength with the already approved decisions explicitly.
2. Resolve R4–R6 with product and privacy owners: context conflicts, expiry/retention, and processing boundaries. Name exclusions where capabilities are deferred.
3. Resolve R7–R8 with V1/V2 owners: supported capability evidence, exact responsibilities, one-way data flow, and treatment of existing parser outputs. Do not change the protected integration contract as an incidental review fix.
4. Resolve R9 by defining the first slice and its acceptance criteria; update the open-decision register and roadmap as a separately authorized documentation revision.
5. Re-run the architecture gate against the revised, pinned document set. Only subsequent explicit authorization can start implementation.

The revised prose must give an unambiguous outcome for these review scenarios; these are acceptance examples, not code tests or newly approved product behavior:

| Scenario | Required property to demonstrate |
|---|---|
| Repeated category views create very high hypothesis confidence | No Active Intent or personalized business action without confirmation. |
| User says “shoes”; parser adds “running” | The added constraint is not implicitly confirmed by the original words. |
| User saves a draft hypothesis for later | Saving semantics cannot silently authorize active matching or reminders. |
| User corrects a goal while an old result is pending | Old confirmation and late results cannot override the correction. |
| Last eligible offer expires | Distinguish stale candidate evidence from the user's still-valid goal; explain no match. |
| GPS disagrees with a manually chosen destination | Follow an approved context-precedence rule rather than silently switching the task. |
| Location permission is denied | Preserve user agency with the defined manual path or explain which part cannot proceed. |
| User requests a dental service or a low-priced product | Do not derive a medical condition or financial status; apply the approved raw-text processing rules. |
| Capability evidence is stale or stock is unknown | Do not claim current availability; preserve hard constraints and explain uncertainty. |
| User rejects, revokes, deletes, or lets an intent expire | Stop use and invalidate downstream authority under the approved retention policy. |
| V1 is unavailable or a business offers broad promotion | Do not fabricate capability, export intent through a new write path, or bypass confirmation. |
| A detail is opened, a business is shared, or navigation starts | No inferred purchase, visit, satisfaction, or completed goal; outcome learning stays within consent. |

Final assessment: preserve the user-owned intent direction, but close the semantic authority and lifecycle gaps before they become expensive implementation assumptions.

من استرا هستم

[C1]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L24
[C2]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L50
[C3]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L76
[C4]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L100
[C5]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L125
[C6]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L138
[C7]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L161
[C8]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L179
[C9]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DATA_CONTRACT.md#L192
[D2]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DECISIONS.md#L30
[D3]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DECISIONS.md#L61
[Outcome]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/HANDOFF/20260910_V2_REVIEW/INTENT_CONTEXT_DECISIONS.md#L174
[A1]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/01_ARCHITECTURE_PRINCIPLES.md#L5
[Integration]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md#L3
[Responsibilities]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md#L62
[Directory]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/app/src/directory/contract.ts
[Resolver]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/app/src/matching/llm/LlmIntentParser.ts
[Open]: https://github.com/aminansaricom-bot/mlino_3-sep/blob/704aadc2ceba9bd79b1c748da8688ef53eded3c5/mlino2/OPEN_DECISIONS.md
