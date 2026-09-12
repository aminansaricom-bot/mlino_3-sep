# بازبینی نگهبان معماری — G2: شاخه‌ی Core Prisma

**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G2_CORE_BRANCH_REPORT.md` — روی شاخه‌ی تازه
**شاخه:** `codex/core-prisma-foundation`
**Commitها:** `2cf6caa` (محتوا) · `ee7fb95` (گزارش و Handoff) — مبنا `28438f2` (`origin/main`)
**دستور اجراشده:** `CODEX-20260912-G2-CORE-BRANCH-001` · **TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION` · **تأیید مالک بر گزینه‌ی C:** ثبت‌شده

---

## تصمیم

# `APPROVED_NEXT_STEP`

## حکم دروازه: **G2 — PASS** (با یک شرط مستندسازی: G2-C1)

- شاخه‌ی Core **دقیقاً** طبق گزینه‌ی C ساخته شد و **هر ادعای ساختاری گزارش** با راستی‌آزمایی مستقل تأیید شد.
- **شرط G1-C3 (قابل‌حمل کردن checksumها) هم با این G2 بسته شد.**
- **گام بعد: G3 — پیش‌نویس CCR شِمای Core + اعتبارسنجی متن دقیق آن** (بند ۵).

---

## ۱. راستی‌آزمایی مستقل

| بررسی | نتیجه |
|---|---|
| مبنای شاخه | ✅ `merge-base(new, origin/main)` = **`28438f2`** = سر `main` در لحظه‌ی ساخت · صفر commit عقب |
| تاریخچه | ✅ دو commit خطی (`2cf6caa` ← `28438f2`؛ `ee7fb95` ← `2cf6caa`) · **بدون merge، rebase یا cherry-pick** |
| دامنه | ✅ `git diff --name-status 28438f2..ee7fb95`: **فقط ۱۱ فایل، همه `A` (افزوده)** — دقیقاً فهرست مجاز |
| **۷ سند بایت‌به‌بایت** | ✅ **git blob ID** هر هفت فایل در منبع (`f4d326f`) و مقصد **یکسان** — قوی‌ترین شکل اثبات |
| `.gitattributes` | ✅ دقیقاً `mlino2/validation/** -text` |
| `implementation/**` | ✅ diff خالی |
| شاخه‌ی V2 و `main` | ✅ V2 روی `f4d326f`، `main` روی `28438f2` — **دست‌نخورده** |
| worktree جدا | ✅ `core-prisma-foundation` جدا از clone V2؛ سه فایل untracked قدیمی دست‌نخورده |
| **manifest شواهد** | ✅ **۸۳ از ۸۳** مسیر `g1b` (۳۵) + `g1c` (۴۸) با SHA-256 **blob git (LF)** — هر ۸۳ مقدار را نگهبان مستقلاً از `git show` بازمحاسبه کرد و **همه برابرند** · hash خود manifest: `546bc02b…` ✅ |
| Handoff تازه | ✅ `HANDOFF-20260912-CORE-PRISMA-FOUNDATION` با REVIEW_REFERENCE، OWNER_CONFIRMATION، BASE و SOURCE |
| hash گزارش در Handoff | ✅ `e88fdbba…` = blob |
| پاک‌سازی | ✅ نه `package.json`، نه `node_modules` در پوشه‌ی والد یا ریشه‌ی مخزن — نگهبان مستقلاً دید |
| صداقت گزارش | ✅ دو رخداد ثبت شد: `npm init` اشتباه در پوشه‌ی والد و گیر کردن اولین دانلود ابزار — **گزارش شد و پاک شد** |

---

## ۲. یافته — G2-C1: جدول hash مبنای Prisma قابل‌حمل نیست

**§۴ گزارش** جدول SHA-256 `schema.prisma` و پنج migration را آورده است. **هر شش مقدار، hash فایل working tree ویندوز با CRLF است، نه محتوای canonical git.**

| فایل | مقدار گزارش (= CRLF working tree) | **SHA-256 canonical — blob git (LF)** |
|---|---|---|
| `implementation/prisma/schema.prisma` | `c26f0de3…` | **`e1c79133597fcaadc2848c692e6651806df43fac6ecdade44378eeb2a86e3b8a`** |
| `…/20260814065924_init/migration.sql` | `976204bf…` | **`e7e2da2abd8fc2e73af3db4c97145e9e8431f904ff8b532b53e426d1e18d7efd`** |
| `…/20260815033018_add_situation_key/migration.sql` | `bc21d148…` | **`3e3d4b30d643ef5f5b28657be34c531e69376f0523eeccf324dfee375474dc72`** |
| `…/20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql` | `4dc85a5c…` | **`a4e4a57b6ca747ad383d66be4060a7e16ed6cad3a1f1e56de2e28e36898cba86`** |
| `…/20260906001500_add_ownership_type/migration.sql` | `845927b4…` | **`584ef0d3ff9c7d6e0640a80ca8da1ebc63e06fb5505fd78b5a663d266db93509`** |
| `…/20260910020000_add_external_workspace_link/migration.sql` | `b4b4087e…` | **`7b00129a49f4430382b2b1f8fcbde9cdd0d583ea371cc9cbd55fd173252b4ac5`** |

