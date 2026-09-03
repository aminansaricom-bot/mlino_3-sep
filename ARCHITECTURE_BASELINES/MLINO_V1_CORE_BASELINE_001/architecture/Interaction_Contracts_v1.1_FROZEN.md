# MLINO Interaction Contracts v1.1 (Frozen)

**Status:** Frozen — consumes the frozen Kernel Architecture Specification v1.3
and Capability Map v1.0. Nothing in this document alters any Invariant,
Constraint, ownership rule, Capability boundary, or Owned Concept. Where the
Kernel is silent at the *architectural* level (ownership, authority, new
responsibility), this document marks **GAP — ADR required** and stops,
rather than inventing architecture. Where the Kernel is silent only at the
*protocol/payload* level (exact event names, call shape, retry counts),
this document resolves it directly — this is explicitly permitted by the
Kernel itself (§4: naming is only mandatory where an Invariant requires it)
and by the prior phase's own scoping (`NEXT_PROMPT.md`).

**v1.1 (فاز ۳D):** افزودن IC-13 و IC-14، مصوب طبق ADR-00AC/00AD/00AE و
الحاقیه‌ی Kernel v1.3 (§۶، §۲۰). این افزونه خالصاً افزودنی است — هیچ‌یک از
IC-01 تا IC-12 تغییر نکرده‌اند. G3 (تولیدکننده‌ی Materiality) که پیش‌تر در
بخش «ADR Candidates» این سند به‌عنوان حل‌نشده فهرست شده بود، اکنون از طریق
ADR-00AD بسته شده است.

Capabilities 04 (Goal Alignment & Strategy) and 05 (Prediction & Simulation)
are Deferred with no defined behavior in the Kernel or Capability Map. No
Interaction Contract is produced for them. Their only documented tie
(Prediction & Simulation consumes Memory & Knowledge's Projection, §8,
inferred) remains exactly as GAP-marked as it is in the Capability Map — an
Interaction Contract cannot manufacture behavior for a Capability the
project has explicitly declined to design.

---

## Contract Index

| ID | Interaction | Producer | Consumer | Resolves |
|---|---|---|---|---|
| IC-01 | External event admission | Data Ingestion & Integration | Domain Adaptation & Semantic Translation | Kernel §7 |
| IC-02 | Event Log write | Domain Adaptation & Semantic Translation | Memory & Knowledge | Kernel §7, §8 |
| IC-03 | Identity correction | Reasoning & Causal Analysis | Domain Adaptation & Semantic Translation, Memory & Knowledge | Kernel §7, §15 |
| IC-04 | Decision self-critique | Decision Support & Recommendation | Trust, Explainability & Governance | Kernel §15 |
| IC-05 | Action execution reference | Action & Execution | Decision Support & Recommendation | AC-4 |
| IC-06 | Narrative access check | Communication & Narrative | Trust, Explainability & Governance | Kernel §15, §2 |
| IC-07 | Access policy evaluation | Trust, Explainability & Governance | Memory & Knowledge | Kernel §12 |
| IC-08 | RTBF notification | **NOT RESOLVED — see ADR Candidates (G4)** | | Kernel §13, Gap G4 |
| IC-09 | RTBF propagation | Trust, Explainability & Governance | Memory & Knowledge | Kernel §13 |
| IC-10 | Outcome comparison | Memory & Knowledge | Learning & Feedback | Kernel §6, §8 |
| IC-11 | Shared Connector infrastructure | Data Ingestion & Integration ↔ Action & Execution | (shared, non-deciding) | Kernel §14 |
| IC-12 | Consent event consumption | Trust, Explainability & Governance | Memory & Knowledge | Kernel §11 |
| IC-13 | Domain Signal Producer Event Candidate submission | Domain Signal Producer (Feature/Domain Pack layer) | Domain Adaptation & Semantic Translation → Memory & Knowledge | Kernel §6 (v1.3 amendment), §20 (v1.3 amendment), ADR-00AD |
| IC-14 | Role-aware Opportunity delivery | Memory & Knowledge (Projections) | Communication & Narrative | Kernel §8, §12; ADR-00AE |

---

## IC-01 — External Event Admission

