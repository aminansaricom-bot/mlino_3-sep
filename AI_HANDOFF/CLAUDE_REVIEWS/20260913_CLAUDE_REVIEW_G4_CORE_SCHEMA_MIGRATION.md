# بازبینی نگهبان معماری — G4: اعمال CCR در `schema.prisma` و migration محصول

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G4_CORE_SCHEMA_MIGRATION_REPORT.md`
**Commitها:** `3853f97` (اجرایی) · `f47c852` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`، مبنا `6b62509`
**دستور اجراشده:** `CODEX-20260913-G4-CORE-SCHEMA-MIGRATION-001` · **تصویب مالک:** `CCR Core Foundation Schema at fcddfc2 is APPROVED`

---

## تصمیم

# `APPROVED_NEXT_STEP`

- **G4 — PASS.** نخستین تغییر واقعی فایل منجمد `schema.prisma` دقیقاً همان است که تصویب شد، نه بیشتر و نه کمتر.
- **گام بعد: G5 — سازگاری V1** — build، type-check و آزمون کامل V1 روی Prisma Client تازه، **در مقایسه با مبنای پیش از G4.**
- ادغام با `main` و اعمال migration روی هر پایگاه داده‌ی دارای داده، **دروازه‌های جداگانه‌ی بعدی‌اند** و تصمیم مالک لازم دارند.

---

## ۱. راستی‌آزمایی مستقل

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| **دامنه** | `git diff --name-status 6b62509..f47c852` | ✅ فقط `schema.prisma` (M)، migration تازه (A)، `package.json` و `package-lock.json` (M)، CCR (M)، ۳۲ فایل `g4`، گزارش، Handoff (صفر خط حذف). **هیچ مسیر ممنوعی** |
| **migrationهای موجود و `migration_lock.toml`** | diff | ✅ صفر تغییر |
| **`schema.prisma` فقط افزودنی** | فایل قبلی باید پیشوند دقیق فایل جدید باشد | ✅ **پیشوند دقیق** — هیچ مدل، enum، generator یا datasource موجودی تغییر نکرده |
| **بلوک افزوده = CCR مصوب** | مقایسه با بلوک `CCR_CORE_MODELS` در `fcddfc2` (از `git show`) | ✅ **برابر** — تنها تفاوت یک خط خالی جداکننده در ابتداست |
| **CCR فقط خط وضعیت** | `git diff fcddfc2..f47c852` | ✅ فقط `DRAFT` → `APPROVED — مصوب مالک، ۲۰۲۶-۰۹-۱۳` + یک خط ارجاع تصویب. **بقیه‌ی متن همان blob مصوب است** |
| **ترکیب migration** | خواندن فایل ۱۰۰۹ خطی | ✅ header ردیابی (CCR · `fcddfc2` · فهرست حفاظت‌شده) → SQL تولیدی Prisma، **کلمه‌به‌کلمه برابر** `g3b/sql/generated-core-migration.sql` → **بلوک §۶ CCR، بایت‌به‌بایت** در انتها · ۱۳ `CREATE TRIGGER` (۱۲ فهرست بسته + Trigger تغییرناپذیری Verification) |
| **نام migration** | ls | ✅ `20260913010000_add_core_foundation` — پس از `20260910020000` |
| **pin Prisma** | diff | ✅ `package.json`: فقط دو specifier → `"5.22.0"` · `package-lock.json`: فقط همان دو خط (۲+/۲−)؛ نسخه‌ی resolve‌شده از قبل 5.22.0 بود |
| **deploy شش migration** | `migrate-deploy.log` | ✅ هر شش به ترتیب: «All migrations have been successfully applied» |
| **پایگاه داده‌ی یک‌بارمصرف** | `environment.log` · `container-*.log` | ✅ `mlino-g4-validation` · **tmpfs، بدون volume** · نه `mlino-v1-local-db` |
| **drift پس از deploy** | `post-deploy-drift.log` | ✅ `-- This is an empty migration.` |
| **آزمون‌ها** | جست‌وجو در logs | ✅ **۴۹ PASS · صفر FAIL** — C1 تا C15 · T1 تا T12 · W1: «Prisma direct-scalar cross-tenant write rejected with P2003» |
| **اثر انگشت `_PUSH_STAGING`** | بازمحاسبه‌ی مستقل | ✅ هر چهار پوشه برابر مبنا |
| **پاک‌سازی** | ls · docker · logها | ✅ container صفر · `g4-tooling` حذف شد |
| **checksumها** | `SHA256SUMS.txt` در برابر blobهای git | ✅ ۳۸ ورودی؛ نمونه‌ها بدون عدم‌تطابق — قاعده‌ی LF رعایت شده |
| **`main` و V2** | fetch | ✅ `main` = `472de7e` (رکوردهای نگهبان) · V2 = `f4d326f` — دست‌نخورده |

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ دقیقاً متن مصوب CCR |
| ۲ | مشخصات مصوب | ✅ CCR `fcddfc2` · D1 تا D6 · D3 (pin) اعمال شد |
| ۳ | Core و ماژول | ✅ بدون جدول صنفی · بدون FK به جدول‌های V1 یا `external_workspace_links` (D4) |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت و اجازه | ✅ W1 `P2003` روی شِمای واقعی |
| ۶ | ایمنی migration | ✅ فقط افزودنی · زنجیره‌ی کامل از صفر · drift صفر · header حفاظتی · هیچ اجرایی روی DB دارای داده |
| ۷ | بدهی فنی | ✅ بدون مورد تازه |

