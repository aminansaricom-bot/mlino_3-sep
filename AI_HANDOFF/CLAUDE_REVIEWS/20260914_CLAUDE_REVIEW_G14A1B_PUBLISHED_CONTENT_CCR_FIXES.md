# بازبینی نگهبان معماری — G14a-1b: اصلاح CCR ستون `published_content`

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commit:** `ee25ead`، روی `9b64813`، شاخه‌ی `codex/core-g14a-published-content`. Codex آن را محلی ساخت و **نگهبان روی سرور منتشر کرد.**
**CCR:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md`، LF sha256 ‏**`95f4a3a18abe59956863ad7bdb7e07b294b1f0c61fb735c5df2500ab93aedccb`**

## حکم: `APPROVED_NEXT_STEP`؛ CCR آماده‌ی تصویب مالک است

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `9b64813..ee25ead`: فقط سه فایل مجاز · گزارش و Handoff فقط الحاقی (۰ حذف) · worktree تمیز · commitهای قبلی بازنویسی نشده‌اند · CCR هنوز DRAFT است و هیچ OQ تصمیم نشده |
| **GW2-P** | ✅ ثبت شده · hash ‏pin ‏`edb30877…` برابر |
| **hash** | ✅ `95f4a3a1…` برابر گزارش |

| # | وضعیت | شاهد |
|---|---|---|
| **Y1** | ✅ | envelope به `{snapshot_version, content}` کاهش یافت · CHECK حالا `? 'snapshot_version' AND ? 'content'` را هم می‌خواهد · نوع content از ستون target ردیف انتخاب می‌شود (قید XOR موجود) · دلیل انتخاب ثبت شده است |
| **Y2** | ✅ | سه دروازه‌ی زنده‌ی Organization، BusinessProfile و Offer در جدول C4 و در OQ-3 گزینه‌ی A آمده‌اند. هر سه فقط پنهان می‌کنند |
| **Y3** | ✅ | `Prisma.DbNull` برای WITHDRAWN · `JsonNull` ممنوع · آزمون ۱۲ برای رد JSON ‏`null` |
| **Y4** | ✅ | `LOCK TABLE … ACCESS EXCLUSIVE` پیش از preflight · runbook ‏`migrate resolve --rolled-back` |
| **Y5** | ✅ | rollback به‌صورت migration رو‌به‌جلو، با اثرش روی `_prisma_migrations` |
| **Z1** | ✅ | `schema.prisma:322-325` |

**دو یادداشت برای G14a-2** (دور تازه لازم ندارند):
- **Z2 (ارجاع):** قید «دقیقاً یک target» به `migration.sql:440-451` ارجاع داده شده است. آن خط‌ها FKهای Capability و Offer‌اند. قید درست `publication_target_xor_check` در **`:591-593`** است. در نخستین commit ‏G14a-2 اصلاح شود.
- **N1 (`BEGIN` و `COMMIT` صریح در migration):** PostgreSQL آن را می‌پذیرد، ولی رفتار Prisma با تراکنش صریح درون فایل migration باید **در G14a-2 عملاً آزموده شود.** آزمون ۱۰ نشان می‌دهد در صورت شکست هیچ ستونی نیمه‌کاره نمی‌ماند. اگر Prisma آن را نپذیرفت، `BEGIN` و `COMMIT` حذف شوند، `LOCK` بماند، و شاهد در گزارش ثبت شود.

---

## ۲. بسته‌ی تصویب مالک

| # | موضوع | توصیه‌ی CCR | **توصیه‌ی نگهبان** |
|---|---|---|---|
| **CCR** | متن CCR با hash ‏`95f4a3a1…` | | **تصویب**: status به APPROVED تغییر می‌کند |
| **OQ-1** | Publication از قبل موجود باشد | A: migration رد شود و backfill فقط با CCR جدا | **A** |
| **OQ-2** | `audience` و `capability_status` | A: audience در snapshot و زنده، status فقط زنده | **A** |
| **OQ-3** | مرز شایستگی زنده | A: confirmation، freshness، claim، audience و status، به‌علاوه‌ی lifecycle سازمان، پروفایل و Offer، زنده و fail-closed، فقط برای پنهان کردن | **A** |
| **OQ-4** | سخت‌گیری JSON در زمان snapshot | A: `contact_information` و `links` همین حالا با allowlist پاک‌سازی شوند · `business_hours` و `terms` فقط با نشانگر schema ‏G14b | **A با یک توضیح (A′):** schemaهای G14b هنوز وجود ندارند. اگر A را عیناً اجرا کنیم، از فردا هر publish با ساعات کاری یا terms شکست می‌خورد. پس: **contact و links همین حالا پاک‌سازی می‌شوند · `business_hours` و `terms` تا تعریف schema در G14b همان‌طور که هستند در snapshot ذخیره می‌شوند و producer ‏G14b هنگام export آن‌ها را اعتبارسنجی یا حذف می‌کند.** این دو فیلد PII نیستند و محتوای عمومی نوشته‌ی خود کسب‌وکارند |
| **OQ-5** | نام و نسخه‌ی snapshot | A: ‏`core-publication-snapshot-v1` واحد | **A** |
| **G14a-2** | پیاده‌سازی migration، schema، PublicationService و آزمون‌ها | | **مجاز شود**. فقط DB یک‌بارمصرف روی 5499 · **اعمال روی DB محلی نه**؛ آن G14a-3 است |

**پاسخ پیشنهادی مالک:**
> «CCR ستون published_content تصویب شد؛ OQ-1 تا OQ-5 طبق توصیه‌ی نگهبان (OQ-4 به‌صورت A′)؛ G14a-2 مجاز است.»

## ۳. دستور Codex — G14a-2 (فقط پس از تصویب مالک صادر می‌شود)

نگهبان پس از پاسخ مالک، تصمیم را ثبت می‌کند و این دستور را با pin همان ثبت آزاد می‌کند.

```
INSTRUCTION_ID: CODEX-20260914-G14A2-PUBLISHED-CONTENT-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved the CCR (sha256 95f4a3a1...), OQ-1..OQ-5 as recorded, and G14a-2.
MODE: IMPLEMENTATION on codex/core-g14a-published-content on top of ee25ead. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

1 CCR: status DRAFT -> APPROVED; record the owner decisions OQ-1..OQ-5 exactly as in the approval record
  (OQ-4 = A-prime); fix Z2 (migration.sql:440-451 -> :591-593). No other CCR change.
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

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a-1 و G14a-1b | CCR ‏`published_content` | ✅ آماده‌ی تصویب · شاخه منتشر شد |
| **تصویب CCR، OQ-1 تا OQ-5 و G14a-2** | | ⏳ **تصمیم مالک** |
| G14a-3 | اعمال migration روی DB محلی، با backup | ⏳ تصویب جدا |
| G14b و G14c | | ⏳ تصویب جدا |

من کلاد هستم