1. **Purpose:** admit a raw external signal into the system as a candidate Business Event.
2. **Producer:** Data Ingestion & Integration.
3. **Consumer:** Domain Adaptation & Semantic Translation.
4. **Interaction Type:** Command (admission request) — synchronous within the ingestion pipeline; not a Business Event itself until admitted.
5. **Input schema:** `{connector_id, raw_payload, source_timestamp, sync_strategy: polling|webhook|cdc}` (Kernel §14, §16).
6. **Output schema:** `{admission_result: accepted|rejected, core_entity_refs[], candidate_semantics[]?}` (AC-1, §9). On rejection: routed to Observability, outside Kernel (§7).
7. **State transitions:** raw signal → (Admission Policy evaluated) → accepted (becomes Occurrence/Amendment/Retraction candidate) or rejected (not a Business Event, §7).
8. **Error cases:** authentication failure (repeated) → Circuit Breaker (§16); schema mismatch → health status `Schema Changed` (§14); stale data → health status `Delayed`/`Offline`, never silent (§16).
9. **Recovery strategy:** Retry with backoff per §16; idempotency via composite uniqueness key (source + source-scoped id + content hash, per §4).
10. **Dependencies:** Capability Map row 8 (Data Ingestion → Domain Adaptation, §7).
11. **Non-responsibilities:** Data Ingestion never decides Business Event validity (§7, owned by Domain Adaptation); never writes to the external system (§14, explicit).

**Ownership / Authority:** Data Ingestion owns the connector-produced signal until admission; Domain Adaptation owns the admission decision (AC-1) exclusively.
**Security assumption:** Connector credentials are managed outside Kernel scope (§21, Explicit Non-Goal — infra/hosting).
**Audit trail:** admission outcome must be traceable via Resolution Trace (§17) once accepted.

---

## IC-02 — Event Log Write

1. **Purpose:** persist an admitted Business Event as an immutable Event.
2. **Producer:** Domain Adaptation & Semantic Translation (post-admission).
3. **Consumer:** Memory & Knowledge.
4. **Interaction Type:** Event (Occurrence/Amendment/Retraction, per §4).
5. **Input schema:** the full mandatory Event structure (§4): unique id, type, Core entity ref(s), Event Time, Ingestion Time, source, `producer_type`, `kernel_version`, confidence level, domain tag, optional causal links.
6. **Output schema:** none returned to producer beyond write acknowledgment; Memory & Knowledge is the sole writer of the Event Log (§8).
7. **State transitions:** candidate Event → written to Event Log (permanent, INV-1) → triggers Projection generation/invalidation (§8).
8. **Error cases:** missing mandatory field → Event not accepted (§4, "هیچ Event بدون تمام فیلدهای بالا پذیرفته نمی‌شود" — hard rejection, no partial writes).
9. **Recovery strategy:** producer must resubmit a complete Event; no retry-with-patch semantics (Event immutability, INV-1).
10. **Dependencies:** Kernel §4, §7, §8.
11. **Non-responsibilities:** Memory & Knowledge never determines entity meaning (§9, owned by Domain Adaptation) and never decides access (AC-2, owned by Governance).

**Timing constraint:** Projection consistency is Eventual, not Strong (§8) — consumers (Reasoning, Learning, Narrative) must tolerate a bounded, implementation-defined lag, not assume immediate visibility.
**Data lifecycle:** Event Log entries are never deleted; Temporal Decay applies only to derived Projections (§8).

---

## IC-03 — Identity Correction

1. **Purpose:** resolve ambiguity Domain Adaptation left open at admission time (multiple semantic candidates).
2. **Producer:** Reasoning & Causal Analysis.
3. **Consumer:** Domain Adaptation & Semantic Translation (candidate source), Memory & Knowledge (Amendment target).
4. **Interaction Type:** Event (Amendment) referencing the original Event.
5. **Input schema:** `{original_event_id, chosen_candidate_ref, resolution_rationale}`.
6. **Output schema:** a new Amendment-type Event written via IC-02's contract (Memory & Knowledge is still the sole writer — Reasoning does not write the Event Log directly).
7. **State transitions:** ambiguous admission (multiple candidates recorded, §7) → Reasoning selects final candidate → Amendment Event recorded, never a direct edit of the original (INV-1).
8. **Error cases:** no valid candidate selectable → remains ambiguous; Reasoning does not invent a candidate (§15: "استدلال فقط از میان کاندیدهای معنایی تولیدشده انتخاب می‌کند").
9. **Recovery strategy:** N/A — absence of resolution is a valid terminal state, not a failure requiring retry.
10. **Dependencies:** Domain Adaptation (§15), Memory & Knowledge (via IC-02).
11. **Non-responsibilities:** Reasoning never generates new semantic candidates (§15, exclusive to Domain Adaptation).