**تنها باقی‌مانده — درست، طبق دستور:** build، type-check و آزمون V1 روی Client تازه اجرا نشده است → **G5.**

---

## ۳. هشدار ایمنی برای G5 — آزمون‌های V1 داده را پاک می‌کنند

`implementation/jest.config.js` صریحاً می‌گوید آزمون‌های یکپارچه روی **یک Postgres واقعی** اجرا می‌شوند و **پس از هر آزمون جدول‌ها را سراسری پاک می‌کنند.**

**اگر `DATABASE_URL` به `mlino-v1-local-db` اشاره کند، داده‌ی آن پایگاه پاک می‌شود.**

پس در G5:
- **هرگز** `npm run db:up` یا `docker compose`
- **هرگز** `DATABASE_URL` به `mlino-v1-local-db` یا volume آن
- فقط container یک‌بارمصرف با tmpfs و `--rm`
- `--runInBand`، چون آزمون‌ها یک DB مشترک دارند

---

## ۴. گام بعد

### Next Task
**G5 — سازگاری V1 با شِما و Client تازه:**
- در **دو worktree موقت** بیرون از مخزن: مبنا `6b62509` (پیش از G4) و G4 `f47c852`
- برای هر کدام: `npm ci` از lockfile · `prisma generate` · `npm run build` · deploy migrationها روی DB یک‌بارمصرف · `npm test -- --runInBand`
- **مقایسه‌ی نتایج:** G4 نباید هیچ شکست تازه‌ای نسبت به مبنا داشته باشد
- **بدون هیچ تغییر کد**

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G5-V1-COMPATIBILITY-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G4_CORE_SCHEMA_MIGRATION.md
DECISION: APPROVED_NEXT_STEP

TASK:
Prove V1 still builds and passes its test suite with the new Core schema and regenerated Prisma Client,
compared with the pre-G4 baseline. Validation only; no code change.

SAFETY (non-negotiable):
- V1 integration tests perform GLOBAL table cleanup. NEVER point DATABASE_URL at mlino-v1-local-db or its
  volume implementation_mlino_v1_local_db_data. NEVER run npm run db:up / docker compose.
