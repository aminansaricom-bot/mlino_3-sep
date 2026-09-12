# بازبینی نگهبان معماری — G1b Closure Validation

**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `mlino2/PRISMA_G1B_CLOSURE_REPORT.md` + `mlino2/validation/g1b/**` — commit `ffd07dd` · Handoff `5138a0a`
**دستور اجراشده:** `CODEX-20260912-G1B-CLOSURE-VALIDATION-001` (دستور مستقیم مالک) · **HEAD مبنا:** `76589be` · **شروع:** ۱۵:۵۹:۵۶
**وضعیت اعلام‌شده توسط Codex:** `FAIL — G1B_NOT_CLOSED`

---

## تصمیم

# `APPROVED_WITH_FIXES`

- **G1 همچنان NOT CLOSED است. `schema.prisma`، migration محصول و CCR مسدودند.**
- گام بعد **G1c** است: تکمیل آزمون‌های اجرانشده + آزمون دو قاعده‌ی نامزد نوشتن (W1 و W2) — **فقط در fixture.**
- **شرط شروع:** G1c پس از تأیید اصلاح گردش‌کار (`CODEX-20260912-GOVERNANCE-WORKFLOW-FIXES-001`) آزاد می‌شود.
- **دستور قبلی نگهبان** (`CODEX-20260912-G1B-COMPLETION-001` در بازبینی `20260912_CLAUDE_REVIEW_G1_POSTGRES_VALIDATION.md`) **با این بازبینی جایگزین می‌شود.** آن دستور به Codex نرسید و G1b پیش از انتشارش شروع شده بود.

---

## ۱. زمان‌بندی و مبنا

| رخداد | زمان |
|---|---|
| `MLINO_G1_CLOSURE_REVIEW.md` روی `origin/main` (`421bb24`) | ۱۵:۳۳:۵۹ |
| شروع G1b (`00_environment.txt`) | ۱۵:۵۹:۵۶ |
| انتشار بازبینی نگهبان (`54f4207`) | ۱۶:۰۱:۵۴ |
| commit شواهد G1b (`ffd07dd`) | ۱۶:۰۴:۱۸ |

**نتیجه:** G1b با دستور مستقیم مالک و **هم‌زمان** با بازبینی اجرا شد. **اعمال نشدن FX1 تا FX12 خطای Codex نیست.** این شکاف با GW1 و GW5 گردش‌کار بسته می‌شود.

---

## ۲. آنچه پذیرفته می‌شود

| بخش | پذیرش | ملاحظه |
|---|---|---|
| **R1 — شواهد** | ✅ **پیشرفت بزرگ** | بسته‌ی بازتولیدپذیر: fixture Prisma، SQL دستی، assertions، هم‌زمانی، inventory، migrationهای تولیدشده، لاگ هر گام، **`SHA256SUMS.txt`**، و **حفظ لاگ‌های تلاش اولیه** برای ممیزی. شکاف اصلی G1 بسته شد |
| **R3 — پایداری migration** | ✅ | `prisma migrate diff` از DB زنده → **فقط `ADD COLUMN`**؛ هیچ `DROP` برای ۳ ایندکس جزئی، ۴ CHECK و ۵ Trigger؛ inventory یکسان؛ **۸ FK با `ON DELETE RESTRICT ON UPDATE RESTRICT`**. محدود به گونه‌ی `--from-url` و بدون زنجیره‌ی main — بند ۴ |
| **SQL assertions** | ✅ | شش PASS: FK مرکب بین‌مستأجری (`23503`) · یکتای ادعا · `verified_at` · محافظ projection · rollback · RESTRICT سازمان |
| **هم‌زمانی** | ✅ محدود | یک اجرا، `pg_sleep`، `READ COMMITTED` — نتیجه درست؛ verifier سخت‌گیرانه‌تر شد |
| **یافته‌ی امنیتی** | ✅ **درست و صادقانه گزارش شد** | FAIL پنهان نشد؛ ردیف ذخیره‌شده ثبت شد؛ «NEEDS_DECISION» درست طرح شد — بند ۵ |
| **پاک‌سازی ریشه‌ی مخزن** | ✅ | `package.json`، `package-lock.json` و `node_modules` ریشه حذف شدند — `git status` تمیز است |
| **Prisma 5.22.0** | ✅ | ثبت دقیق نسخه‌ی موتور و hash |

---

## ۳. اصلاح ادعاهای گزارش — راستی‌آزمایی نگهبان

