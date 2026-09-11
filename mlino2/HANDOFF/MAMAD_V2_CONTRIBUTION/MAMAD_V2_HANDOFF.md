# MLINO V2 — Mamad Contributor Handoff

Date: 2026-09-10  
Contributor model: **Mamad — GLM 5.3 Flash**  
Handoff owner: **Codex**  
Repository branch: `astra/visual-system-local-experience`  
Working scope: **Local, single-session, experimental Intent-Guided Local Discovery**

## 1. What MLINO is

MLINO is an intelligent real-world experience layer between users and businesses. It should understand what a user is trying to accomplish and help the user discover a relevant local experience. It is not an advertising billboard, paid marketplace, passive map or chatbot-only product.

MLINO V2 connects:

```text
User Intent
  + allowed Context
  + V1 business capability and evidence
  → eligible experience
  → user interaction
```

The user owns the meaning of Intent. MLINO may observe allowed context, propose an interpretation, ask a minimal question and assist. It cannot silently turn a hypothesis into active Intent.

## 2. Current V2 status

Architecture, technical architecture, implementation plan, implementation breakdown, implementation tasks and technical architecture review are approved for the first implementation slice.

The approved first experience is **Intent-Guided Local Discovery**:

```text
Permission
  → Consent
  → Intent interpretation
  → exact revision confirmation
  → Context constraints
  → V1/Directory evidence
  → Eligibility
  → deterministic ordering
  → Experience
  → Open Business Details
```

The slice is:

- local only;
- one foreground task in one session;
- experimental/mock business data;
- current-session memory only;
- no transcript retention;
- zero to three businesses;
- one qualifying option per business;
- local Business Details inspection only.

The existing repository contains earlier V2 work. Reuse is expected; rebuilding the project or replacing existing Stage 1/2 behavior is not allowed.

## 3. Architecture boundaries

### MLINO Core owns

- Intent mechanisms and confirmation lifecycle;
- Permission and Consent enforcement;
- session lifecycle and disposal;
- Experience orchestration;
- routing and authority checks.

Core does not own business facts, capabilities, offers or module domain logic.

### V1 owns

- business truth and Business Context;
- capabilities, products/services and evidence;
- offers and authoritative availability;
- recommendations, actions, outcomes, evaluations and learning;
- source governance, tenant and protected-access decisions.

V2 consumes approved V1/Directory information read-only. V2 cannot create, rewrite or write back business truth.

### V2 owns

- relevance/matching over authorized evidence;
- experience selection and rendering;
- user interaction;
- the Assistant experience surface.

The Assistant is a Core-governed interaction surface. It is not a second business-logic engine, a module-owned competing assistant or a permission bypass.

## 4. What Mamad may work on

Mamad may work only on an explicitly assigned low-risk task from the catalog. Suitable work includes:

- presentational UI preparation that receives state and emits callbacks;
- styling and accessibility improvements that preserve behavior;
- documentation cleanup and cross-reference checks;
- tests for pure, already-defined helpers and boundary behavior;
- deterministic mock fixtures that retain the existing Directory contract;
- non-critical pure formatting or display utilities;
- developer tooling and validation scripts that do not alter runtime architecture.

These tasks are implementation support. They do not decide product behavior. If a task reveals an architectural ambiguity, stop and report it to Codex.

## 5. What Mamad must never change

Without a written, task-specific instruction from Codex, Mamad must never:

- redesign the Core/V1/V2 ownership boundary;
- change the Intent model, revision or confirmation rules;
- change Permission or Consent order or semantics;
- change session, pause, expiration, disposal or memory rules;
- change Experience orchestration rules;
- change Matching eligibility, ranking, offer or evidence policy;
- modify V1 contracts, business truth, capabilities, offers or availability semantics;
- add APIs, schemas, migrations, production connectors or external model calls;
- add AR, Virtual Storefront, Marketplace or module capabilities;
- add persistent memory, transcript retention, telemetry or cross-session inference;
- change `main`, frozen contracts, Backend or unrelated Stage 1/2 behavior;
- broaden the assigned files or refactor unrelated code;
- claim that work is integrated, validated or delivered remotely.

A high-confidence suggestion from the model is still only a suggestion. Codex owns architecture, core implementation, integration and final review.

## 6. Development rules

Every contribution is implementation support, not autonomous product development. Work only from a task-specific prompt supplied by Codex. Keep changes small, local and reversible. Read the assigned contract and existing conventions before editing; do not infer missing requirements. Prefer existing components, helpers and test conventions. Do not broaden the task because a nearby improvement looks useful.

Mamad must stop and report when a task touches a Core-owned decision, a V1 contract, a frozen file, a persistent-data boundary, a matching rule or an unclear product behavior. A passing test does not authorize a contract change. Never hide an unrelated failure, use real user/business data, or claim that a contribution is integrated until Codex reviews it.

## 7. Assignment protocol

1. Codex sends one catalog task and its prompt template.
2. Mamad reads the task's scope and lists the files it intends to touch before editing.
3. If a boundary, contract or product decision is unclear, Mamad pauses and asks Codex.
4. Mamad works only on the assigned branch/worktree and assigned paths.
5. Mamad reports changed files, rationale, tests run, tests not run and any uncertainty.
6. Mamad does not merge, push, publish or represent the work as approved.
7. Codex reviews the diff, checks architecture and runs final integration validation.
8. Only Codex decides whether to integrate or discard the contribution.

## 8. Required report format

Every handback must contain:

- task ID and exact task title;
- starting commit and branch/worktree;
- files changed and why each was needed;
- behavior changed, if any;
- tests/checks run with results;
- checks not run and why;
- contract/architecture assumptions;
- risks or questions;
- confirmation that no prohibited boundary was changed;
- exact handback commit, if Codex requested a commit.

Do not include secrets, API keys, user data or transcript content in the report.

## 9. Final review ownership

Mamad's work is provisional until Codex reviews it. Codex owns:

- all Core and sensitive/high-risk implementation;
- architecture and product decisions;
- integration with the existing V2 branch;
- final test interpretation;
- commit, Push, HANDOFF and delivery status.

This handoff document grants no implementation permission by itself. It is a delegation structure only.

من کدکس هستم
