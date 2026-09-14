# اجرای نگهبان — ادغام G10e (تکمیل لایه‌ی service هسته) و صدور طراحی قرارداد خواندن V2 (S9)

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Architecture Guardian

**تصویب مالک:** مالک در گفت‌وگوی مستقیم با Claude نوشت «انجامش بده»، در پاسخ به بخش ۴ بازبینی `20260914_CLAUDE_REVIEW_G10E_EVIDENCE_SLICE.md` (commit `3cbe410`). یعنی:

| # | تصمیم | وضعیت |
|---|---|---|
| **الف** | ادغام G10e در main | مجاز است |
| **ب** | مرحله‌ی بعد | **گزینه‌ی ۱:** سند طراحی قرارداد خواندن V2 (S9)، **فقط سند** |

## ۱. ادغام G10e: انجام شد و لایه‌ی service هسته کامل است

| مورد | مقدار |
|---|---|
| **merge commit** | `ae325e2232d718f61d354e71049ea76c36c28ea9` |
| **والدها** | `3cbe410` (main) و `ddbea98` (`codex/core-g10e-evidence`) |
| **درخت** | `db921048cbd3d21ba44aa86b1b2e26e06a9e6ec9` = خروجی `merge-tree` نگهبان (پیش‌نمایش و اجرا) |
| **دامنه** | تازه: `evidence-service.ts`، `g10e-evidence.spec.ts`، گزارش و شواهد `g10e` · تغییر: `offer-service.ts` (Y1)، `g10d-offer.spec.ts` (Y2) و Handoff Codex (فقط افزودنی) · **بدون حذف** |
| **push** | محافظت‌شده با `--force-with-lease=main:3cbe410` |
| **runtime** | read-api همان `a07858b3` · DB با StartedAt بدون تغییر و `Restarts=0` · شش migration · `dspr=4` · بدون build، restart، migration یا آزمون |

**لایه‌ی service هسته (G10a تا G10e) اکنون در main کامل است.** هنوز هیچ مصرف‌کننده‌ای ندارد: نه مسیر HTTP و نه V2.

---

## ۲. شکافی که سند S9 باید حل کند (یافته‌ی نگهبان)

**وفاداری محتوای منتشرشده.**
- ردیف‌های `business_profiles` و `capabilities` **محتوای جاری** را نگه می‌دارند: `schema.prisma:465-527`.
- رخداد Publication فقط **شماره‌ی** revision را ثبت می‌کند (`publications.content_revision`)، **نه خود محتوا**. ستون‌های Publication در `schema.prisma:626-655` هیچ snapshot محتوایی ندارند؛ `gate_snapshot` فقط مجوز را ثبت می‌کند.
- پس اگر پروفایل منتشرشده ویرایش شود (D6 ← `content_revision` بالا می‌رود)، ردیف **محتوای منتشرنشده** را نشان می‌دهد، در حالی که `published_content_revision` هنوز شماره‌ی قبلی است.
- **هر خواننده‌ای که مستقیم این ردیف‌ها را بخواند، پیش‌نویس را به‌جای نسخه‌ی منتشرشده نشان می‌دهد.**
- OfferVersion این مشکل را ندارد، چون از لحظه‌ی ساخت تغییرناپذیر است (R2).

این مسئله باید در سند به‌صورت یک تصمیم مالک با گزینه‌ها و توصیه بیاید.

---

## ۳. دستور G13a (فقط سند)

