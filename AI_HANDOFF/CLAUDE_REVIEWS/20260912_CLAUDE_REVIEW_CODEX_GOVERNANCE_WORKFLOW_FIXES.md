# بازبینی نگهبان معماری — اصلاحات گردش‌کار حاکمیتی (GW1 تا GW6)

**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_GOVERNANCE_WORKFLOW_FIXES_REPORT.md`
**Commitها:** `0b26e8b` (اصلاحات) · `ebca267` (گزارش و Handoff) — مبنا `1010db7`
**دستور اجراشده:** `CODEX-20260912-GOVERNANCE-WORKFLOW-FIXES-001`
**REVIEW_REFERENCE گزارش:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_LOOP.md @ 7e5c6e0` ✅

---

## تصمیم

# `APPROVED_NEXT_STEP`

- هر شش اصلاح **دقیق و در دامنه** اعمال شده‌اند.
- **G1c آزاد می‌شود.** پیش‌شرط دستور `CODEX-20260912-G1C-VALIDATION-001` — «تأیید اصلاح گردش‌کار روی `origin/main`» — **با انتشار همین بازبینی برقرار است.**

---

## ۱. راستی‌آزمایی

| بررسی | نتیجه |
|---|---|
| remote | ✅ `origin/codex/v2-intent-flow-foundation` = `ebca267` = HEAD محلی |
| دامنه‌ی فایل‌ها | ✅ کل diff از `1010db7`: **فقط ۳ فایل مجاز** — ۱۳۵ درج، ۳ حذف |
| `0b26e8b` | ✅ فقط `CODEX_GOVERNANCE_WORKFLOW.md` |
| `ebca267` | ✅ فقط گزارش تازه + `mlino2/HANDOFF/HANDOFF_STATE.md` |
| **Handoff فقط افزودنی** | ✅ **صفر خط حذف‌شده** |
| ۳ خط حذف‌شده در سند | ✅ فقط دو بند قدیم §۵ — **با نسخه‌ی گسترش‌یافته جایگزین شدند**، محتوای قبلی حفظ شده است |
| hash گزارش در Handoff | ✅ `4feb8ba3…` = hash فایل commitشده (LF) — **دقیق** |
| فایل‌های ممنوع | ✅ دست‌نخورده: `CLAUDE_LATEST_REPORT.md` · `HANDOFF_STATE.md` ریشه · `CODEX_NEXT_INSTRUCTION.md` · `CLAUDE_REPORTS/**` · `implementation/**` · `validation/**` |
| سرآیند گزارش (GW3) | ✅ `REVIEW_REFERENCE` با commit · `BASE_COMMIT` · اعلام صریح «هیچ اقدام محیطی» |
| رعایت GW2 در خود اجرا | ✅ `git fetch` + `git show origin/main:…` ثبت شده |
| توقف | ✅ G1c شروع نشده؛ هیچ commit بعدی |

## ۲. تطبیق اصلاحات

| # | در سند | ارزیابی |
|---|---|---|
| GW1 | §۱ «زنجیره‌ی اختیار» | ✅ مالک مرجع نهایی · CCR در G3 · تعارض → توقف و ثبت |
| GW2 | §۲ | ✅ مسیر `CLAUDE_REVIEWS` روی `origin/main` · `fetch` + `git show` · `ls-tree` پیش از اعلام «ناموجود» |
| GW3 | §۳ گام ۲ | ✅ `REVIEW_REFERENCE` + commit مبنا · «دستور مستقیم مالک» · شاهد فرمان برای ادعای محیطی |
| GW4 | §۴ | ✅ سه فایل ممنوع · Handoff فقط افزودنی در `mlino2/HANDOFF/` · گزارش فقط در `CODEX_REPORTS/` |
| GW5 | §۳ گام ۳ | ✅ توقف در نخستین نقطه‌ی امن + فهرست اصلاحات اعمال‌شده و نشده |
| GW6 | §۵ | ✅ مرجع فعال = `mlino2/HANDOFF/HANDOFF_STATE.md` · فایل ریشه مال main · گزارش‌های تاریخی بدون انتقال و فهرست |

## ۳. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ فرایندی؛ «Codex تصمیم معماری نمی‌گیرد» حفظ شد |
| ۲ | مشخصات مصوب | ✅ دقیقاً GW1 تا GW6 |
| ۳ | Core و ماژول | ✅ بی‌ارتباط |
| ۴ | چند Vertical | ✅ بی‌ارتباط |
| ۵ | امنیت و اجازه | ✅ زنجیره‌ی اختیار صریح؛ دور زدن بازبینی بسته شد |
| ۶ | ایمنی migration | ✅ «بدون Gate، schema یا migration نه» حفظ شد |
| ۷ | بدهی فنی | ✅ منبع تعارض ادغام (فایل‌های ریشه) بسته شد |

**نکته‌ی غیرمسدودکننده:** سرآیند سند هنوز فقط `CODEX-GOVERNANCE-LOOP-SETUP-001` را نشان می‌دهد. در نخستین ویرایش بعدی، یک خط «تاریخچه‌ی نسخه» با ارجاع به `0b26e8b` بیفزایید. **اقدام فوری لازم نیست.**

