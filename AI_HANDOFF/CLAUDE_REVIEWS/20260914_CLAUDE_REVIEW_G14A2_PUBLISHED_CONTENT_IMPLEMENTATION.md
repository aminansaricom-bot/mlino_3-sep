# بازبینی نگهبان معماری — G14a-2: پیاده‌سازی `published_content`

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** Codex این سه commit را محلی ساخت و **نگهبان روی سرور منتشر کرد:**
- `39d9184` (کد)
- `5228644` (گزارش و Handoff)
- `9cb193e` (قالب گزارش)
- پایه: `ee25ead`

## حکم: `APPROVED_WITH_FIXES`

**کد محصول درست است و تغییری لازم ندارد.** migration، schema و `PublicationService` دقیقاً مطابق CCR مصوب‌اند.

ولی **چهار آزمون از پنج آزمون ایمنی اصلی فقط «هر خطایی» را قبول می‌کنند،** و پنجمی ویژگی ادعاشده را اثبات نمی‌کند:
- آزمون‌های CHECK و تغییرناپذیری: `rejects.toBeTruthy()`
- آزمون رد migration: رد شدن migration روی DB غیرخالی را اثبات نمی‌کند.

این همان الگوی B6 در G10a است. یک دور کوچک فقط-آزمون (G14a-2b) لازم است. هیچ کدی عوض نمی‌شود.

---

## ۱. راستی‌آزمایی

commitها را فقط خواندنی از object store مشترک بررسی کردم. git config نوشته نشد.

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `ee25ead..9cb193e`: فقط ۷ فایل مجاز · Handoff فقط الحاقی · worktree تمیز · migration قدیمی، سایر serviceها، HTTP، Dockerfile، tsconfig و V2 دست‌نخورده |
| **hashها** | ✅ برابر گزارش: migration ‏`7b424e9c…` · schema ‏`9a4dd47c…` · service ‏`03250e13…` · spec ‏`ff1db15d…` |
| **CCR** | ✅ APPROVED · OQ-1 تا OQ-5 مطابق ثبت تصویب · Z2 اصلاح شد (`:591-593`) · تغییر دیگری ندارد |
| **container آزمایشی** | ✅ `mlino-g14a2-testdb` وجود ندارد |
| **runtime** | ✅ بدون تغییر: read-api ‏`a07858b3` · DB StartedAt ‏`2026-09-12T21:34:05.613Z` · ۰ restart · **۶ migration** · registry=4 · `publications`=0 · **ستون `published_content` روی DB محلی وجود ندارد**، پس هیچ اعمال زودهنگامی رخ نداده است |
| **آزمون‌ها** | ✅ هر ۱۴ نام آزمون گزارش واقعاً در spec هست. این نخستین گزارش بدون ادعای بیش از واقعیت در این شاخه است |

## ۲. بازبینی کد

| جنبه | نتیجه |
|---|---|
| **migration** | ✅ عین CCR: `BEGIN` → `LOCK … ACCESS EXCLUSIVE` → preflight → ستون → CHECK (با `?` برای هر دو کلید) → `COMMIT` · N1: شاهد پذیرش در Prisma 5.22.0 ثبت شده است |
| **schema** | ✅ فقط یک فیلد `publishedContent Json? @db.JsonB` |
| **قفل و خواندن** | ✅ `lockTarget` ستون‌های allowlist را **در همان `SELECT … FOR UPDATE`** می‌خواند (برای هر هدف جدا، بدون `Prisma.raw(table)`) · OfferVersion ستون‌های محتوا را زیر قفل نسخه می‌خواند · `lockOrganization` پیش از همه‌ی این‌ها، پس `linkCapability` هم‌زمان ممکن نیست |
| **allowlist** | ✅ هر snapshot فیلدبه‌فیلد ساخته می‌شود و **هیچ spreadی از ردیف ندارد** · `category_key` و `capability_status` در snapshot نیستند (OQ-2 A) · مختصات با `toFixed(6)` تبدیل می‌شوند و هر دو تهی‌اند اگر یکی تهی باشد · قیمت رشته است · زمان‌ها ISO · شناسه‌ی پیوندها یکتا و مرتب |
| **OQ-4 A′** | ✅ `sanitizeObject` فقط کلیدهای مجاز با مقدار رشته‌ای، و `public_social` فقط به‌صورت آرایه‌ی رشته · `business_hours` و `terms` همان‌طور که هستند |
| **null** | ✅ `Prisma.DbNull` برای هر WITHDRAWN، شامل برداشت در REPLACED · `ALREADY_PUBLISHED` پیش از INSERT برمی‌گردد · D6 بدون تغییر |
| جزئی | 🟢 اگر `contact_information` کلید مجازی نداشته باشد، `{}` ذخیره می‌شود نه `null`. با DTO سازگار است و اصلاح نمی‌خواهد · import بلااستفاده‌ی `requireMembershipPermission` حذف شده است |

## ۳. یافته‌ها (فقط آزمون)

