# MLINO — Governance Foundation Index

This index connects three layers of record: the frozen Kernel, the five-ADR AI Governance chain built on top of it, and the Compliance Audit that traces one to the other. All Layer 2 items are additive relative to Kernel Architecture Specification v1.2 — none required or produced a Kernel revision. **(به‌روزرسانی فاز ۳D: Layer 2b زیر، ADR-00AD، یک الحاقیه‌ی واقعی و کوچک به Kernel تولید کرد — نسخه‌ی Kernel اکنون v1.3 است؛ جزئیات در `Kernel_Architecture_v1.3_FROZEN.md`، پیوست ۴.)**

## Layer 1 — Kernel (Frozen, Immutable)

- `../Kernel_Architecture_v1.3_FROZEN.md`
- `../MLINO_Capability_Map_v1_FROZEN_FINAL.md`

## Layer 2 — AI Governance ADR Chain (Frozen, Additive)

| ADR | Title | Status | Depends on | Decision (one line) |
|---|---|---|---|---|
| ADR-00X | Human Authorization Boundary | Approved / Frozen | — | No AI-generated action may modify external state without explicit, real-time affirmative authorization from a human actor; authority, not capability, is the boundary. |
| ADR-00Y | Explainability Boundary — Chain of Origin | Approved / Frozen | ADR-00X | Every AI-generated output presented to a human must carry a generation-time Chain of Origin (Origin→Source→Transformation) sufficient for a no-context human to understand it. |
| ADR-00Z | Producer ≠ Validator Boundary | Approved / Frozen | ADR-00X, ADR-00Y | The component producing content/actions and the component certifying compliance must always be architecturally distinct, including independence of judgment-formation. |
| ADR-00AA | Goal Fidelity Boundary | Approved / Frozen | ADR-00X, ADR-00Y, ADR-00Z | An AI-generated action must remain faithful to the most-recently-authorized goal statement; no downstream reinterpretation, including via Learning, may redefine it. |
| ADR-00AB | Memory Integrity Boundary | Approved / Frozen | ADR-00X, ADR-00Y, ADR-00Z, ADR-00AA | Information relied upon for reasoning, decisions, authorization, or verification must satisfy an integrity requirement, orthogonal to and never satisfied merely by Traceability. |

### Dependency verification

- ADR-00Y → ADR-00X: closes ADR-00X's deferred Explainability-sufficiency dependency.
- ADR-00Z → ADR-00X, ADR-00Y: defines the Verification Independence principle both earlier ADRs relied on but never defined.
- ADR-00AA → ADR-00X, ADR-00Y, ADR-00Z: constrains *what* an action may claim to serve, composable with (not overlapping) Authority, Traceability, and Verification.
- ADR-00AB → all four preceding: governs the *validity of the substrate* the other four draw upon; explicitly does not extend into any other ADR's domain (Section-by-section boundary stated in ADR-00AB's Decision).
- No circular dependency: strict chain 00X ← 00Y ← 00Z ← 00AA ← 00AB.

All five ADRs passed the same five-stage pipeline: Architecture Review → Hostile Review → Revision → Regression Gate → Freeze.

## Layer 3 — Compliance Audit (Frozen)

- `Kernel-v1.2-Governance-Compliance-Audit.md`

Audits the frozen Kernel against all five ADRs above. Conclusion: **Governance Compliance Gaps Detected** — two Compliance Gaps (ADR-00X, ADR-00AB), one Enhancement (ADR-00Y), one Confirmed Compliance (ADR-00Z), one Out-of-Scope item (ADR-00AA). No Conflicts found. Result: READY FOR ARCHITECTURE RECORD.

## Traceability Statement

Every ADR file in Layer 2 carries a `Relation: Applies to Kernel Architecture Specification v1.2` header and a closing "Governance Layer Note" citing the specific Compliance Audit finding that motivated it. The Compliance Audit in Layer 3 in turn cites the exact Kernel sections (AC-2, AC-4, Sections 10–12, Section 17) that produced each finding. This closes the loop: Kernel text → Audit finding → ADR remediation → back-reference to the finding, with no step skipped and no Kernel text modified at any point.

## Layer 2b — Core V1 Architecture ADRs (فاز ۳D، زنجیره‌ی مجزا)

**تصریح مهم:** سه ADR زیر بخشی از «زنجیره‌ی پنج‌گانه‌ی حاکمیت هوش مصنوعی» (Layer 2 بالا) **نیستند**. آن‌ها فقط برای پرهیز از تداخل شماره‌گذاری، ادامه‌ی همان توالی حرفی (X→Y→Z→AA→AB→**AC→AD→AE**) را به کار می‌برند — بدون هیچ رابطه‌ی وابستگی موضوعی با زنجیره‌ی حاکمیت هوش مصنوعی. دسته‌بندی تصمیم آن‌ها «Core V1 Architecture» است، نه «AI Governance».

| ADR | Title | Status | Kernel Impact | Decision (one line) |
|---|---|---|---|---|
| ADR-00AC | Opportunity Architecture | Approved / Frozen | No Kernel Revision Required | Opportunity یک مصنوع Event-Sourced است، نه موجودیت Core و نه Capability جدید. |
| ADR-00AD | Opportunity Producer & Materiality | Approved / Frozen | **Kernel v1.3 Amendment Applied (§6, §20)** | تولیدکننده‌ی سیگنال دامنه (Domain Signal Producer) در لایه‌ی Feature/Domain Pack، از طریق IC-13، بدون گسترش اقتدار هیچ Capability موجود. |
| ADR-00AE | Role-aware Opportunity Delivery | Approved / Frozen | No Kernel Revision Required | `intended_audience` یک برچسب تناسب است، همیشه پس از AC-2 اعمال می‌شود، هرگز مجوز دسترسی نیست. |

این سه ADR وابستگی مستقیم به زنجیره‌ی Layer 2 ندارند، اما ADR-00X (مرز مجوز انسانی) به‌طور غیرمستقیم در `opportunity_architecture/V1_HUMAN_ACTION_BOUNDARY_v2.md` بازتأیید می‌شود — بدون این‌که خودِ ADR-00X تغییر کند.

## Unresolved Items

None architectural. The following remain correctly deferred, per the ADRs' own Deferred Decisions sections: concrete distinctness criteria for Producer/Validator (ADR-00Z), goal-state versioning mechanism (ADR-00AA), integrity measurement/detection mechanism (ADR-00AB), Multi-Agent composition for all of the above.
