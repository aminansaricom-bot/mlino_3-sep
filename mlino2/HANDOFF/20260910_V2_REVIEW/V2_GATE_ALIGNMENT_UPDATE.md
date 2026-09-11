# MLINO V2 — Gate Alignment Update

Date: 2026-09-10
Author: Codex, Documentation Architect
Tracked baseline: `295d772a91bcd2197dbe3b9520f83c84b9f075b9`
Branch: `astra/visual-system-local-experience`
Source: [V2 Pre-Implementation Gate Review](V2_PRE_IMPLEMENTATION_GATE_REVIEW.md), R1–R4.

**Status: Documentation corrections applied; closure acceptance pending. Implementation is not authorized.**

The requested changes are applied in the actual Ownership, Orchestration, Memory, readiness and product records. This document provides their traceability. It does not replace the source review's historical C verdict with a new gate verdict, claim independent approval or validate runtime behavior.

## 1. Canonical Gate Numbering

| Canonical gate | Meaning | Historical mapping |
|---|---|---|
| CG-1 | Core / V1 / V2 responsibility boundary | Responsibility part of historical CG-1. |
| CG-2 | Assistant permission, consent and memory boundary | Authority part of historical CG-1, all historical CG-2 orchestration/active-use requirements, and historical CG-3 memory requirements. |
| CG-3 | Initial implementation scope | Previously documented scope constraints, now explicitly named. This is not historical CG-3 memory. |

The current checklist, Book, Roadmap and Open Decisions use this numbering. Previous review reports remain unchanged as evidence of their own baselines. Historical product-register sections are explicitly labeled; no old obligation is deleted by renaming.

## 2. Responsibility Boundaries

| Responsibility | Owner and boundary |
|---|---|
| Intent, Permission, Consent, Session lifecycle, Experience orchestration, Routing | MLINO Core owns the shared mechanisms and enforcement policy. The user owns Intent meaning and grants consent; Core/Assistant do not self-grant rights or replace existing V1 Governance. |
| Business truth, Capability, Evidence, Availability, Recommendations, Actions, Learning | V1 and its existing business/domain/governance owners remain authoritative. Availability must be evidenced; a listing flag is not stock/opening status. Business Recommendations/Actions/Learning are not V2 relevance, local navigation or task completion. |
| Matching, Experience, Interaction | V2 owns user relevance, experience selection/presentation and interaction within Core's shared constraints; it consumes business evidence read-only. |
| Domain modules | Providers retain their domain data, rules, capabilities and authorized actions under V1/domain governance. Core coordination does not copy their intelligence. No module integration is enabled in the initial slice. |

These describe responsibilities in the existing platform, not new services or a transfer of V1 authority. The Assistant is not a business logic owner; it cannot create capabilities or facts, bypass permissions, or use role selection, screen context or provider text as access authority.

Core's ownership of the Intent mechanism is stewardship; it does not own the user's goal. Permission/Consent policy ownership means enforcing the user's choice and existing authority, not creating permission. V1 remains part of the platform and is not displaced by a second “Core” business OS.

V1 business recommendations and actions remain governed domain outputs. V2 relevance and the local Open Business Details interaction do not create a second business recommendation/action authority. No business Outcome or Learning is inferred from viewing a result.

The current integration remains read-only consumption through the existing Business Directory boundary with mock evidence. Source fields do not become live truth through presentation.

## 3. Assistant Restrictions and Processing Order

Assistant:

- is not the business logic owner;
- cannot create capabilities or facts;
- cannot bypass permissions, consent or eligibility;
- cannot obtain access from a selected role, current screen or provider/business text;
- cannot turn a routing suggestion into module execution authority;
- cannot convert permission, confidence, an answer or a visibility event into confirmed Intent;
- cannot start module, external-model, AR or persistent-memory functionality through a fallback.

```text
Permission
  → Consent
  → Intent interpretation / minimal clarification
  → User confirmation of the exact current interpretation revision
  → Matching: eligibility before ranking
  → Experience
  → User-controlled Open Business Details
```

