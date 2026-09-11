# MLINO V2 — Mamad Task Catalog

Date: 2026-09-10  
Contributor: Mamad — GLM 5.3 Flash  
Owner/reviewer: Codex  
Status: **Catalog only; no task is assigned by this document**

Only Codex may assign a catalog item. Each item is intentionally narrow, reversible and reviewable. Expected paths are examples; the exact file list is set in the assignment message.

## A) Codex-only tasks

These tasks are reserved for Codex and must not be assigned to Mamad:

- Core architecture, ownership and product decisions;
- Intent representation, interpretation revision and confirmation;
- Permission, Consent, session lifecycle, memory and disposal;
- Experience orchestration, Assistant authority and routing;
- Matching eligibility, deterministic ordering, offer and evidence policy;
- V1/V2 contracts, data ownership, live adapters and integration;
- security/privacy decisions, telemetry, persistent memory and outcome/learning paths;
- AR, Virtual Storefront, Marketplace, module actions and Production integrations;
- integration review, final validation, commit, Push and delivery status.

## B) Mamad-safe tasks

### MAMAD-UI-01 — Presentation component preparation

**Description:** Prepare a small presentational component or adapt an existing card/sheet to receive explicit props and emit callbacks. It may render labels, explanations, loading, empty or unsupported states.

**Objective:** Produce a reusable presentation seam for already-approved state without owning state, authority or business logic.

**Context:** The Local Discovery experience renders V2-owned interaction over Core-controlled session state and V1-owned evidence.

**Constraints:** Props and callbacks only; no matching, storage, provider calls, routes, product decisions or unsupported business claims.

**Why safe to delegate:** The component has no authority, matching, storage, provider or business-truth responsibility. It can be reviewed through props and visual tests.

**Dependencies:** Approved experience state/props from Codex; existing React/TypeScript conventions.

**Expected output:** Focused component change, local tests or a visual acceptance note, and no new state ownership.

**Review requirements:** Codex verifies prop boundaries, no legacy side effects, accessibility, mobile/desktop behavior and no product semantics were invented.

**Validation checklist:** Component tests or visual checks pass; keyboard/focus behavior is checked; no storage/network side effect exists; changed paths match the assignment.

### MAMAD-UI-02 — Accessibility and styling pass

**Description:** Improve labels, focus order, keyboard behavior, contrast, responsive spacing and state presentation for an already-defined Local Discovery surface.

**Objective:** Improve accessibility and visual clarity without altering the experience state machine or available business actions.

**Context:** The surface must work without chat or map tiles and must show only approved states and evidence.

**Constraints:** Presentation/style files only; no new controls, matching logic, lifecycle changes, persistence or product copy decisions.

**Why safe to delegate:** It changes presentation quality without changing matching, Intent, lifecycle or V1 data.

**Dependencies:** Existing component and approved copy/states; no new behavior.

**Expected output:** Focused style/accessibility diff and a checklist of manual observations.

**Review requirements:** No new controls with business actions; no copy that asserts unsupported availability, discounts or outcomes; Codex checks visual regression.

**Validation checklist:** Desktop/mobile review, keyboard navigation, focus order, accessible names, contrast and relevant build/test checks are recorded.

### MAMAD-DOC-01 — Documentation cleanup

**Description:** Fix broken relative links, headings, terminology drift, duplicated wording or formatting in an explicitly named V2 review document.

**Objective:** Make an assigned document easier to navigate without changing its decision content.

**Context:** Approved architecture documents distinguish current decisions from historical reviews and pending future gates.

**Constraints:** Named Markdown files only; preserve history, scope exclusions, ownership wording and status meaning; no new product decision.

**Why safe to delegate:** It does not change runtime behavior when limited to editorial corrections.

**Dependencies:** Codex identifies the authoritative document and wording; approved architecture remains source of truth.

**Expected output:** Documentation-only diff and a link/heading verification report.

**Review requirements:** No decision is changed silently; historical status remains history; no new product or architecture claim is introduced.

**Validation checklist:** Relative links resolve, headings are coherent, conflict markers are absent and the diff is documentation-only.

### MAMAD-TEST-01 — Pure utility and boundary tests

