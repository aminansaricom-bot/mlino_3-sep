# ADR-00X: Human Authorization Boundary

**Status:** Proposed Governance Extension
**Scope:** Additive Governance Layer
**Kernel Impact:** No Kernel Revision Required
**Relation:** Applies to Kernel Architecture Specification v1.2

**Governance Status:** Approved / Frozen
**Owners:** AI Governance
**Decision Category:** AI Governance / Authorization
**Supersedes:** None
**Superseded by:** None

---

## Context

MLINO requires a technology-independent architectural boundary that defines who has authority to approve AI-generated actions, regardless of future increases in AI capability.

MLINO's core philosophy follows the chain: Goal → Alignment Engine → Role-specific Actions → Human Authorization → Execution → Learning. As AI models become more capable over time, the risk exists that architectural boundaries defined around current AI *capability* would erode or require constant redefinition. This ADR establishes authority — not capability — as the stable boundary that governs whether an AI-generated action may take effect.

---

## Decision

No AI-generated action may modify external state without explicit authorization from an authorized human actor.

External state is any persistent or observable change outside MLINO's internal recommendation lifecycle that affects users, integrated systems, business records, or real-world operations.

An authorized human actor must be a natural person taking a real-time affirmative action. A rule, policy, or automated agent never qualifies as the authorizing party, regardless of who configured it.

The architectural boundary is defined by authority, not by AI capability.

Authorization requires an affirmative act specific to the action being authorized. Silence, timeout, inactivity, pre-selected approval states, and bundled or general-purpose confirmations covering multiple unrelated decisions never constitute authorization.

Authorization is meaningful only when provenance allows a human actor with no prior context to determine, from the explanation alone, what real-world inputs led to the action — not merely that a transformation occurred. Any Explainability Architecture this principle relies on must satisfy this minimum at least.

Authorization authority must itself be established through human-defined governance and may never be assigned dynamically by AI.

Which human actor is authorized for which action type is a policy decision, but that determination must itself be fixed by human-defined policy — never inferred or dynamically assigned by the AI system.

Authorization may be per-action (v1 default) or scoped, revocable pre-authorization for narrowly-defined action types (future decision, not applicable to v1).

---

## V1 Implementation Policy

Default authorization model: per-action approval, by the role recipient the action was generated for.

Every AI-generated action remains a recommendation until explicitly approved or manually executed by the authorized actor.

Automatic execution does not exist in v1.

---

## Consequences

### Positive
- Preserves human control.
- Technology-independent.
- Supports future AI capability growth without changing the principle.
- Compatible with Explainability and Self-Critique.

### Negative
- Adds approval friction.
- Requires clear provenance.
- Future automation requires explicit policy decisions.

---

## Deferred Decisions

- Scoped pre-authorization.
- Role-specific authorization policies.
- Approval workflows.
- Limited automation.

---

## Governance Layer Note

This document formalizes ADR-00X as an **additive Governance Extension** relative to Kernel Architecture Specification v1.2. The Kernel Governance Compliance Audit (see `Kernel-v1.2-Governance-Compliance-Audit.md`) found that the Kernel's AC-4 rule requires an automated action to carry a traceable `decision_id`, but never requires — nor forbids — a human affirmative act as the source of that decision. This is a Compliance Gap, not a Conflict: the Kernel is silent, not contradictory. ADR-00X closes that gap additively, without any revision to the frozen Kernel text.