Permission means checking that the requested local operation and data use are allowed within the approved scope and existing access authority. Consent is the user's explicit, informed agreement to this local purpose and session lifetime before task text/signals are captured or interpreted. This names two checks within the existing processing boundary; it creates no permission entity, API, live V1 dependency or requirement for two separate dialogs. A selected role is presentation context only. Consent cannot authorize an excluded capability, and neither permission nor consent replaces the user's confirmation of the exact interpretation revision. Denial leaves ordinary browsing available without Intent capture.

The user's requested Permission → Consent → Interpretation → Matching → Experience sequence is therefore retained, with the already approved exact-revision confirmation explicitly shown at the Matching boundary. Confidence remains separate from confirmation. The permission/consent checks apply to capture and interpretation, not merely to result display.

Context supplies allowed constraints and explicitly confirmed preferences. One qualifying option must meet all mandatory conditions before a business can be ranked. Neither business payment nor an optional offer creates relevance.

## 4. Session Memory and Orchestration

Current authority is [Intent Redesign §6.2](INTENT_CONTEXT_CONTRACT_REDESIGN.md#62-data-handling-and-retention-decisions) and [Intent Finalization §2.4](INTENT_CONTEXT_FINALIZATION.md#24-when-confirmation-is-required-again), now explicit in [Assistant Memory §4.4](ASSISTANT_MEMORY_BOUNDARY_DECISION.md#44-current-session-cleanup-and-disposal).

- Keep only necessary current working wording, current constraints, permitted context, revision/confirmation and current Experience state.
- Replace wording on correction; discard superseded/rejected content and obsolete dependent state. There is no replayable conversation or revision transcript.
- No transcript retention, even temporarily during one session. No persistent personal audit exception, browser persistent storage, URL, cache, console/crash log, telemetry or outbound model/business/map path for task content.
- Hidden/background state pauses execution and display authority. Minimum current context may remain only within the original session clocks.
- The session ends at the earliest of stop/delete/withdrawal, task rejection/dismissal or explicit done, reload/navigation/tab close, 30 minutes without direct task interaction, or two hours after session start. Hidden time counts; only deliberate interaction resets inactivity; nothing extends the absolute cap.
- Disposal stops use and invalidates late results. A disposed task is never restored.
- Explicit Resume of an unexpired task rechecks consent, exact revision, context and evidence. A material change requires new confirmation; visibility alone cannot resume.

Orchestration §2 now distinguishes pre-confirmation phases from a selected business Experience without creating new entities. Asking returns to a visible interpretation revision, not automatic Matching. Presenting supports correction and honest no-match recovery. Completed is explicitly user-reported done. Offer/candidate invalidation affects dependent claims; it does not expire or fulfil the user's need.

## 5. Initial Scope and Future Dependencies

CG-3 remains **Intent-Guided Local Discovery**: local processing, one task/tab/session, manual context, mock Directory, eligibility before deterministic ordering, one qualifying option per business, 0–3 businesses, Open Business Details.

A product-discount requirement without option-level applicability evidence cannot pass; a business-level offer can be an incidental enhancement only at its evidenced scope. No combined-product match, fabricated stock/opening status, learned profile, paid ranking or forced result padding is allowed.

Live V1, new schemas/APIs, operational module integration, financial/business execution, production deployment, external LLM processing, GPS/passive context, new AR/Virtual Storefront, long-term memory, telemetry and outcome writeback remain excluded. Their missing contracts are future gates, not dependencies to implement the bounded mock slice.

## 6. Closure Evidence

“Applied” here means the requested documentation correction exists. Acceptance by the owner/reviewer and runtime conformance are separate.

| Review requirement | Applied correction | Primary evidence |
|---|---|---|
| R1 — Gate identity | Canonical names and historical crosswalk; no missing orchestration/memory obligation. | This §1; checklist §1; current Open Decisions register; current Book/Roadmap. |
| R2 — Authority alignment | Core mechanisms versus user meaning, V1 truth/governance and V2 relevance; Assistant restrictions; selected role/provider text grants no authority. | Ownership §§4–5; Orchestration §§3–4; this §2. |
| R3 — Processing and transitions | Permission/Consent before capture/interpretation; exact confirmation before Matching; correction, late-result, pause/resume, empty, candidate and explicit completion cases. | Orchestration §§1–2; checklist opening flow and §§2/6.2; this §3. |
| R4 — Memory precedence | Current-only context; discard old/rejected text; existing session caps and disposal; no transcript/audit exception. Future cleanup/audit proposals clearly scoped away. | Memory §§4.4/6/7; Orchestration §2.2; this §4. |

### Documentation acceptance scenarios

| Scenario from the review | Aligned expected behavior | Source |
|---|---|---|
| Finance role selection or provider instruction requests execution | No new rights/facts/capabilities; no privileged operation in the slice. | Ownership §§4–5; Orchestration §4. |
| User declines local processing | No capture/interpretation; ordinary browsing remains. | Orchestration §1 and entry row §2.1. |
| Consent granted but interpretation unconfirmed | Local clarification only within budget; no active Matching. | Orchestration §2.1 Discovering/Asking. |
| Material correction or clarification answer | Display changed revision, invalidate old results, require confirmation before Matching. | Orchestration §§2.1–2.2. |
| Clarification dismissed | Silence for that task; no repeated question or automatic broadening. | Orchestration §2.1 Asking. |
| Hidden then visible before expiry | Paused until explicit Resume and valid consent/revision/context/evidence checks. | Orchestration §2.1 Paused; Memory §4.4. |
| Withdrawal/end followed by a late result | Dispose and deny display/action. Fresh task needs applicable consent and confirmation. | Orchestration §2.2; Memory §4.4. |
| Inactivity, absolute cap or reload/tab close | Dispose; hidden time counts; no stored/restored Intent. | Memory §4.4. |
| Optional offer expiry | Remove enhancement; required-offer failure excludes candidate; user goal is independent. | Orchestration §2.2. |
| No match or details opened and returned | Honest result/inspection, never inferred completion; explicit done ends the task only. | Orchestration §2.1 Presenting/Acting/Completed. |

These are documented expectations, not claims that tests have passed or features exist. They provide a bounded basis for accepting the corrections.

## 7. Updated Documents and Status

- [MLINO Book](../../MLINO_BOOK.md): current responsibilities, flow, memory, scope and history precedence.
- [Roadmap](../../03_ROADMAP_PHASES.md): alignment completed; closure acceptance then separate implementation instruction; delivery checks remain later.
- [Open Decisions](../../OPEN_DECISIONS.md): normalized CG and current IR dispositions, historical numbering preserved.
- [Readiness Checklist](V2_IMPLEMENTATION_READINESS_CHECKLIST.md): documented corrections checked separately from unaccepted entry/implementation conditions.
- [Experience Orchestration](EXPERIENCE_ORCHESTRATION_DESIGN.md): processing order and actual authority/transition table corrected.
- [Assistant Ownership](ASSISTANT_OWNERSHIP_DECISION.md): authority boundaries and future module distinction corrected.
- [Assistant Memory](ASSISTANT_MEMORY_BOUNDARY_DECISION.md): cleanup/retention authority made explicit and future exceptions excluded.

The original [architecture review](V2_ARCHITECTURE_CLOSURE_REVIEW.md) and [pre-implementation review](V2_PRE_IMPLEMENTATION_GATE_REVIEW.md) retain their historical findings; this update records the response, not a rewrite of their verdicts.

No code, schema, API, migration, live integration, V1/frozen contract or implementation change is part of this update. Existing implementation HANDOFF_STATE is not relabeled as a new validated software delivery. No implementation starts until closure is accepted and the product owner separately instructs it.

من کدکس هستم