**Description:** Add tests for already-defined pure helpers or an explicitly supplied reducer/policy. Examples include date boundary validation, deterministic ordering, evidence predicates and state-transition rejection.

**Objective:** Increase regression coverage for a contract Codex has already supplied.

**Context:** Tests may cover authority barriers, deterministic policies or evidence boundaries, but they do not define those policies.

**Constraints:** Test files and local fixtures only unless Codex says otherwise; no production implementation edits, network, external model, GPS, secrets or new behavior.

**Why safe to delegate:** Tests can expose behavior without owning the behavior or redefining its contract.

**Dependencies:** Codex supplies the existing contract and target module; no new implementation semantics.

**Expected output:** Focused tests, fixtures local to the test, and test command/results.

**Review requirements:** Codex verifies tests do not encode a new product decision, rely on network/time nondeterminism or weaken privacy boundaries.

**Validation checklist:** Tests are deterministic, fail for the targeted forbidden behavior where practical, pass with the existing command and report unrelated failures without hiding them.

### MAMAD-DATA-01 — Mock fixture preparation

**Description:** Add or correct deterministic experimental fixtures using the existing Business Directory `draft-1` contract, including valid, empty, unsupported and false combined-product cases.

**Objective:** Supply reviewable test data for already-approved matching scenarios.

**Context:** V2 reads a mock Directory projection; V1 remains the owner of business truth and the existing record contract.

**Constraints:** Existing fields only; no schema fields, personal/live data, implied stock, product-offer applicability or contract changes.

**Why safe to delegate:** Fixtures are test data and do not become V1 truth or production data.

**Dependencies:** Existing contract and scenarios approved by Codex.

**Expected output:** Fixture-only diff and a table mapping each fixture to its expected test scenario.

**Review requirements:** No new fields, schema, live data, personal data, implied stock or product-offer applicability. Codex checks source scope and labels.

**Validation checklist:** Existing validator accepts fixtures, each case has an expected scenario, IDs are deterministic and unknown evidence remains unknown.

### MAMAD-UTIL-01 — Non-critical pure utility

**Description:** Implement a small pure formatter or display helper whose input/output contract is already specified, such as distance/label formatting or evidence-scope text.

**Objective:** Extract a narrowly specified deterministic helper without moving product authority into a utility.

**Context:** The helper supports Local Discovery presentation or validation and receives all required values as arguments.

**Constraints:** Pure code only; no React state, storage, network, global clock, environment secrets, ranking, consent, lifecycle or offer eligibility.

**Why safe to delegate:** Pure deterministic code has no authority, data ownership or orchestration side effects.

**Dependencies:** Existing types and approved output wording.

**Expected output:** Utility, focused tests and a short usage note.

**Review requirements:** No ranking, Intent, consent, lifecycle, offer eligibility or business truth is placed in the utility.

**Validation checklist:** Contract examples and edge cases pass; no side effects exist; typecheck/tests cover the assigned helper only.

### MAMAD-TOOL-01 — Developer tooling and validation

**Description:** Add or refine a local validation command, fixture checker, link checker or diff-scope helper that does not run in the product.

**Objective:** Improve local review feedback without becoming a deployment or delivery authority.

**Context:** The tool supports V2 documentation, fixture and protected-scope checks in a developer environment.

**Constraints:** No network upload, secret access, destructive defaults, source auto-rewrite, commit, Push or deployment.

**Why safe to delegate:** It supports review and delivery without changing runtime architecture.

**Dependencies:** Existing package/tooling conventions and Codex-approved command scope.

**Expected output:** Tooling-only diff, usage documentation and sample output.

**Review requirements:** No destructive defaults, network upload, secret access, production deployment or automatic commit/Push.

**Validation checklist:** Safe on clean and dirty trees, clear exit behavior, documented usage, no source mutation and sample output are verified.

## Common review gate

Every delegated result must pass:

1. Scope is limited to the assigned task and paths.
2. No architecture, contract, ownership or product decision changed.
3. No prohibited storage, network, provider or V1 write was introduced.
4. Existing tests and relevant new checks pass.
5. The diff is understandable and reversible.
6. Codex has reviewed the exact diff before integration.

من کدکس هستم