| # | شدت | یافته | اصلاح لازم |
|---|---|---|---|
| **T1** | 🟡 | **`g14a2-c7-01`، `-02` و `-12`** رد شدن را فقط با `rejects.toBeTruthy()` می‌سنجند. هر خطای دیگری هم آزمون را سبز می‌کند، مثل FK، projection trigger، validation پریزما یا شکل غلط fixture. پس **اثبات نمی‌کنند که CHECK تازه عامل رد بوده است** | هر رد با **نام قید** سنجیده شود: `rejects.toThrow(/publication_published_content_event_kind_check/)` · مورد مثبتِ هر رد هم با همان fixture (همان داده، فقط `published_content` معتبر) موفق شود تا ثابت شود fixture سالم است |
| **T2** | 🟡 | **`g14a2-c7-07`** هم `toBeTruthy()` است | `rejects.toThrow(/publications are append-only/)` |
| **T3** | 🟡 | **`g14a2-c7-10` ویژگی ادعاشده را اثبات نمی‌کند.** فقط بلوک `DO` را جدا اجرا می‌کند و بعد وجود ستون را روی DBی بررسی می‌کند که migration از قبل رویش اعمال شده. سناریوی واقعی، یعنی **خود فایل migration روی DB غیرخالی رد شود و ستونی نماند**، فقط در متن گزارش آمده است و قابل تکرار نیست | **اسکریپت تکرارپذیر همراه لاگ commit شود:** `mlino2/validation/g14a2/` که روی یک DB یک‌بارمصرف تازه، migrationها را تا `20260913010000` اعمال کند، یک Publication معتبر بکارد، `prisma migrate deploy` را اجرا کند، و این‌ها را ثبت کند: شکست deploy، یک ردیف failed در `_prisma_migrations`، و **نبود ستون `published_content`**. نام آزمون `c7-10` هم با آنچه واقعاً اثبات می‌کند هم‌خوان شود («preflight SQL rejects…») |
| **T4** | 🟢 | خطر ریسک ۸ در گزارش: Prisma پیام P0001 را نشان نمی‌دهد | در همان لاگ T3، متن کامل خطای deploy ثبت شود. اگر پیام سفارشی در لاگ PostgreSQL یا `_prisma_migrations.logs` هست، نشان داده شود. برای runbook ‏G14a-3 کافی است |

---

## ۴. دستور Codex — G14a-2b (فقط آزمون و شاهد؛ commit محلی)

```
INSTRUCTION_ID: CODEX-20260914-G14A2B-PUBLISHED-CONTENT-TEST-HARDENING-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES - within the owner's G14a-2 approval; no new approval needed.
MODE: TESTS AND EVIDENCE ONLY - LOCAL commits on codex/core-g14a-published-content on top of 9cb193e.
      NO change to publication-service.ts, schema.prisma, the migration or the CCR.

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP. Never touch credentials.

T1 implementation/test/core/g14a2-published-content.spec.ts, tests c7-01, c7-02 and c7-12: assert every rejection
   with rejects.toThrow(/publication_published_content_event_kind_check/). For each rejected direct insert, add a
   positive control with the SAME fixture shape and a valid published_content (or SQL NULL for WITHDRAWN) that
   succeeds, proving the fixture itself is valid.
T2 c7-07: rejects.toThrow(/publications are append-only/).
T3 c7-10: rename it to state exactly what it proves (the preflight SQL rejects a non-empty table). ADD a
   reproducible migration-refusal validation:
   - mlino2/validation/g14a2/ with a script plus its output log
   - a fresh disposable DB (its own tmpfs container on 127.0.0.1:5499, or a second database in it)
   - migrations applied up to and including 20260913010000_add_core_foundation only
   - one valid Publication seeded (through the Core services or valid SQL)
   - then `prisma migrate deploy`
   - the log shows: deploy failed; one failed row for 20260914010000_add_publication_published_content in
     _prisma_migrations; zero rows in information_schema.columns for publications.published_content
   - the log contains no passwords or connection strings
T4 In the same log, capture the full deploy error text, plus the P0001 message if it is visible anywhere
   (_prisma_migrations.logs or the server log).
Rerun on a disposable 5499 container (the DB guard applies): the focused spec and the full V1 + core suite; report
exact counts. Remove every container you created; record the before/after container and volume lists.

REPORT: append a section "G14a-2b" to AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION_REPORT.md
- T1-T4 -> the exact assertion or file -> result
- the suite totals; the LF sha256 of the spec and of the validation script and log; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- implementation/test/core/g14a2-published-content.spec.ts
- mlino2/validation/g14a2/** (new)
- the report (append a section); mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to product code, schema.prisma, migrations or the CCR
- applying anything to mlino-v1-local-db; port 5435; docker compose; other containers or volumes
- _PUSH_STAGING; any push; git config/safe.directory; credentials
```

**پس از G14a-2b:**
1. بازبینی کوتاه نگهبان.
2. **بسته‌ی مالک:** ادغام G14a (CCR، migration، service و آزمون‌ها) در main، و سپس G14a-3، یعنی اعمال migration روی DB محلی با backup. G14a-3 تصویب جدا می‌خواهد و در همان بسته پرسیده می‌شود.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a-2 | پیاده‌سازی | ⚠️ APPROVED_WITH_FIXES: کد ✅ · آزمون‌ها سخت‌تر شوند |
| **G14a-2b** | **T1 تا T4** | ▶️ صادر شد |
| ادغام در main و G14a-3 | | ⏳ پس از G14a-2b، تصمیم مالک |

من کلاد هستم