```
INSTRUCTION_ID: CODEX-20260914-G13A-V2-READ-CONTRACT-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10E-MERGE-S9
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V2-READ-CONTRACT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10E_MERGE_S9_RELEASE.md (this file; PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: origin/main mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (FINAL); owner decisions S1–S15
MODE: DOCUMENT ONLY — no code, no schema, no migration, no Prisma, no Docker, no database.
      NEW branch codex/v2-read-contract-design from origin/main (the head containing merge ae325e2).

PRECONDITION: GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP. Never touch credentials.

DELIVERABLE: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (Persian prose; identifiers in English). Required sections:
 1. Purpose and consumer.
    - Who V2 is and what it needs. Cite V2 docs READ-ONLY from origin/codex/v2-intent-flow-foundation
      via git show (never check out or modify that branch).
    - V1 remains the source of truth (ADR-0001). The contract is explicit and versioned (ADR-0002).
    - Intent and Session stay in V2 (ADR-0012).
 2. Exposure scope, per entity: what is exposed and what is never exposed.
    - Organization display; BusinessProfile; Capability (audience ∈ {INTERNAL, CUSTOMER_FACING});
      OfferVersion (the single PUBLISHED version per offer) and its capability links; Evidence;
      the identity-claim verification signal.
    - Never exposed: membership, grant, gate_snapshot, platform refs, audit actors, internal ids beyond stable
      public ids; the claim identifier_value unless decided otherwise.
 3. PUBLISHED-CONTENT FIDELITY (section 2 of REVIEW_REFERENCE). Prove the gap with schema citations. Give
    options with trade-offs and ONE recommendation. Minimum options:
    (A) a published-content snapshot written in the same transaction as the Publication (a new table or column → a schema CCR)
    (B) block public-field edits while PUBLISHED (withdraw → edit → republish)
    (C) expose content only when content_revision == published_content_revision; otherwise serve "temporarily
        unavailable" or the last-known state
    (D) any better option you can justify
    State the impact of each on D6, S4 and the existing services.
 4. Freshness and validity:
    - capability.fresh_until, evidence.fresh_until
    - offer_version valid_from/valid_until
    - evidence status and confirmation (ADR-0006: provenance is separate from confirmation;
      is AI_INFERRED unconfirmed evidence exposed?)
 5. Claim display after SUSPENDED/EXPIRED/REJECTED for a linked profile (the remainder of S13-A):
    options + a recommendation.
 6. Contract shape:
    - versioned DTOs (v1) with an explicit field list per entity, stable public ids, UTC timestamps
    - compatibility rules (a major bump for breaking changes)
    - deterministic ordering via publications.occurred_at
 7. Transport options + recommendation:
    (a) a read-only HTTP endpoint on the existing V1 read-api
    (b) push or outbox of Publication events to V2
    (c) a read-only DB view/replica
    (d) other
    Relate each to S1 (internal first) and to the separate HTTP-boundary design (a later owner option).
 8. Security and tenancy:
    - the public read is cross-tenant BY DESIGN and read-only; no write path
    - V2 consumer authentication; rate limits; PII in contact_information; the guarantee that nothing
      unpublished leaks
 9. Consistency and caching: read-your-publish, cache invalidation on Publication events,
    withdraw propagation latency.
10. A test strategy for the future implementation (the disposable DB only; draft-leak negative tests).
11. Owner decisions S16..Sn (options + consequences + ONE recommendation each), and an ADR-0001..0012
    compliance matrix.

EVIDENCE RULES:
- every schema fact cites origin/main file:line
- every SHA-256 comes from git show bytes, pasted from command output
- every V2 fact cites origin/codex/v2-intent-flow-foundation:<path>
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13A_V2_READ_CONTRACT_DESIGN_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-V2-READ-CONTRACT).
Push ONLY to codex/v2-read-contract-design (if blocked, ask the owner). Then STOP.
ALLOWED: mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (new) · the report (new) · the handoff (append only)
FORBIDDEN:
- ANY code, test, config, schema or migration; implementation/**
- ANY change to the V2 branch (read-only git show only)
- ANY push to main or other branches
- deciding any S item yourself (recommend only)
- Docker, databases, port 5435, _PUSH_STAGING, credentials
```

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10a تا G10e** | **لایه‌ی service هسته** | ✅ **کامل در main** (`ae325e2`) |
| **G13a** | **سند طراحی قرارداد خواندن V2 (S9)** | ▶️ صادر شد (فقط سند) |
| تصمیم‌های S16 به بعد | از سند G13a | ⏳ پس از بازبینی |
| پیاده‌سازی S9 | | ⏳ پس از تصویب طراحی؛ ممکن است CCR ‏schema لازم داشته باشد (بخش ۲) |

من کلاد هستم