| ادعای گزارش | واقعیت | اثر |
|---|---|---|
| «`MLINO_G1_CLOSURE_REVIEW.md` در working tree، workspaceها و origin/main پیدا نشد» | ❌ **در `origin/main:mlino_book/MLINO_G1_CLOSURE_REVIEW.md` از ۱۵:۳۳:۵۹ هست** (`git ls-tree -r origin/main`) | provenance حل است؛ علت: جست‌وجو فقط در درخت شاخه‌ی Codex → GW2 |
| «Docker: کانتینر disposable بدون volume» | ❌ **volume بی‌نام `9097eb28…` وجود داشت** و **پس از حذف container هنوز باقی است** (`docker volume ls`) | پاک‌سازی ناقص؛ داده‌ی آزمایشی روی دیسک مانده → G1c-11 |
| «R2 — PASS» | ❌ **برچسب نادرست.** در بازبینی بستن G1، **R2 = آزمون نشت C15** بود: (الف) UPDATE مستقیم هدف دیگر پس از درج رخداد در **همان تراکنش**؛ (ب) پس از `ROLLBACK TO SAVEPOINT`؛ (ج) مقایسه با `pg_trigger_depth()`. **هیچ‌کدام در `assertions.sql` نیست.** «تغییر مستقیم» و «rollback» آزمون‌های G1 بودند | **R2 = NOT_EXECUTED** |
| «UPDATE/DELETE روی Publication با trigger رد می‌شود» | ⚠️ فقط **UPDATE** آزموده شد؛ **`DELETE FROM publications`** در assertions نیست | ادعای DELETE بدون شاهد |
| «R4 — PASS بخش SQL» | ⚠️ **جزئی.** اجرا نشده: C2 با `identity_provider` · C3 (اعطا) · C4 (ادعای Profile) · **C6 و زوج سایه** · FK حلقوی Organization و Membership · FY2 · جایگزینی با ترتیب غلط | R4 = PARTIAL |
| «`prisma_direct_projection_mutation` PASS» | ⚠️ `code=SQLSTATE` یعنی **هر خطایی** PASS شمرده شد (FX12) | شاهد ضعیف |

**هیچ‌کدام از این‌ها نتیجه‌ی کلی را وارونه نمی‌کند** — Codex خودش G1b را FAIL اعلام کرد. ولی **دقت ادعاها پیش‌شرط اعتماد به بستن G1 است.**

---

## ۴. بررسی هفت‌گانه

| # | معیار | وضعیت | خلاصه |
|---|---|---|---|
| ۱ | ADR | ⚠️ | **ADR-0010 و F1:** رخداد انتشار در fixture هنوز با `platform_actor_ref` ثبت می‌شود؛ طبق طراحی فقط عضو انسانی همان سازمان منتشر می‌کند |
| ۲ | مشخصات مصوب | ⚠️ | Verification بدون `organization_id` (RR2) · یکتای عضویت بدون `identity_provider` · بدون زوج سایه |
| ۳ | Core و ماژول | ✅ | بدون واژه‌ی صنفی |
| ۴ | چند Vertical | ✅ | |
| ۵ | امنیت و اجازه | 🔴 | **یافته‌ی نوشتن بین‌مستأجری** — بند ۵ |
| ۶ | ایمنی migration | ✅ + ⚠️ | R3 برای fixture گذشت؛ باقی: زنجیره‌ی main و DR-03 · گونه‌ی `--from-migrations` · volume یتیم |
| ۷ | بدهی فنی | ⚠️ | `CLAUDE_LATEST_REPORT.md` ریشه باز هم بازنویسی شد (`5138a0a`) → GW4 |

---

## ۵. یافته‌ی امنیتی — پاسخ نگهبان به «NEEDS_DECISION»

**واقعیت تأییدشده:**
- `offerVersion.create` با `organization: connect org-b` + `offer: connect {offer-a, org-a}` پذیرفته شد و ردیف با `organization_id = prisma-org-a` ذخیره شد.
- **DB سالم ماند — ردیف آمیخته ساخته نشد.** ولی **ورودی صریح tenant بی‌صدا کنار گذاشته شد.**

**چرا فقط «رد کردن تناقض» کافی نیست:** اگر مهاجم از سازمان B هر دو ورودی را **هم‌سو** با سازمان A بدهد — `offer: connect {offer-a, org-a}` بدون `organization` — ردیف **در سازمان A** ساخته می‌شود و **هیچ تناقضی برای رد کردن وجود ندارد.** پس کنترل امنیتی باید **منشأ tenant** را ببندد، نه فقط تناقض را.

**دو قاعده‌ی نامزد — برای آزمون در G1c و تصمیم مالک در CCR:**