- **ادعای «پیش و پس یکسان ماند» درست است** — این فایل‌ها تغییر نکرده‌اند. ولی مقدارها روی ماشین دیگری تکرارپذیر نیستند.
- `21_origin_migration_manifest.txt` در G1c هم همین قاعده‌ی CRLF را داشت (مثلاً `4dc85a5c…`).

**شرط G2-C1 — فقط مستندسازی، در G3:**
- **از این پس هر SHA-256 در CCR، گزارش‌ها و manifestها روی بایت‌های `git show <commit>:<path>` محاسبه می‌شود** (LF canonical)، یا git blob ID ثبت می‌شود.
- جدول بالا مبنای CCR است.
- شواهد تازه زیر `mlino2/validation/**` به‌خاطر `-text` بدون تبدیل ذخیره می‌شوند؛ پس بایت working tree = بایت blob.

---

## ۳. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ هیچ تغییر معماری؛ ADR-0004 و `ExternalWorkspaceLink` دست‌نخورده |
| ۲ | مشخصات مصوب | ✅ دقیقاً G2-1 تا G2-8 |
| ۳ | Core و ماژول | ✅ **مرز V1/Core و V2 حفظ شد** — هیچ کد V2 وارد شاخه‌ی Core نشد و هیچ کد V1 وارد V2 |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت | ✅ بدون secret؛ فقط push شاخه‌ی تازه |
| ۶ | ایمنی migration | ✅ `prisma validate` روی schema منجمد با 5.22.0 · زنجیره‌ی پنج migration دست‌نخورده |
| ۷ | بدهی فنی | ✅ **تعارض Handoff ریشه دیگر وجود ندارد** · شواهد قابل‌حمل شدند · G2-C1 مستندسازی |

---

## ۴. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| **G1** | ✅ PASS WITH CONDITIONS — شرط‌های C1، C2، C4، C5، C6 و C7 منتقل به G3 · **C3 با G2 بسته شد** |
| **G2** | ✅ **PASS** — شرط G2-C1 (قرارداد hash) منتقل به G3 |
| **G3** | ⏳ باز — CCR + تصویب مالک |
| **`schema.prisma`** | ⛔ مسدود تا تصویب CCR |

---

## ۵. G3 — پیش‌نویس CCR و اعتبارسنجی متن دقیق آن

**چرا Codex پیش‌نویس می‌نویسد:** CCR ترجمه‌ی **طراحی مصوب v3** + **شواهد G1c** به متن دقیق Prisma و SQL است — کار اجرایی، نه تصمیم معماری. **پنج تصمیم مالک در CCR به‌صورت خانه‌ی تصمیم می‌آید؛ Codex هیچ‌کدام را انتخاب نمی‌کند.**

### تصمیم‌های مالک — D1 تا D5

| # | تصمیم | پیشنهاد نگهبان |
|---|---|---|
| **D1** | سازوکار C15 | **B1** — `pg_trigger_depth() > 1` + فهرست بسته‌ی Triggerهای مجاز |
| **D2** | W1 و W2 | **W1 الزامی** (tenant فقط از زمینه، به‌صورت ستون مستقیم) · **W2 اختیاری** |
| **D3** | pin نسخه‌ی Prisma | **دقیقاً `5.22.0`** برای `prisma` و `@prisma/client` |
| **D4** | FK `ExternalWorkspaceLink → Organization` در CCR اول | **نه** |
| **D5** | دو قاعده‌ی G1-C4 | **بله** — هر جدول migration در `schema.prisma` مدل شود · نام قیدهای دستی = نام Prisma یا `map:` |

**اگر مالک این پنج تصمیم را همراه دستور بدهد، CCR با همان تصمیم‌ها نوشته می‌شود و پس از بازبینی آماده‌ی تصویب است. اگر ندهد، CCR آن‌ها را `OPEN` نشان می‌دهد و تا بسته شدنشان تصویب‌پذیر نیست.**

### Next Task
**G3 — پیش‌نویس `CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md` + اعتبارسنجی متن دقیق آن روی PostgreSQL یک‌بارمصرف** — سپس توقف.

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-G3-CCR-DRAFT-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
BRANCH: codex/core-prisma-foundation
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G2_CORE_BRANCH.md
DECISION: APPROVED_NEXT_STEP (G2 PASS)
OWNER_DECISIONS: <owner fills D1..D5 here, or writes OPEN>