**GAP note:** the exact Amendment event's field name for `resolution_rationale` and whether it must reuse the Resolution Trace format is not named by the Kernel beyond "the standard pattern, reused" (§17). This document resolves it here at protocol level: **reuse the Domain Adaptation Resolution Trace format verbatim** — this is explicitly invited by §17 ("الگوی مرجع ... تکرار نشود، استفاده‌ی مجدد شود"), not a new architecture.

---

## IC-04 — Decision Self-Critique

1. **Purpose:** mandatory governance review of every Decision/Recommendation before it becomes visible or actionable.
2. **Producer/Requester:** Decision Support & Recommendation.
3. **Consumer/Service:** Trust, Explainability & Governance (Self-Critique, a cross-cutting service it hosts per §15).
4. **Interaction Type:** Request/Response (synchronous within the decision-finalization path — this document resolves the sync/async question left open: **synchronous**, because AC-4 requires every downstream action to carry a referable `decision_id`, which cannot exist before the artifact is finalized).
5. **Input schema:** `{draft_decision, supporting_projection_refs[], confidence}`.
6. **Output schema:** `{verdict: pass|reject, critique_notes?}`. On `pass`, Decision Support finalizes the artifact and assigns the referable `decision_id` (AC-4).
7. **State transitions:** draft → self-critique → finalized (pass) or discarded (reject, never surfaced to Action & Execution or Communication & Narrative).
8. **Error cases:** Governance service unavailable → no fallback bypass permitted (§15 is a hard contract, not best-effort); draft remains unfinalized.
9. **Recovery strategy:** retry until Governance responds; a Decision/Recommendation artifact MUST NOT be finalized without a `pass` (no timeout-based auto-pass — this would violate §15's unconditional wording).
10. **Dependencies:** Capability Map row 6.
11. **Non-responsibilities:** Governance's Self-Critique service does not generate or improve the recommendation content itself — only accepts or rejects it (§15).

**GAP resolved at protocol level (G5, partial):** this document assigns the artifact type name `DecisionRecommendationArtifact` with field `decision_id` as the AC-4-mandated referable identifier. This is a naming choice within existing Owned Concepts (Decision Support already owns this artifact per §2.6) — not a new responsibility.

---

## IC-05 — Action Execution Reference

1. **Purpose:** every automated action on the outside world must be traceable to a specific finalized decision.
2. **Producer (requester):** Action & Execution.
3. **Consumer (reference target):** Decision Support & Recommendation's artifact (read-only lookup, not a live call).
4. **Interaction Type:** Query (validation that `decision_id` exists and is finalized) + Command (the action itself, executed against the external Connector).
5. **Input schema:** `{decision_id, action_payload}`.
6. **Output schema:** `{action_result: success|failure, external_ref?}`.
7. **State transitions:** decision exists & finalized → action attempted → outcome recorded (event name resolved below).
8. **Error cases:** `decision_id` missing or not finalized → action MUST NOT be attempted (AC-4, hard block); external write failure → retry per §16 with Circuit Breaker on repeated auth failure.
9. **Recovery strategy:** idempotent action execution via composite key (§16); no action is re-attempted blindly without idempotency protection.
10. **Dependencies:** AC-4; shared Connector infra (IC-11).
11. **Non-responsibilities:** Action & Execution never determines *what* to do — content comes entirely from the referenced Decision artifact (§14 Non-Responsibilities, inferred from AC-4).

**GAP resolved at protocol level (G5, remainder):** this document names the outcome event `ActionOutcomeRecorded {decision_id, action_id, result, timestamp}` — a naming choice, not new architecture, since Action & Execution already owns "write-risk decisions" (§2.9) and this is simply naming its output.

---

## IC-06 — Narrative Access Check

1. **Purpose:** ensure narrated content never exposes what the requester isn't authorized to see.
2. **Producer (requester):** Communication & Narrative.
3. **Consumer (authority):** Trust, Explainability & Governance.
4. **Interaction Type:** Query (access decision).
5. **Input schema:** `{requester_id, content_refs[]}`.
6. **Output schema:** `{authorized_refs[], denied_refs[]}`.
7. **State transitions:** raw content candidates → filtered by access decision → only authorized subset narrated.
8. **Error cases:** Governance unreachable → Narrative MUST NOT default to "show" (§2 Principle 7 — Narrative cannot decide access itself, including by omission-as-default); safe failure mode is to withhold, not disclose.
9. **Recovery strategy:** retry; narration is delayed, never proceeds ungated.
10. **Dependencies:** Capability Map row 7.
11. **Non-responsibilities:** Narrative never evaluates access policy itself (§15).

**Session caching note (already defined, not new):** per §12, once evaluated in a session the decision is cached for that session's remaining lifetime — Narrative should not re-query Governance for the same requester/content pair within one session.

---

## IC-07 — Access Policy Evaluation

1. **Purpose:** Governance's own access decisions are grounded in current ownership/consent state.
2. **Producer (requester):** Trust, Explainability & Governance (internal to its own evaluation).
3. **Consumer (data source):** Memory & Knowledge (Projection read).
4. **Interaction Type:** Query.
5. **Input schema:** `{entity_refs[], as_of_time?}`.
6. **Output schema:** ownership + consent Projection snapshot (§12, explicit dependency).
7. **State transitions:** N/A (pure read).
8. **Error cases:** Projection unavailable/stale beyond bounded lag → Governance must not evaluate against unknown state; treat as unauthorized by default (fail-closed, consistent with §18 least-privilege default).
9. **Recovery strategy:** retry against Memory & Knowledge; no independent access-state cache outside session-level caching already defined in §12.
10. **Dependencies:** Capability Map row 11.
11. **Non-responsibilities:** Memory & Knowledge does not itself decide access — it only serves the Projection Governance reads (AC-2 remains exclusive to Governance).

---

## IC-08 — RTBF Notification to Learning & Feedback

**Status: NOT RESOLVED — GAP retained.** Capability Map Gap G4 reads "نام Event **یا مکانیزم دقیقی**..." — unlike G5 (which already fixes the producer and the fact that it's an Event, leaving only the name open), G4's phrasing leaves open whether this is an Event at all, and if so, whether Governance is its producer. Deciding that would mean assigning a new item to Governance's Capability-Map-documented "Events Produced" list (currently closed at exactly the four Consent events, §11) — an architectural decision, not a protocol-level naming choice. This Interaction Contract cannot resolve it. See ADR Candidates, Section 3.

What remains true regardless of how G4 is eventually resolved: Kernel §13 already fixes *who reacts* (Learning & Feedback) and *what the reaction is* ("پرچم بازبینی می‌خورند") — only the delivery mechanism is undecided, and that undecided part is out of this document's scope.

1. **Purpose:** informed by Kernel §13; mechanism deferred.
2–11. **GAP** — no contract defined pending ADR.

---

## IC-09 — RTBF Propagation to Memory & Knowledge

1. **Purpose:** anonymize identifiable content in the Event Log while preserving Event structure (INV-5).
2. **Producer:** Trust, Explainability & Governance.
3. **Consumer:** Memory & Knowledge.
4. **Interaction Type:** Command.
5. **Input schema:** `{forgotten_identity_ref, legal_hold: bool}`.
6. **Output schema:** confirmation of soft-restriction (if legal hold) or anonymization (if not), per §13.
7. **State transitions:** Event structure preserved; identifiable content anonymized or access-locked (§13's two documented outcomes).
8. **Error cases:** legal retention conflict → soft-restriction applied instead of anonymization (§13, explicit, not a failure — a defined alternate path).
9. **Recovery strategy:** N/A — this is a deterministic, idempotent state change once triggered.
10. **Dependencies:** INV-5, §13.
11. **Non-responsibilities:** Memory & Knowledge does not decide *whether* RTBF applies (Governance's exclusive contract, §13) — only executes the storage-level consequence.

---

## IC-10 — Outcome Comparison Event

1. **Purpose:** generate the delayed-cycle outcome-comparison event that Learning & Feedback owns (§6).
2. **Producer:** Memory & Knowledge (Projection as input).
3. **Consumer:** Learning & Feedback (generates the event itself from what it reads — Memory & Knowledge is a data source here, not the event producer of record).
4. **Interaction Type:** Query (Projection read) → Event (Learning & Feedback's own internal-producer output, `producer_type: internal`, per §6).
5. **Input schema:** relevant decision/action/outcome Projections.
6. **Output schema:** this document names the event `OutcomeComparisonRecorded {decision_id, predicted_outcome, actual_outcome, delay_period}` — protocol-level naming only (§6 already assigns ownership and existence, just not a name).
7. **State transitions:** N/A beyond standard Event lifecycle (§7) once produced.
8. **Error cases:** insufficient data to compare → no event produced (silence is valid — not every decision has a measurable outcome).
9. **Recovery strategy:** N/A, best-effort/periodic by nature of "delayed cycle" (§6).
10. **Dependencies:** Kernel §6, §8.
11. **Non-responsibilities:** Learning & Feedback does not alter the original Decision or Action records — it only produces a new, independent comparison Event (INV-1 compliance).

---

## IC-11 — Shared Connector Infrastructure

1. **Purpose:** the technical layer both Data Ingestion and Action & Execution use, without itself deciding anything (§14).
2. **Producer/Consumer:** both Capabilities consume this layer; neither owns it exclusively; it is infrastructure, not a Capability (§14, explicit — same classification already established for the Scheduler in the Business Partner design).
3. **Interaction Type:** shared Query/state (Connector registry, health status) consumed by both.
4. **Input/Output schema:** `{connector_id, sync_strategy, schema_version, health: Healthy|Delayed|Offline|AuthenticationFailed|SchemaChanged}`.
5. **State transitions:** health state changes are published, never silent (§16).
6. **Error cases:** repeated auth failure → Circuit Breaker (§16), applies independently to whichever Capability is using the connector for reading (Data Ingestion) vs. writing (Action & Execution).
7. **Recovery strategy:** retry with backoff, per §16, shared mechanism.
8. **Dependencies:** §14.
9. **Non-responsibilities:** this layer never decides write-risk authorization (§14, exclusive to Action & Execution) and never decides Business Event validity (exclusive to Domain Adaptation).

---

## IC-12 — Consent Event Consumption

1. **Purpose:** consent state, once recorded, must be visible to whatever reads ownership/consent Projections (chiefly IC-07).
2. **Producer:** Trust, Explainability & Governance (`ConsentGranted/Renewed/Revoked/Expired`, §11).
3. **Consumer:** Memory & Knowledge (writes via IC-02's general contract — Consent events are ordinary Events using the same pipeline, no special path).
4. **Interaction Type:** Event.
5. **Input schema:** the four named event types, granular by data-type × consumer (§11).
6. **Output schema:** N/A — standard Event Log write (IC-02).
7. **State transitions:** consent state change → new Event → Projection invalidated/regenerated (§8) → visible to next IC-07 read.
8. **Error cases:** none beyond IC-02's standard Event admission failure modes.
9. **Recovery strategy:** none beyond IC-02.
10. **Dependencies:** §11, §4, §8.
11. **Non-responsibilities:** none beyond what's already stated for IC-02.

---

## IC-13 — Domain Signal Producer Event Candidate Submission

**افزوده‌شده در v1.1، طبق ADR-00AD و الحاقیه‌ی Kernel v1.3 (§۶، §۲۰).**

1. **Purpose:** پذیرش یک سیگنال درون‌زا (Event Candidate) — تولیدشده توسط یک تولیدکننده‌ی سیگنال دامنه (Value Engine) یا توسط ثبت یک تعامل صریح انسانی (دیدن/تأیید/رد یک Opportunity) — به‌عنوان کاندیدای یک Business Event.
2. **Producer:** یک تولیدکننده‌ی سیگنال دامنه‌ی ثبت‌شده (Domain Signal Producer) — نوع الف: Value Engine دامنه‌محور (ظرفیت، کنسلی/عدم‌حضور، پیگیری)؛ نوع ب: لایه‌ی تعامل کاربری (ثبت تعامل صریح انسانی).
3. **Consumer:** Domain Adaptation & Semantic Translation (اعتبارسنجی محدود کاندیدا)، سپس Memory & Knowledge (ماندگاری).
4. **Interaction Type:** Command (درخواست پذیرش کاندیدا) — همزمان در خط‌لوله‌ی داخلی؛ خودِ Candidate تا پیش از پذیرش یک Business Event نیست (هم‌الگو با IC-01).
5. **Input schema:** `{producer_id, domain_tag: "opportunity.<family>" | "opportunity.interaction", core_entity_refs[] (از قبل حل‌شده), opportunity_correlation_id (خالی برای Occurrence بنیان‌گذار), event_type: OCCURRENCE|AMENDMENT|RETRACTION, payload: {evidence_refs[], materiality_score?, materiality_basis?, intended_audience?, interaction_type?, actor_ref?}, producer_timestamp, confidence_level}`.
6. **Output schema:** `{admission_result: accepted|rejected, event_id?, opportunity_correlation_id?}`. On rejection: routed to Observability, outside Kernel (§7)، هم‌الگو با IC-01.
7. **State transitions:** Event Candidate → اعتبارسنجی محدود کاندیدا → پذیرفته (Occurrence/Amendment/Retraction واقعی) یا رد‌شده (هرگز Business Event محسوب نمی‌شود).
8. **Error cases:** `producer_id` ثبت‌نشده → رد کامل؛ `domain_tag` خارج از فهرست مجاز → رد کامل؛ `core_entity_refs` دیگر در Projection قابل‌حل نیست → رد، با علت مشخص در Observability.
9. **Recovery strategy:** تولیدکننده باید Candidate کامل را دوباره ارسال کند؛ بدون معنای Retry-with-patch (INV-1، هم‌الگو با IC-02).
10. **Dependencies:** Kernel §4, §6 (v1.3)، §7, §8, §20 (v1.3)؛ ADR-00AD.
11. **Non-responsibilities:** تولیدکننده هرگز مستقیماً در Event Log نمی‌نویسد (انحصاراً Memory & Knowledge)؛ هرگز تصمیم دسترسی نمی‌گیرد (AC-2)؛ هرگز Recommendation یا اقدام اجرایی تولید نمی‌کند (Capability ۶/۹).

**Candidate Validation (نسخه‌ی محدودشده‌ی AC-1، نه تکرار کامل آن):** Domain Adaptation بررسی می‌کند: (الف) `producer_id` در رجیستری معتبر است؛ (ب) `domain_tag` در فهرست مجاز است؛ (ج) `core_entity_refs` هنوز در Projection فعلی قابل‌حل‌اند؛ (د) ساختار `payload` کامل است. نگاشت اولیه‌ی هویت (که AC-1 برای سیگنال بیرونی انجام می‌دهد) اینجا تکرار نمی‌شود چون از قبل، در لحظه‌ی خواندن Projection توسط تولیدکننده، انجام شده است.

**Identity (طبق ADR-00AC):** `id` (هویت Event) ≠ `opportunity_correlation_id` (= `id` رویداد Occurrence بنیان‌گذار، پایدار در طول چرخه‌ی عمر، حامل هر Amendment از طریق `amends_event_id`) ≠ `unique_key` (فقط Idempotency) ≠ هش محتوا (نسخه، مختص هر رویداد).

**No generic plugin backdoor:** هیچ تولیدکننده‌ای بدون ثبت پیشین در رجیستری تولیدکننده مجاز به فراخوانی این قرارداد نیست؛ `domain_tag` مجاز برای V1 یک فهرست بسته است: `opportunity.capacity`، `opportunity.cancellation`، `opportunity.followup`، `opportunity.interaction`.

**Ownership / Authority:** تولیدکننده مالک منطق تشخیص است، نه مالک Event Log. Domain Adaptation مالک اعتبارسنجی محدود کاندیدا است. Memory & Knowledge مالک انحصاری ماندگاری و Projection است — بدون تغییر.

**Producer ≠ Event Log Owner** — این مرز، هسته‌ی این قرارداد است و در هیچ شرایطی نقض نمی‌شود.

---

## IC-14 — Role-aware Opportunity Delivery

**افزوده‌شده در v1.1، طبق ADR-00AE.**

1. **Purpose:** ارائه‌ی خوانش فیلترشده، مرتب‌شده، و نقش‌آگاه از Opportunityهای فعال — بدون هیچ منطق تشخیص دامنه در لایه‌ی خواندن.
2. **Producer (منبع خواندن):** Projectionهای Memory & Knowledge — `opportunity_current_state` و رویدادهای `opportunity.interaction`.
3. **Consumer:** Communication & Narrative (فیلتر نهایی و قالب‌بندی، به نمایندگی از Feed/Briefing/گفتگو).
4. **Interaction Type:** Query (خواندن Eventual-Consistent، طبق §۸).
5. **ترتیب اجباری پردازش (غیرقابل‌تغییر):** (۱) AC-2 (Trust, Explainability & Governance، انحصاراً) → (۲) فیلتر `intended_audience` (Communication & Narrative) → (۳) وضعیت تعامل مختص actor → (۴) گروه‌بندی/مرتب‌سازی.
6. **معنایی `intended_audience`:** برچسب تناسب، نه تصمیم مجوز. هرگز جایگزین مرحله‌ی ۱ نمی‌شود؛ اگر مرحله‌ی ۱ رد کند، مرحله‌ی ۲ اصلاً اجرا نمی‌شود.
7. **Input schema:** `{actor_id, role}`.
8. **Output schema:** Opportunityهای فعال، گروه‌بندی‌شده بر اساس `domain_tag`، هرکدام با `opportunity_correlation_id، state (ACTIVE|EXPIRED)، materiality_score، materiality_basis، intended_audience، evidence_refs[]، event_time، expires_at، my_interaction_state (NONE|SEEN|ACKNOWLEDGED|DISMISSED)`.
9. **State transitions:** N/A (فقط‌خواندنی).
10. **مدیریت Materiality:** امتیازها فقط **درون یک خانواده** (`domain_tag` یکسان) قابل‌مقایسه فرض می‌شوند؛ مقایسه‌ی سراسری صریحاً خارج از دامنه‌ی V1.
11. **قاعده‌ی مرتب‌سازی/گروه‌بندی:** گروه‌بندی اول بر اساس `domain_tag`؛ مرتب‌سازی درون‌گروهی نزولی بر اساس `materiality_score`؛ ترتیب گروه‌ها بر اساس یک قاعده‌ی قطعی ثانویه (تازگی)، نه مقایسه‌ی مستقیم امتیاز خام.
12. **رؤیت‌پذیری چرخه‌ی عمر:** یک Opportunity `EXPIRED` همچنان از طریق این قرارداد قابل‌بازیابی است (برای مراجعه‌ی گفتگو)، اما در Feed پیش‌فرض نمایش داده نمی‌شود مگر صریحاً درخواست شود.
13. **Error cases:** Projection در دسترس نیست/کهنه است → نشانگر «آخرین به‌روزرسانی» به مصرف‌کننده، هرگز داده‌ی جعلی.
14. **Non-responsibilities:** این قرارداد هرگز تصمیم دسترسی نمی‌گیرد (فقط از تصمیم AC-2 مصرف می‌کند)؛ هرگز Event جدید نمی‌نویسد؛ هیچ منطق تشخیص/تفسیر دامنه در این قرارداد یا مصرف‌کننده‌اش مجاز نیست.
15. **Dependencies:** Kernel §8 (Eventual Consistency), §12 (AC-2), §15؛ IC-13 (منبع رویدادهای `opportunity.interaction`)؛ ADR-00AE.

**Privacy boundary:** خروجی این قرارداد هرگز نباید شامل `evidence_refs`ای باشد که خودشان به داده‌ای اشاره می‌کنند که AC-2 اجازه‌ی دیدنش را نداده.

**Multi-audience correction:** `SEEN`/`ACKNOWLEDGED`/`DISMISSED` مختص هر actor است (رکورد `opportunity.interaction` جداگانه)، نه وضعیت سراسری خود Opportunity.

---

## Dependency Graph

**یادداشت v1.1:** نمودار زیر مربوط به IC-01 تا IC-12 است (بدون تغییر نسبت به v1.0). زنجیره‌ی IC-13/IC-14 مجزا و ساده است، بدون نیاز به ادغام در این نمودار: `Domain Signal Producer → (IC-13) → Domain Adaptation → Memory & Knowledge → (IC-14) → Communication & Narrative`.

```
                     ┌─────────────────────────────┐
                     │        Data Ingestion         │
                     │        & Integration          │
                     └───────────────┬───────────────┘
                                     │ IC-01 (admission request)
                                     ▼
                     ┌─────────────────────────────┐
                     │   Domain Adaptation &         │
                     │   Semantic Translation        │  ← GAP: own Dependencies (G7)
                     └───────────────┬───────────────┘
                                     │ IC-02 (Event write)
                                     ▼
                     ┌─────────────────────────────┐
        ┌───────────►│      Memory & Knowledge       │◄───────────┐
        │            │   (Event Log + Projections)   │            │
        │            └──────┬───────────┬────────────┘            │
        │   IC-07 (read)    │IC-10(read)│  IC-09 (RTBF)            │ IC-12 (write)
        │                   ▼           │                          │
   ┌────┴─────────┐  ┌─────────────┐    │                   ┌──────┴─────────┐
   │Trust,         │  │Learning &   │◄···┘ G4 — NOT RESOLVED     │Trust,          │
   │Explainability │  │Feedback     │        (ADR required,       │Explainability  │
   │& Governance   │  └─────────────┘        dotted = no live      │& Governance    │
   └──┬─────┬──────┘                         contract)             │ (same node —   │
      │     │                                                 │  loop closes)  │
IC-04 │     │ IC-06                                           └────────────────┘
(self-│     │(access
critique)│  │check)
      ▼     ▼
┌───────────────┐        IC-05 (decision_id ref)      ┌───────────────┐
│Decision       │◄───────────────────────────────────►│Action &       │
│Support &      │                                      │Execution      │
│Recommendation │                                      └───────┬───────┘
└───────────────┘                                              │
      ▲                                                        │ IC-11 (shared infra)
      │ IC-03 (identity correction, via Domain Adaptation)      ▼
┌───────────────┐                                     ┌───────────────┐
│Reasoning &    │                                     │  (Connector    │
│Causal Analysis│                                     │  Infrastructure,│
└───────────────┘                                     │  not a Capability)│
                                                        └───────────────┘

┌───────────────┐
│Communication & │──── IC-06 ────► Trust, Explainability & Governance
│Narrative       │
└───────────────┘

┌───────────────────┐     ┌───────────────────────┐
│ Prediction &        │     │ Goal Alignment &        │
│ Simulation (Deferred)│    │ Strategy (Deferred)     │
│ NO CONTRACT — GAP    │     │ NO CONTRACT — GAP       │
└───────────────────┘     └───────────────────────┘
```

---

## Validation

**No circular responsibilities.** Every arrow above resolves to a single directional authority: Domain Adaptation decides admission, Memory & Knowledge decides storage, Governance decides access/consent/RTBF, Decision Support decides recommendation content, Action & Execution decides write-risk. No two Capabilities claim the same decision. Reasoning (IC-03) only *selects among* Domain Adaptation's candidates — it never re-decides admission, which would be circular.

**No duplicated ownership.** Cross-checked against each Capability's Owned Concepts (Capability Map §2.1–§2.11): each contract's decision authority maps to exactly one owning Capability. No contract requires two Capabilities to independently produce the same artifact.

**No missing interaction.** Every non-GAP row in the Capability Map's Dependency Matrix (§3) and every row in the Kernel's Cross-Capability Contracts table (§15) has a corresponding IC above. The two Deferred Capabilities have none, correctly, since the Kernel defines no behavior to contract.

**No impossible dependency.** No contract requires a Capability to read data before it could exist in the pipeline (e.g., IC-07 reads Projections that IC-02/IC-12 guarantee exist prior to any access decision being requested).

**No Capability bypassing another.** IC-04, IC-05, IC-06 each explicitly forbid the shortcut a future implementer might be tempted to take (auto-pass on Governance timeout; action without decision_id; narration without access check) — each is stated as a hard block, not best-effort.

**Compatibility with the frozen Kernel.** Every contract cites the specific Kernel section or Capability Map row it implements. Every naming decision (G4 partial, G5 full) is flagged as protocol-level, grounded in the Kernel's own explicit permission for unnamed events (§4) and existing Owned Concepts — none assigns new ownership or responsibility.

---

## ADR Candidates (NOT resolved here — require architectural decision)

These could **not** be resolved at the Interaction Contract level because doing so would mean assigning new architectural authority, which this phase is not permitted to do:

1. **G6 — Owned Concepts for Reasoning & Causal Analysis, Learning & Feedback, and most of Communication & Narrative.** These three Capabilities have no explicit exclusive-authority statement in the Kernel. An Interaction Contract can describe *how* they participate in an interaction (as done above), but cannot grant them an Owned Concept the Kernel never assigned — that would be inventing architecture. **Recommend:** an ADR, informed by real implementation experience once IC-03, IC-06, and IC-10 are built, since implementation will surface what authority these Capabilities actually need.
2. **G7 — Dependencies for Domain Adaptation & Semantic Translation and Goal Alignment & Strategy.** The Capability Map explicitly marks these as GAP at the Capability Map level, not just the Kernel level. This document's contracts (IC-01, IC-02, IC-03) show Domain Adaptation's *operational* interactions without formally amending the Capability Map's Dependency Matrix — that formal amendment, if ever needed, requires an ADR, not an Interaction Contract.
3. ~~**G3 — Materiality flag producer.**~~ **RESOLVED در v1.1، طبق ADR-00AD و IC-13.** تولیدکننده اکنون مشخص است: تولیدکننده‌ی سیگنال دامنه‌ی ثبت‌شده (Domain Signal Producer)، در لایه‌ی Feature/Domain Pack — دقیقاً همان «مورد کاربرد ملموس» (Opportunity در V1) که این بند خودش پیش‌بینی کرده بود.
4. **G4 — RTBF notification mechanism to Learning & Feedback.** Capability Map's own wording ("Event یا مکانیزم دقیقی") leaves open whether this is an Event at all, and if so, whether Governance is its producer — deciding either would mean adding to Governance's closed, Capability-Map-documented Events Produced list (currently exactly the four Consent events, §11). This is an architectural decision about mechanism category and producer authority, not a protocol-level naming choice, and so cannot be resolved inside IC-08. **Recommend:** ADR, informed by whether Learning & Feedback's implementation ends up needing a push (Event) or can work with a pull (periodic query against Governance/Memory & Knowledge state) — a distinction easier to settle once IC-07's Projection-read pattern has real implementation experience behind it.

No other Kernel or Capability Map gap encountered during this phase required an ADR — G1 and G2 (Deferred capabilities) have no interaction to contract by design, and G5 was resolved at the protocol level as documented above (Action & Execution and Learning & Feedback are already the Capability-Map-fixed producers of their respective unnamed events — only the names were open).