| قاعده | متن | نقش |
|---|---|---|
| **W1 — الزامی پیشنهادی** | **tenant هر نوشتن فقط از زمینه‌ی احراز هویت می‌آید و فقط به‌صورت ستون مستقیم نوشته می‌شود** (`organizationId: ctx.organizationId`، `offerId: input.offerId`). **`connect` مرکبی که `organizationId` را از ورودی بگیرد در Repositoryهای مستأجری ممنوع است.** با این شکل، FK مرکب DB ردیف `(offer-a, org-b)` را با `23503` رد می‌کند | **کنترل امنیتی اصلی** |
| **W2 — اختیاری** | در مدل‌های فرزندی که FK مرکب به والد از قبل `organization_id` را حمل می‌کند (مثل `OfferVersion → Offer`)، رابطه‌ی ساده‌ی **تکراری** `organization` در Prisma حذف شود. FK ساده‌ی DB به `organizations` می‌تواند در SQL بماند | **بهداشت:** مسیر ورودی متناقض از بین می‌رود؛ جایگزین W1 نیست |

**تصمیم با مالک است، در CCR.** G1c فقط هر دو را در fixture می‌آزماید.

---

## ۶. G1c — آنچه باید اجرا شود

| # | مورد | منشأ |
|---|---|---|
| **G1c-1** | **R2 — نشت C15:** (الف) درج رخداد برای نسخه‌ی X و UPDATE مستقیم projection نسخه‌ی Y در **همان تراکنش** → `P0001`؛ (ب) همان پس از `ROLLBACK TO SAVEPOINT`؛ (ج) گونه‌ی برچسب‌دار `pg_trigger_depth() > 1` برای مقایسه | R2 · FX2 |
| **G1c-2** | **انجام‌دهنده‌ی انتشار = عضو:** `performed_by_membership_id` + FK مرکب به `memberships(id, organization_id)` · `reason` اجباری · `occurred_at`؛ ارجاع پلتفرمی **فقط** در Verification | ADR-0010 · FX3 |
| **G1c-3** | `IdentityVerification.organization_id` + FK مرکب به ادعا | RR2 · FX4 |
| **G1c-4** | **زوج سایه:** رابطه‌ی اختیاری `BusinessProfile → BusinessIdentityClaim` با ستون سازمان سایه + CHECK C6 · نمایش پذیرش زوج نیمه‌پر **بدون** C6 (`MATCH SIMPLE`) · `23514` **با** C6 · `prisma validate` و `generate` | R4 · FX5 |
| **G1c-5** | **زنجیره‌ی پنج migration `origin/main`** — با `git show origin/main:…` به پوشه‌ی موقت بیرون از مخزن — پیش از fixture Core؛ `external_workspace_link_active_unique` در inventory و در آزمون بقا (DR-03) | R3 · FX6 |
| **G1c-6** | گونه‌ی **`prisma migrate diff --from-migrations` + shadow DB** · ثبت **فرمان دقیق** همه‌ی diffها | R3 · FX7 |
| **G1c-7** | آزمون‌های غایب: C2 با `identity_provider` · C3 (جدول حداقلی اعطا) · C4 · FK حلقوی Organization و Membership · **`DELETE FROM publications`** → `P0001` · FY2 · جایگزینی با ترتیب غلط → `23505` | R4 · FX8 |
| **G1c-8** | هم‌زمانی با **مانع Advisory Lock** — نه `pg_sleep` — ۲۰ اجرا در `READ COMMITTED` و ۲۰ اجرا در `SERIALIZABLE` | FX9 |
| **G1c-9** | **هر آزمون منفی کد مورد انتظار را بسنجد** (Prisma `P2002`/`P2003`، SQLSTATE یا پیام Trigger)؛ هر خطای دیگر = FAIL | FX12 |
| **G1c-10** | **W1:** نوشتن با ستون مستقیم — `organizationId` = «زمینه» `org-b`، `offerId` = `offer-a` → انتظار `P2003`/`23503` · **W2:** گونه‌ی fixture بدون رابطه‌ی `OfferVersion.organization` — ثبت اینکه ورودی متناقض دیگر ساختنی نیست | بند ۵ |
| **G1c-11** | **پاک‌سازی:** حذف volume یتیم **`9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1` و فقط همان** · container تازه با `--rm` یا حذف با `docker rm -v` · خروجی `docker volume ls` در گزارش | بند ۳ |
| **G1c-12** | **گزارش:** اصلاح صریح چهار ادعای بند ۳ · `REVIEW_REFERENCE` · SHA256SUMS تازه | GW3 |

**شواهد G1b تغییرناپذیرند:** `mlino2/validation/g1b/**` checksum دارد و **دست نمی‌خورد.** G1c در پوشه‌ی تازه‌ی `mlino2/validation/g1c/` ساخته می‌شود.

