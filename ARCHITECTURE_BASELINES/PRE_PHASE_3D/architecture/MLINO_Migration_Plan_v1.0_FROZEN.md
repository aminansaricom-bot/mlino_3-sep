# MLINO Migration Plan v1.0 (Frozen)

**Status:** Frozen — part of the official architecture package, alongside
Kernel Architecture Specification v1.2, Capability Map v1.0, Interaction
Contracts v1.0, and the 11 Capability Specifications. Any change to this
document now requires a formal ADR, exactly like the documents it is based on.

**Basis:** this document introduces no new architecture. Every claim below
traces to Kernel Architecture v1.2 (Frozen), Capability Map v1.0 (Frozen),
the 11 Capability Specifications, Interaction Contracts v1.0 (Frozen), and
the completed Migration Analysis (codebase-driven) and Implementation
Backlog v1.0. Where those documents are silent, this one is silent too.

---

## 1. Migration Philosophy

**Evolution, not rewrite.** The frozen architecture defines a target state;
it does not mandate how an existing system reaches it. The Malino codebase
already implements a meaningful share of MLINO's Capability *behavior*
(tenant-scoped decision/execution separation, soft-state fields, an
informal RTBF-adjacent pattern) without its Capability *architecture*. The
migration's job is to add the missing architectural scaffolding — Self-
Critique gating, decision referability, access-checked narration, a Consent
record — around what already works, not to replace it.

**Preserve the existing revenue-generating system.** Malino is production
software with real clinics, real licenses, real Telegram-connected
managers. No task in this plan touches licensing, authentication, affiliate
logic, or any user-facing frontend. This is a stated constraint carried
forward from the Migration Analysis and Implementation Backlog, not a new
decision.

