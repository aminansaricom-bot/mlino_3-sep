# ثبت تصویب مالک — CCR ستون `published_content`، OQ-1 تا OQ-5 و مجوز G14a-2

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A1B_PUBLISHED_CONTENT_CCR_FIXES.md` (commit `7e16c98`)

## ۱. متن تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «CCR ستون published_content تصویب شد؛ OQ-1 تا OQ-5 طبق توصیه‌ی نگهبان (OQ-4 به‌صورت A′)؛ G14a-2 مجاز است.»

## ۲. آنچه تصویب شد

| مورد | تصمیم |
|---|---|
| **CCR** | `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md` در `origin/codex/core-g14a-published-content` @ `ee25ead`، LF sha256 ‏**`95f4a3a18abe59956863ad7bdb7e07b294b1f0c61fb735c5df2500ab93aedccb`**، **APPROVED** |
| **OQ-1** | **A:** اگر ردیفی در Publication باشد، migration پیش از DDL رد می‌شود · backfill فقط با CCR جدا |
| **OQ-2** | **A:** `audience` هم در snapshot ذخیره می‌شود و هم هنگام خواندن باید `CUSTOMER_FACING` باشد · `capability_status` فقط دروازه‌ی زنده‌ی `ACTIVE` است |
| **OQ-3** | **A:** این‌ها هنگام خواندن و به‌صورت fail-closed ارزیابی می‌شوند و **فقط برای پنهان کردن**، هرگز برای افزودن محتوا: confirmation، freshness، claim، audience، capability status، `Organization.lifecycleStatus=ACTIVE`، `BusinessProfile.lifecycleStatus=ACTIVE`، `Offer.lifecycleStatus=ACTIVE` |
| **OQ-4** | **A′:** `contact_information` و `links` هنگام snapshot با allowlist ‏S22-A و S21-B پاک‌سازی می‌شوند · `business_hours` و `terms` تا تعریف schemaهای نسخه‌دار در G14b همان‌طور که هستند ذخیره می‌شوند · producer ‏G14b هنگام export آن‌ها را اعتبارسنجی یا حذف می‌کند |
| **OQ-5** | **A:** یک envelope واحد `{snapshot_version: 'core-publication-snapshot-v1', content}` |
| **G14a-2** | **مجاز:** پیاده‌سازی migration، schema، PublicationService و آزمون‌ها، **فقط روی PostgreSQL یک‌بارمصرف روی 5499** |

**دامنه‌ای که مجاز نیست** و هر کدام تصویب جدا می‌خواهند:
- **G14a-3:** اعمال روی `mlino-v1-local-db`، با backup
- ادغام در main
- G14b و G14c

---

## ۳. دستور Codex — G14a-2

```
INSTRUCTION_ID: CODEX-20260914-G14A2-PUBLISHED-CONTENT-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved the CCR (sha256 95f4a3a1...), OQ-1..OQ-5 as recorded in section 2 (OQ-4 = A-prime), and G14a-2.
MODE: IMPLEMENTATION on codex/core-g14a-published-content on top of ee25ead. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

1 CCR: status DRAFT -> APPROVED; record the owner decisions OQ-1..OQ-5 exactly as in section 2 of the approval
  record (OQ-4 = A-prime); fix Z2 (migration.sql:440-451 -> :591-593). No other CCR change.
2 New migration implementation/prisma/migrations/20260914010000_add_publication_published_content/migration.sql
  exactly per CCR C2. N1: prove whether Prisma accepts the explicit BEGIN/COMMIT; if not, drop them, keep the
  LOCK, and record the evidence.
3 schema.prisma: publishedContent Json? @map("published_content") @db.JsonB in model Publication only.
4 PublicationService per CCR C5:
  - allowlisted content columns read in the same FOR UPDATE (lockTarget) and, for OfferVersion, under the
    existing lock order
  - snapshot builders per target (CCR C3); explicit field allowlists (no spreads of row objects)
  - contact_information and links sanitized to the S22-A/S21-B allowlist keys; business_hours and terms stored
    as-is (OQ-4 A-prime)
  - WITHDRAWN (including the REPLACED withdraw) writes Prisma.DbNull; ALREADY_PUBLISHED inserts nothing; D6
    unchanged
5 Tests in implementation/test/core/ (a new spec file): ALL CCR C7 items 1-13 plus OQ-4 A-prime sanitization,
  on a DISPOSABLE PostgreSQL only:
  docker run --rm -d --name mlino-g14a2-testdb --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432
    -e POSTGRES_PASSWORD=<ephemeral> postgres:16-alpine
  DATABASE_URL must be localhost:5499 (the test DB guard enforces it). Apply ALL migrations to that DB with
  prisma migrate deploy. Remove the container at the end (docker rm -f mlino-g14a2-testdb) and record it.
6 Regression: the full V1 + core jest suite against the same disposable DB; report exact pass/fail counts.
  Run only from C:/Users/galexy/mlino code/core-g14a-published-content.

REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION_REPORT.md
- the files changed; a table C7 1-13 + OQ-4 -> test name -> pass/fail (every name must exist in the spec)
- the commands, suite totals, N1 evidence and container removal
- the LF sha256 of the migration, schema.prisma, publication-service.ts and the spec
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- the CCR (status, decisions, Z2 only)
- the new migration folder
- implementation/prisma/schema.prisma (Publication model only)
- implementation/core/publication-service.ts
- one new spec in implementation/test/core/
- the report (new); mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- applying any migration to mlino-v1-local-db or any DB other than the disposable 5499 container
- port 5435, docker compose, any other container or volume, Docker build of read-api
- _PUSH_STAGING; any push; git config/safe.directory; credentials
- editing 20260913010000_add_core_foundation or any existing migration
- other services, HTTP, Dockerfile, tsconfig, V2, the export producer (G14b)
```

**پس از G14a-2:**
1. بازبینی نگهبان: کد، آزمون‌ها، شاهد N1 و حذف container.
2. انتشار شاخه.
3. سپس تصمیم مالک درباره‌ی ادغام در main و G14a-3.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| CCR ‏`published_content` | | ✅ **APPROVED** (`95f4a3a1…`) |
| OQ-1 تا OQ-5 | | ✅ DECIDED (OQ-4 = A′) |
| **G14a-2** | **پیاده‌سازی با DB یک‌بارمصرف** | ▶️ **صادر شد** |
| ادغام در main و G14a-3 | | ⏳ تصویب جدا |
| G14b و G14c | | ⏳ تصویب جدا |

من کلاد هستم