**معیار بستن G1 پس از G1c** (طبق §۸ بازبینی بستن G1):
- R1 ✅
- R2 اجرا و نشت رد شده
- R3 شامل زنجیره‌ی main
- R4 کامل با کدهای خطای درست
- W1 و W2 با نتیجه‌ی ثبت‌شده برای تصمیم مالک

---

## ۷. گام بعد

### Next Task
**G1c — تکمیل اعتبارسنجی G1** (G1c-1 تا G1c-12) — **پس از تأیید اصلاح گردش‌کار.**

### TARGET_HANDOFF_ID
`HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-G1C-VALIDATION-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md
SUPERSEDES: CODEX-20260912-G1B-COMPLETION-001 (never delivered)
PRECONDITION: Guardian approval of CODEX-20260912-GOVERNANCE-WORKFLOW-FIXES-001 is published on origin/main.
DECISION: APPROVED_WITH_FIXES

TASK:
Complete G1 validation as G1c (items G1c-1..G1c-12 of the review). Validation fixture only.

STEPS:
0. git fetch origin. Read the review via git show origin/main:<path>. Confirm the precondition.
1. Create mlino2/validation/g1c/. Do NOT modify mlino2/validation/g1b/** (checksummed evidence).
2. Tooling: prisma@5.22.0 + @prisma/client@5.22.0 in a temp folder OUTSIDE the repo. No repo-root
   package.json/package-lock.json/node_modules.
3. Disposable PostgreSQL 16 container started with --rm (or removed with docker rm -v). Never touch
   mlino-v1-local-db or volume implementation_mlino_v1_local_db_data.
4. G1c-5: apply the five origin/main migrations (git show origin/main:implementation/prisma/migrations/<name>/migration.sql
   into the temp folder), then the Core fixture. Never write into implementation/.
5. Fixture shape per G1c-2, G1c-3, G1c-4, G1c-7. Tests G1c-1, G1c-4, G1c-6, G1c-7, G1c-8, G1c-10.
   Every negative test asserts its expected code (G1c-9).
6. G1c-11: remove only orphan volume 9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1;
   record docker volume ls before/after.
7. Write mlino2/PRISMA_G1C_VALIDATION_REPORT.md and
   AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G1C_VALIDATION_REPORT.md (10 sections, REVIEW_REFERENCE,
   base commit, SHA256SUMS for g1c, explicit correction of the four G1b claims listed in review section 3,
   verdict per mlino_book/MLINO_G1_CLOSURE_REVIEW.md section 8).
8. Append to mlino2/HANDOFF/HANDOFF_STATE.md. Commit only allowed files. Push.
9. STOP. Await Architecture Guardian review.
```

### Allowed files — فقط شاخه‌ی `codex/v2-intent-flow-foundation`
- `mlino2/validation/g1c/**` — تازه
- `mlino2/PRISMA_G1C_VALIDATION_REPORT.md` — تازه
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G1C_VALIDATION_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- **`mlino2/validation/g1b/**`** — شواهد checksumدار
- `implementation/**` — schema، migrationها، کد، `package.json` و lockfile
- ADRها · اسناد طراحی · سند حل موانع · طرح‌های اعتبارسنجی · `mlino2/PRISMA_G1B_CLOSURE_REPORT.md`
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md` · `AI_HANDOFF/CLAUDE_REPORTS/**`
- `package.json`، `package-lock.json` یا `node_modules` در ریشه
- هر container یا volume دیگر — به‌ویژه `mlino-v1-local-db` و `implementation_mlino_v1_local_db_data`
- اعمال W1، W2 یا P1 تا P12 در اسناد طراحی — **فقط fixture**
- هر اعتبارنامه یا رشته‌ی اتصال در فایل‌ها
- `merge`، `rebase`، `cherry-pick`، `push --force`
- هر گام پس از گزارش G1c بدون بازبینی

---

## ۸. برای مالک

- **ترتیب دستورها:** اول `CODEX-20260912-GOVERNANCE-WORKFLOW-FIXES-001` (بازبینی گردش‌کار)، بعد از تأیید آن `CODEX-20260912-G1C-VALIDATION-001`.
- **تصمیم امنیتی شما در CCR:** W1 — «tenant فقط از زمینه‌ی احراز هویت، به‌صورت ستون مستقیم» — پیشنهاد نگهبان: **الزامی** · W2 — اختیاری.
- **نسخه‌ی Prisma:** در CCR دقیقاً روی **`5.22.0`** ثابت شود (مستندسازی).
- **یک volume آزمایشی یتیم** روی سیستم مانده است. در G1c پاک می‌شود؛ اگر زودتر می‌خواهید، فرمانش `docker volume rm 9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1` است.

من کلاد هستم