**Add MLINO architecture incrementally.** Every task in the Implementation
Backlog is independently shippable and additive: new tables, new functions,
and narrow insertions into two existing call sites (`managerAssistant.js`'s
tool-call loop, `notify.js`'s send loop). Nothing is deleted or replaced
until the final rollout stage, and even then only a call path is redirected,
not rewritten.

**Minimize production risk.** Sequencing follows the Implementation
Backlog's dependency graph, which was built specifically to allow the
lowest-risk, most isolated changes (Milestone 1) to ship alone, before any
change touches the assistant's decision-execution path.

---

## 2. Migration Stages

Three stages, matching the three Milestones already defined in the
Implementation Backlog:

- **Stage 1 (Milestone 1):** Governance access-check wired into the
  existing notification path. Two tasks, one new file, one modified file,
  zero database migrations.
- **Stage 2 (Milestone 2):** Decision Support/Action & Execution gating —
  Self-Critique and `decision_id` referability wired into the existing
  assistant tool-calling loop.
- **Stage 3 (Milestone 3):** Hardening — idempotency and the optional
  Telegram delivery-logging extension.

---

## 3. Reused / Wrapped / Extended / Added

**Reused as-is (no change):** `auth.js`, `jwt.js`, `requireLicense.js`,
`license.routes.js`, `pricing.js`, `affiliate.routes.js`, Affiliate/
Commission tables, `kiosk.routes.js`, `faceMatch.js`, all frontend files,
all 18 existing Prisma models' core structure, all 8 existing
`assistantTools.js` tool implementations' internal logic.

**Wrapped:** `executeTool()` in `assistantTools.js` — its existing 8 cases
are not modified internally; a guard clause is added in front of the
existing `switch` statement (Task B-04), and its call site in
`managerAssistant.js` is wrapped with a new gating step (Task B-03) rather
than having its internal control flow altered.

**Extended:** `notify.js`'s `notifyClinicManagers()` gains a filtering step
before its existing send loop (Task A-02). `me.routes.js` and
`users.routes.js`'s existing face-data-deletion code gains a logging call
in the same transaction (Task A-04). `telegram.js`'s `sendTelegramMessage()`
optionally gains logging (Task C-01), mirroring the existing `SmsLog`
pattern rather than inventing a new one.

**Added (net-new):** `src/lib/accessPolicy.js`, `src/lib/selfCritique.js`,
`ConsentLog` table, `Decision` table, optionally `TelegramLog` table.

---

## 4. Implementation Sequence

Derived directly from the Implementation Backlog's dependency graph:

```
Epic A (Governance):   A-01 → A-02          A-03 → A-04
Epic B (Decision):     B-01 → B-02 → B-03 → B-04 → B-05
Epic C (Hardening):    C-01 (follows A-02, not hard-blocked)
```

Epic A and Epic B share no files and no dependencies and can run fully in
parallel. Epic B's chain (B-01 through B-05) is the critical path. With two
developers working both epics simultaneously, total elapsed sequence length
is bounded by Epic B alone.

---

## 5. Implementation Backlog Summary

| Epic | Tasks | New tables | Files modified | Files added |
|---|---|---|---|---|
| A — Governance Foundation | A-01–A-04 | `ConsentLog` | `notify.js`, `me.routes.js`, `users.routes.js` | `accessPolicy.js` |
| B — Decision Pipeline | B-01–B-05 | `Decision` | `managerAssistant.js`, `assistantTools.js` | `selfCritique.js` |
| C — Hardening (optional) | C-01 | `TelegramLog` | `telegram.js` | — |

Full task-level detail (objectives, acceptance criteria, complexity,
duration, risks) is defined in Implementation Backlog v1.0 and is not
repeated here; this document references it as the authoritative source for
task-level execution.

---

## 6. Milestones

- **Milestone 1 — Smallest Production-Ready Increment:** Epic A Tasks
  A-01–A-02. Closes Interaction Contract IC-06 in isolation.
- **Milestone 2 — First AI Business Partner:** Epic B complete (B-01–B-05).
  Closes IC-04 and IC-05/AC-4 for the live assistant.
- **Milestone 3 — First Architecture-Compliant MLINO Release:** Epic A +
  Epic B + Epic C complete. Closes IC-04, IC-05, IC-06, IC-09, and §16 for
  the production system, unchanged in every user-facing respect.

---

## 7. Production Rollout Strategy

Each Milestone ships independently, in stage order, following the
Implementation Backlog's own acceptance criteria as the go/no-go gate per
task:

- **Stage 1:** deploy A-01/A-02 behind no feature flag — the change is a
  pure filter on an existing send path; a manager who now doesn't receive a
  notification is the only observable behavior change, and it is the
  intended one (access-gating a previously ungated path).
- **Stage 2:** deploy B-01–B-02 (schema + Self-Critique function) with the
  gate *not yet wired in* — this validates the new tables and logic against
  production data shape with zero behavior change. Only after that
  validation window, deploy B-03–B-04 (the actual wiring), which is the one
  stage with real behavior change (rejected tool calls become visible to
  managers). B-05 (idempotency) follows once B-04 is stable.
- **Stage 3:** deploy C-01 independently at any point after Stage 1.

No stage requires downtime; all changes are additive schema migrations plus
narrow code insertions at two call sites.

---

## 8. Rollback Strategy

Because every task is additive and wraps rather than replaces existing
logic, rollback is symmetric to rollout:

- **Stage 1:** revert A-02's filter insertion — `notify.js` returns to
  unconditional sending. `accessPolicy.js` can remain deployed but unused;
  no data loss.
- **Stage 2:** revert B-03's wiring in `managerAssistant.js` first — this
  alone restores the pre-migration behavior (tool calls execute
  immediately again), while B-04's guard clause in `executeTool()` can stay
  in place harmlessly if B-03 no longer calls it with a `decisionId`
  ambiguity risk; if full rollback is required, revert B-04 as well. The
  `Decision` table is never read by any other part of the system, so it can
  be left in place, unused, without further action.
- **Stage 3:** revert C-01's logging call; `TelegramLog` table can remain,
  unused.

No stage's rollback requires a database migration to be reversed — every
new table can be safely left in an unused state if its wiring is reverted,
since no existing table or existing code path outside the newly-added
insertions ever depends on the new tables' existence.

---

## 9. Migration Risks and Mitigations

Carried forward from the Implementation Backlog, consolidated:

- **Self-Critique implemented as a rubber stamp** (always-pass). Mitigation: B-02's acceptance criteria explicitly require both pass and reject test cases per destructive tool; code review must verify reject paths are real, not decorative.
- **`decision_id` added but not enforced.** Mitigation: B-04 enforces the check inside `executeTool()` itself, not only at the caller in `managerAssistant.js` — so no future code path can bypass it by calling `executeTool()` directly.
- **Consent table recorded but never consulted.** Mitigation: explicitly out of Stage 1–3 scope to *consult* `ConsentLog` for authorization decisions; this plan only commits to *recording* consent-relevant events accurately (Task A-04). Using `ConsentLog` as an active authorization input is future work, not claimed as done by this plan.
- **Access-check too strict, silently dropping legitimate notifications.** Mitigation: A-02 requires every denial to be logged with a reason, per its acceptance criteria.
- **Partial failure during consent-logging transaction** (data deleted but not logged, or vice versa). Mitigation: A-04 requires the log write and the existing deletion write to occur in the same DB transaction.

---

## 10. How Existing Malino Modules Become MLINO Capabilities

This is a mapping, not a rewrite plan — each existing module's *behavior*
already approximates a Capability's responsibility; the migration adds the
specific architectural contract each Capability requires, per Interaction
Contracts v1.0:

- `assistantTools.js` + `managerAssistant.js` → **Capability 6 (Decision
  Support & Recommendation)** and **Capability 9 (Action & Execution)**,
  once B-01–B-05 add the `Decision` artifact and Self-Critique gate IC-04/
  IC-05 require. The existing tool-selection/execution separation is
  already structurally correct; it becomes Capability-compliant, not
  Capability-shaped for the first time.
- `notify.js` + `telegram.js` → **Capability 7 (Communication &
  Narrative)**, once A-01–A-02 add the access-check IC-06 requires.
- `auth.js`, `requireLicense.js`, and the new `ConsentLog`/`accessPolicy.js`
  together → **Capability 11 (Trust, Explainability & Governance)**. The
  existing tenant-isolation discipline already matches the Kernel's
  least-privilege principle (§18); this migration adds the Consent-adjacent
  record-keeping piece that was previously informal.
- The 18 existing Prisma tables, collectively → the eventual Projection
  layer for **Capability 1 (Memory & Knowledge)**, per the Migration
  Analysis's finding that most tables already carry soft-state fields
  compatible with that role. **No Event Log migration is included in this
  plan** — Capabilities 1, 2, 3, and 10 (Memory & Knowledge, Domain
  Adaptation, Reasoning, Learning & Feedback) remain unaddressed by the
  Implementation Backlog and this plan; they are out of scope for the three
  Milestones defined here and require a future, separately-scoped
  migration stage.

---

## 11. Current System / Transitional System / Final MLINO Architecture

- **Current System:** Malino as audited in the Migration Analysis — tenant-
  scoped, decision/execution-separated, but with no `decision_id`, no
  Self-Critique, no access-gated narration, no Consent record. This is the
  system in production today.
- **Transitional System:** the state after Milestones 1–3 are complete.
  Capabilities 6, 7, 9, and 11 are Interaction-Contract-compliant for the
  live assistant and notification paths. Capabilities 1, 2, 3, and 10 are
  still not implemented — this is an intentionally incomplete, stable,
  production-safe intermediate state, not a defect.
- **Final MLINO Architecture:** the full 11-Capability system (9 non-
  Deferred Capabilities implemented; 2 Deferred Capabilities remain
  undesigned by explicit project decision, see §12). Reaching this state
  requires the Event Log/Domain Adaptation/Reasoning/Learning & Feedback
  work that this plan explicitly does not schedule or scope.

---

## 12. Deferred Capabilities Remain Outside Migration Scope

**Prediction & Simulation** and **Goal Alignment & Strategy** are Deferred
in Capability Map v1.0, with no defined Purpose, Responsibilities, Owned
Concepts, Events, or Dependencies in the Kernel. No task in the
Implementation Backlog, no stage in this migration plan, and no future
extension of this plan implicitly authorizes designing or implementing
either Capability. Any future work on them requires a separate ADR
activating them, exactly as stated in Capability Map v1.0 and Interaction
Contracts v1.0.

---

## 13. Document Basis

This document references only frozen documents: Kernel Architecture
Specification v1.2 (Frozen), Capability Map v1.0 (Frozen), the 11
Capability Specifications, Interaction Contracts v1.0 (Frozen), the
codebase-driven Migration Analysis (Migration Plan v2), and Implementation
Backlog v1.0. It modifies none of them and introduces no new architectural
concept, principle, invariant, constraint, capability, or ownership rule.