---

## ۴. گام بعد

### Next Task
**G1c — تکمیل اعتبارسنجی G1** — موارد G1c-1 تا G1c-12 طبق §۶ بازبینی `20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md`.

**وضعیت محیط در لحظه‌ی این بازبینی:**
- volume یتیم `9097eb28…` هنوز وجود دارد → G1c-11
- `origin/main` = `7e5c6e0`، پیش از commit این بازبینی

### TARGET_HANDOFF_ID
`HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-G1C-VALIDATION-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md
RELEASED_BY: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_WORKFLOW_FIXES.md (APPROVED_NEXT_STEP)
SUPERSEDES: CODEX-20260912-G1B-COMPLETION-001 (never delivered)
PRECONDITION: satisfied - governance workflow fixes approved (this release).
DECISION: APPROVED_WITH_FIXES (G1b) -> execute G1c

TASK:
Complete G1 validation as G1c (items G1c-1..G1c-12, section 6 of the G1b review). Validation fixture only.

STEPS:
0. git fetch origin. Read both reviews via git show origin/main:<path>. Record BASE_COMMIT.
1. Create mlino2/validation/g1c/. Do NOT modify mlino2/validation/g1b/** (checksummed evidence).
2. Tooling: prisma@5.22.0 + @prisma/client@5.22.0 in a temp folder OUTSIDE the repo.
   No repo-root package.json/package-lock.json/node_modules.
3. Disposable PostgreSQL 16 container started with --rm (or removed with docker rm -v).
   Never touch mlino-v1-local-db or volume implementation_mlino_v1_local_db_data.
4. G1c-5: apply the five origin/main migrations
   (git show origin/main:implementation/prisma/migrations/<name>/migration.sql into the temp folder),
   then the Core fixture. Never write into implementation/.
5. Fixture shape per G1c-2 (publication performer = membership + composite FK + reason + occurred_at),
   G1c-3 (verification organization_id + composite FK), G1c-4 (optional composite relation with shadow
   organization column + C6 CHECK), G1c-7 (C2 with identity_provider, C3 grant table, circular
   Organization<->Membership).
6. Tests: G1c-1 (C15 leak: same transaction other target; after ROLLBACK TO SAVEPOINT; labeled
   pg_trigger_depth() variant), G1c-4, G1c-6 (--from-migrations + shadow DB; record exact commands),
   G1c-7 (incl. DELETE FROM publications, FY2, wrong-order replacement -> 23505),
   G1c-8 (advisory-lock barriers; 20 runs READ COMMITTED + 20 runs SERIALIZABLE),
   G1c-10 (W1 direct-scalar write expecting P2003/23503; W2 fixture variant without the redundant
   OfferVersion.organization relation). Every negative test asserts its expected code (G1c-9).
7. G1c-11: remove only orphan volume 9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1;
   record docker volume ls output before and after.
8. Write mlino2/PRISMA_G1C_VALIDATION_REPORT.md and
   AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G1C_VALIDATION_REPORT.md
   (10 sections, REVIEW_REFERENCE, BASE_COMMIT, SHA256SUMS for g1c, command output for every
   environment claim, explicit correction of the four G1b claims in G1b review section 3,
   verdict per mlino_book/MLINO_G1_CLOSURE_REVIEW.md section 8).
9. Append to mlino2/HANDOFF/HANDOFF_STATE.md. Commit only allowed files. Push.
10. STOP. Await Architecture Guardian review.
```

### Allowed files — فقط شاخه‌ی `codex/v2-intent-flow-foundation`
- `mlino2/validation/g1c/**` — تازه
- `mlino2/PRISMA_G1C_VALIDATION_REPORT.md` — تازه
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G1C_VALIDATION_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- `mlino2/validation/g1b/**` — شواهد checksumدار
- `implementation/**` — schema، migrationها، کد، `package.json` و lockfile
- ADRها · اسناد طراحی · سند حل موانع · طرح‌های اعتبارسنجی · `mlino2/PRISMA_G1B_CLOSURE_REPORT.md` · `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md`
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md` · `AI_HANDOFF/CLAUDE_REPORTS/**`
- `package.json`، `package-lock.json` یا `node_modules` در ریشه
- هر container یا volume دیگر — به‌ویژه `mlino-v1-local-db` و `implementation_mlino_v1_local_db_data`
- اعمال W1، W2 یا P1 تا P12 در اسناد طراحی — **فقط fixture**
- هر اعتبارنامه یا رشته‌ی اتصال در فایل‌ها یا logها
- `merge`، `rebase`، `cherry-pick`، `push --force`
- هر گام پس از گزارش G1c بدون بازبینی نگهبان

---

## ۵. برای مالک

- **G1c آزاد است.** دستور بالا را به Codex بدهید.
- پس از G1c: اگر G1 بسته شود، مسیر بعدی به ترتیب **G2** (همگام‌سازی شاخه) و **G3** (CCR، با تصمیم شما روی W1، W2 و pin نسخه‌ی Prisma روی 5.22.0) است.
- **`schema.prisma` تا بسته شدن هر سه Gate مسدود می‌ماند.**

من کلاد هستم