TASK:
Draft the Contract Change Request for the Core Foundation schema and validate its exact text.
Documentation + disposable validation only. Do NOT modify implementation/prisma/schema.prisma,
implementation/prisma/migrations/**, implementation/package.json or any lockfile.

STEPS:
G3-1 git fetch origin; read the review via git show origin/main:<path>. Work in the
     core-prisma-foundation worktree. Record BASE_COMMIT.
G3-2 Write implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md
     following the section structure of CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md, status
     "DRAFT — pending owner approval", containing:
     a) the problem, motivation and alternatives, based on mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md v3 (all owner decisions PR1..F5);
     b) the full proposed Prisma model/enum text for the 12 Core models (PascalCase models, @@map snake_case plural,
        camelCase fields + @map, TEXT ids, Organization.id without default, @db.Timestamptz(3),
        @@unique([id, organizationId]), explicit @relation names, onDelete: Restrict + onUpdate: Restrict everywhere);
     c) the exact manual SQL for C1..C15 with constraint/index/trigger names; for C15 include the D1 choice,
        or both variants B1 and B2 labeled as alternatives if D1 is OPEN;
     d) the write-path rule (D2), Prisma pin (D3), ExternalWorkspaceLink FK position (D4) and the two G1-C4 rules (D5),
        each as DECIDED (with owner decision) or OPEN;
     e) the migration plan (one migration; generated SQL + appended manual SQL; mandatory SQL review; protected-object
        list), rollback before and after real data, and migration risks;
     f) traceability: every referenced document with commit and SHA-256 over git show bytes (G2-C1), including the
        baseline hash table from review section 2 and G1_EVIDENCE_MANIFEST.md.
G3-3 Validate the CCR's exact text in mlino2/validation/g3/ (new folder; write files with LF endings):
     - temp tooling outside the repo, Prisma 5.22.0, PRISMA_GENERATE_SKIP_AUTOINSTALL=1;
     - build a temp schema = unchanged implementation/prisma/schema.prisma + the CCR model text; prisma validate;
     - disposable PostgreSQL 16 (--rm; never touch mlino-v1-local-db or implementation_mlino_v1_local_db_data):
       apply the five main migrations, then the migration produced by prisma migrate diff --from-migrations
       ... --to-schema-datamodel <temp schema> --shadow-database-url ... --script, then the CCR manual SQL verbatim;
     - assertions with exact expected SQLSTATE/Prisma codes for C1..C15, including C7..C11 on the final text;
       C15 leak tests for each included variant; W1 direct-scalar write -> P2003;
     - second diff after an unrelated field: only that field; inventory identical before/after;
       FK confdeltype/confupdtype = r for every Core FK;
     - SHA256SUMS over the committed bytes; command output for every environment claim; teardown evidence.
G3-4 Write AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G3_CCR_DRAFT_REPORT.md (10 sections, REVIEW_REFERENCE,
     BASE_COMMIT, list of D1..D5 as DECIDED/OPEN). Append to mlino2/HANDOFF/HANDOFF_STATE.md.
     Commit only allowed files; push codex/core-prisma-foundation only.
G3-5 STOP. Await Architecture Guardian review. The CCR becomes APPROVED only by the owner, after that review.
```

### Allowed files — فقط `codex/core-prisma-foundation`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md` — **تازه، تنها فایل مجاز زیر `implementation/`**
- `mlino2/validation/g3/**` — تازه
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G3_CCR_DRAFT_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- `implementation/prisma/**` · `implementation/package.json` · هر lockfile · هر کد، service یا test
- CCRهای موجود · `mlino_book/**` · ADRها · هفت سند منتقل‌شده · `G1_EVIDENCE_MANIFEST.md` · `.gitattributes`
- `AI_HANDOFF/CLAUDE_REVIEWS/**` · `AI_HANDOFF/CLAUDE_REPORTS/**` · `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md`
- **هر تغییر در شاخه‌ی V2 یا push به `main`**
- **انتخاب هر یک از D1 تا D5 بدون تصمیم ثبت‌شده‌ی مالک**
- علامت‌گذاری CCR به‌عنوان `APPROVED`
- `merge`، `rebase`، `cherry-pick`، `push --force`
- هر container یا volume غیر از container یک‌بارمصرف G3 · هر اعتبارنامه یا رشته‌ی اتصال در فایل‌ها
- `package.json`، `package-lock.json` یا `node_modules` در ریشه یا پوشه‌ی والد
- هر گام پس از گزارش G3 بدون بازبینی نگهبان

---

## ۶. برای مالک

1. **پنج تصمیم D1 تا D5** — بهتر است همراه دستور G3 داده شوند تا CCR یک‌باره نهایی شود. پیشنهاد نگهبان در جدول بند ۵ است.
2. سپس دستور `CODEX-20260912-G3-CCR-DRAFT-001` را با پر کردن سطر `OWNER_DECISIONS` به Codex بدهید.
3. **مسیر پس از G3:** بازبینی نگهبان روی CCR → **تصویب شما** → دستور جداگانه برای تغییر `schema.prisma` و ساخت migration.

من کلاد هستم