- Only disposable PostgreSQL 16 containers: --rm, tmpfs data dir, no named volume, one per run.
- Connection strings only in environment variables; never in files or logs.
- Never write in C:\mlino code\_PUSH_STAGING.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>.
1. Create two temporary detached worktrees OUTSIDE the repo (e.g. %TEMP%\g5-base at 6b62509 and %TEMP%\g5-core
   at f47c852). Do not use the existing core-prisma-foundation worktree.
2. In each worktree's implementation/: npm ci (from the lockfile; if the registry is unreachable: STOP and report);
   CHECKPOINT_DISABLE=1 npx prisma generate (writes only into that temp worktree's node_modules);
   npm run build; record exit code and TypeScript error count.
3. For each: start a fresh disposable container; npx prisma migrate deploy (baseline: 5 migrations; G4: 6);
   npm test -- --runInBand with DATABASE_URL pointing at that container. Record per-spec-file pass/fail and totals.
4. For G4 only: list Prisma.ModelName and confirm the 12 new Core models plus all existing models are present.
5. Compare baseline vs G4: build status, TS error count, and the set of passing tests. Any test that passes on
   baseline but fails on G4 is a G5 FAIL: record it, do NOT fix anything, STOP after reporting.
   Pre-existing baseline failures are reported as such, not attributed to G4.
6. Teardown: containers removed; git worktree remove --force both temp worktrees; git worktree prune;
   record command output. No dist/ or node_modules content may be committed.
7. Evidence in mlino2/validation/g5/ (new). Report AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G5_V1_COMPATIBILITY_REPORT.md
   (10 sections, REVIEW_REFERENCE, BASE_COMMIT, comparison table). Append to mlino2/HANDOFF/HANDOFF_STATE.md.
   Commit only allowed files. Push. STOP. Await Architecture Guardian review.
```

### Allowed files — فقط شاخه‌ی `codex/core-prisma-foundation`
- `mlino2/validation/g5/**` — تازه
- `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G5_V1_COMPATIBILITY_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- **هر فایل زیر `implementation/**`** — کد، آزمون، `schema.prisma`، migrationها، `package.json`، lockfile، `dist/`
- **هر تلاش برای «رفع» شکست** — فقط گزارش
- `DATABASE_URL` یا هر اتصالی به `mlino-v1-local-db` · `docker compose` · `npm run db:up`
- هر نوشتن در `C:\mlino code\_PUSH_STAGING`
- commit کردن `node_modules` یا `dist`
- `mlino2/validation/g1b|g1c|g3|g3b|g4/**` · ADRها · `mlino_book/**` · فایل‌های ریشه‌ی `AI_HANDOFF`
- شاخه‌ی V2 · `main` · `merge`، `rebase`، `cherry-pick`، `push --force`
- هر گام پس از گزارش G5 بدون بازبینی نگهبان

---

## ۵. پیش‌نمایش دروازه‌های بعدی — برای تصمیم آینده‌ی مالک

| دروازه | موضوع | وضعیت شناخته‌شده |
|---|---|---|
| **G6** | ادغام `codex/core-prisma-foundation` در `main` | پیش‌نمایش `git merge-tree`: **بدون تعارض** (`main` ۴ commit جلو، شاخه‌ی Core ۸ commit جلو) · تصمیم مالک + PR |
| **G7** | اعمال migration روی `mlino-v1-local-db` یا هر محیط دارای داده | **تصمیم جداگانه‌ی مالک** · پشتیبان‌گیری پیش از اعمال · طرح rollback §۱۲ CCR |
| بعد | کد سرویس و Repository روی مدل‌های تازه — با W1 به‌عنوان قاعده‌ی الزامی | پس از G6 |

---

## ۶. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| G1 | ✅ با شرط بسته |
| G2 | ✅ بسته |
| G3 | ✅ بسته (تصویب مالک) |
| **G4** | ✅ **بسته** |
| **G5** | ⏳ آزاد — سازگاری V1 |
| G6 · G7 | منتظر G5 و تصمیم مالک |

من کلاد هستم
