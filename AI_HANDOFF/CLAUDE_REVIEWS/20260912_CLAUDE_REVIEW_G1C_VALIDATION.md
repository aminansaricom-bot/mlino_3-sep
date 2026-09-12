# بازبینی نگهبان معماری — G1c و حکم دروازه‌ی G1

**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش‌های Codex:**
- `mlino2/PRISMA_G1C_VALIDATION_REPORT.md`
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G1C_VALIDATION_REPORT.md`
- شواهد: `mlino2/validation/g1c/**`

**Commitها:** `dc1dbd1` (شواهد) · `f4d326f` (گزارش و Handoff) — مبنا `ebca267`
**دستور اجراشده:** `CODEX-20260912-G1C-VALIDATION-001` — REVIEW_REFERENCE و RELEASED_BY درست ثبت شده‌اند

---

## تصمیم

# `APPROVED_NEXT_STEP`

## حکم دروازه: **G1 — PASS WITH CONDITIONS**

- **G1c از نظر فنی پذیرفته است.** همه‌ی پرسش‌هایی که G1 برای پاسخ دادن به آن‌ها تعریف شد، **با شاهد قابل بازبینی** پاسخ گرفته‌اند:
  - نشت C15
  - پایداری در برابر migration بعدی Prisma
  - جداسازی مستأجر
  - یکتایی‌ها
  - هم‌زمانی
- **G1 بسته می‌شود — با هفت شرط (بند ۳).** **هیچ‌کدام اجرای دوباره‌ی آزمون لازم ندارد.** همه به G2 یا G3 منتقل می‌شوند.
- **گام بعد: G2** — شاخه‌ی Core از `origin/main` (بند ۴)؛ **با پیش‌شرط تأیید مالک بر گزینه‌ی C.**
- **`schema.prisma` همچنان مسدود است** تا G2 و G3 بسته شوند.

---

## ۱. راستی‌آزمایی مستقل — شواهد، نه خلاصه‌ی گزارش

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| دامنه‌ی فایل‌ها | `git diff --name-only ebca267..f4d326f` | ✅ فقط ۴۸ فایل `g1c` + ۲ گزارش + Handoff. **هیچ مسیر ممنوعی** — شامل `g1b/**`، `implementation/**`، ADRها و فایل‌های ریشه‌ی `AI_HANDOFF` |
| Handoff فقط افزودنی | شمارش خطوط حذف‌شده | ✅ صفر |
| remote | fetch | ✅ `f4d326f` = HEAD محلی |
| **نشت C15 — همان تراکنش** | خواندن کد `02_assertions.sql` (خط ۲۵۵ تا ۲۶۹) | ✅ واقعی: رخداد برای X، سپس UPDATE مستقیم **Y** در همان تراکنش؛ `GET STACKED DIAGNOSTICS` و الزام دقیق `P0001` |
| **نشت C15 — Savepoint** | خط ۲۸۵ تا ۲۹۹ | ✅ واقعی؛ علاوه بر رد، ماندن رخداد rollbackشده هم بررسی می‌شود |
| **گونه‌ی `pg_trigger_depth`** | خط ۳۱۰ تا ۳۲۴ | ✅ جدول جداگانه؛ اعمال projection و رد نشت |
| **`MATCH SIMPLE` بدون C6** | fixture خط ۱۸۴ + assertion خط ۱۶۵ | ✅ نمایش پذیرش زوج نیمه‌پر؛ با C6 → `23514` |
| **W1** | `prisma-write-path.cjs` خط ۱۲۳ تا ۱۳۳ | ✅ واقعی: `organizationId = org-b` (زمینه) · `offerId` و `capabilityId` از `org-a` → **`P2003`** |
| **W2** | خط ۱۹۰ تا ۲۲۰ | ✅ مسیر scalar معتبر؛ ورودی متناقض → `PrismaClientValidationError` · `Unknown argument organization` |
| کد خطا در آزمون منفی | همان فایل | ✅ `expectPrismaCode` کد دقیق را می‌سنجد؛ `P2010` + `P0001` برای Trigger |
| **هم‌زمانی** | `09_concurrency.txt` + فایل خطا | ✅ `READ COMMITTED`: ۲۰×`23505` · `SERIALIZABLE`: ۱۲×`40001` + ۸×`23505` · فایل خطا خالی · مانع Advisory Lock |
| **DR — از تاریخچه** | `11` و `12` | ✅ baseline: `-- This is an empty migration.` · follow-up: فقط `ADD COLUMN "validation_note"` |
| inventory | `19_inventory_comparison.txt` | ✅ SHA-256 قبل و بعد `b0771476…` — یکسان |
| DR-03 و FK-07 | `16` و `18` | ✅ روی **هر دو** مسیر (DB زنده و بازسازی از تاریخچه) |
| پاک‌سازی | `00`–`02` · `23`, `25`, `26`, `27` | ✅ volume یتیم `9097eb28…` **فقط همان** حذف شد · volume موقت حذف شد · `implementation_mlino_v1_local_db_data` باقی · فایل‌های ریشه نیستند. نگهبان مستقلاً تأیید کرد: `docker volume ls` |
| Secret | جست‌وجوی الگو در کل `g1c` | ✅ هیچ |
| اصلاح ادعاهای G1b | §۱۰ گزارش | ✅ هر چهار ادعا + دو ادعای تکمیلی صریحاً اصلاح شدند |
| **checksum** | `sha256sum -c` | ⚠️ **روی working tree: ۴۷ از ۴۷** · **روی محتوای canonical git (LF): فقط ۱۶ از ۴۷** — بند ۲ |

---

## ۲. یافته‌های نگهبان

| # | یافته | شدت | اقدام |
|---|---|---|---|
| **N1** | **قابل‌حمل نبودن checksumها.** ۳۱ فایل log با **CRLF** hash شده‌اند، ولی git آن‌ها را با **LF** نگه می‌دارد (`core.autocrlf=true`، بدون `.gitattributes`). روی clone تازه در Linux یا macOS، یا با `autocrlf=false`، بسته‌ی شواهد **تأیید نمی‌شود.** ادعای «۴۷ checksum تأیید شد» فقط روی همین ماشین درست است. احتمالاً G1b هم همین مشکل را دارد | متوسط — یکپارچگی شواهد، نه درستی آزمون | G1-C3 → G2 |
| **N2** | **لاگ diff پرنویز اولیه حفظ نشده است.** گزارش (§۱۱) می‌گوید diff اولیه «نویز Drop/Rename» داشت و «لاگ‌های اولیه حفظ شده‌اند»؛ ولی هیچ لاگ diff اولیه‌ای نیست و هیچ `DROP` یا `RENAME` در لاگ‌ها دیده نمی‌شود. **علت این نویز برای CCR مهم است** — بند ۳، G1-C4 | کم در شواهد · **مهم در طراحی** | G1-C4 → G3 |
| **N3** | **fixture یک FK از `external_workspace_links` به `organizations` افزوده است** (`00_core_fixture.sql` خط ۱۷۲). این همان تصمیم باز مالک D4 است. در fixture مجاز است، **ولی نباید تصمیم تلقی شود.** بقای ایندکس (DR-03) به آن وابسته نیست | کم | G1-C6 → G3 |
| **N4** | نصب خودکار Prisma **دوباره** در ریشه رخ داد (`05_prisma_validate_generate_initial.txt`) — با وجود گام ۲ دستور. ثبت و پاک شد (`27`) | کم | G1-C7 |
| **N5** | **تناقض میان اسناد G2 خود Codex** — بند ۴ | متوسط | در همین بازبینی حل شد |

---

## ۳. شرط‌های بستن G1 — منتقل به G2 و G3

| # | شرط | مقصد | توصیه‌ی نگهبان |
|---|---|---|---|
| **G1-C1** | **انتخاب سازوکار C15** | G3 (CCR، تصویب مالک) | **B1 — `pg_trigger_depth() > 1`** + **فهرست بسته‌ی Triggerهای مجاز** برای نوشتن ستون‌های projection، ثبت در CCR. دلیل: هر دو گونه ثابت شدند، ولی B1 **بی‌وضعیت** است — نه namespace برای GUC، نه نظم «روشن و خاموش» که بعداً با یک مسیر خطا شکسته شود. B2 جایگزین قابل‌قبول است |
| **G1-C2** | **W1 و W2** | G3 | **W1 الزامی** (tenant فقط از زمینه، به‌صورت ستون مستقیم) · **W2 اختیاری** (حذف رابطه‌ی تکراری). هر دو ثابت شدند |
| **G1-C3** | **قابل‌حمل کردن checksumها** | G2 | فایل تازه‌ی `mlino2/validation/G1_EVIDENCE_MANIFEST.md` با SHA-256 **blob git** (LF canonical) برای همه‌ی فایل‌های `g1b` و `g1c`، از `git show <commit>:<path>` · `.gitattributes` با `mlino2/validation/** -text` برای شواهد آینده · **هیچ فایل شواهد موجود تغییر نمی‌کند** |
| **G1-C4** | **دو قاعده‌ی CCR از درس diff** | G3 | (الف) **هر جدولی که migration می‌سازد باید در `schema.prisma` مدل شده باشد** — وگرنه diff بعدی آن را `DROP` می‌کند · (ب) **نام هر FK یا unique که در SQL دستی ساخته می‌شود، با نام پیش‌فرض Prisma برابر باشد یا با `map:` اعلام شود** — وگرنه diff آن را `RENAME` یا `DROP` می‌کند · (ج) بازبینی SQL هر migration الزامی |
| **G1-C5** | **pin دقیق Prisma روی `5.22.0`** | G3 | چک‌لیست انتقال و سند رفع موانع انتقال Codex هنوز `5.20.0` می‌گویند — **منسوخ‌اند** |
| **G1-C6** | **FK `ExternalWorkspaceLink → Organization`** (D4) | G3 | تصمیم مالک؛ پیشنهاد: **در CCR اول نباشد**؛ FK موجود در fixture تصمیم نیست |
| **G1-C7** | **`PRISMA_GENERATE_SKIP_AUTOINSTALL=1`** در همه‌ی اجراهای Prisma و ابزار بیرون از مخزن | همه‌ی دستورهای بعدی | — |

---

## ۴. G2 — حل تناقض اسناد Codex و مسیر نگهبان

**تناقض (N5):**

| سند Codex | جهت پیشنهادی |
|---|---|
| `MLINO_BRANCH_ALIGNMENT_REVIEW.md` §۱ و §۱۰ — **گزینه‌ی C** | **شاخه‌ی Core تازه از `origin/main`**؛ فقط اسناد Prisma از شاخه‌ی V2 به آن منتقل شوند؛ **V2 دست‌نخورده** |
| `MLINO_SELECTIVE_ARTIFACT_TRANSFER_PLAN.md` §۲ و §۳٫۱ · `MLINO_ARTIFACT_TRANSFER_READINESS_CHECKLIST.md` §۸ | **برعکس:** فایل‌های `ExternalWorkspaceLink` (schema، migration، service، test) از main **به شاخه‌ی V2** منتقل شوند؛ با Prisma `5.20.0` |

**حکم نگهبان: گزینه‌ی C، به شکل دقیق زیر.** جهت «انتقال به V2» رد می‌شود:

1. **کار Core روی شاخه‌ای انجام می‌شود که از `origin/main` تازه ساخته شده است.** همه‌ی artefactهای `ExternalWorkspaceLink`، زنجیره‌ی پنج migration، `mlino_book` و ADRها **از قبل آن‌جا هستند.** **هیچ فایل پیاده‌سازی‌ای منتقل نمی‌شود.**
2. **شاخه‌ی V2 دست نمی‌خورد.** انتقال کد V1 به شاخه‌ی V2 مرز Core/V1 و V2 را مخلوط می‌کند — همان ریسکی که خود بررسی هم‌ترازی Codex (§۵٫۳) نام برده است.
3. **تعارض دو فایل Handoff ریشه کاملاً از بین می‌رود.** شاخه‌ی تازه از main شروع می‌شود؛ ادغامی در کار نیست؛ Codex طبق GW4 آن فایل‌ها را نمی‌نویسد.
4. **فقط اسناد** از شاخه‌ی V2 کپی می‌شوند، **بایت‌به‌بایت** با `git show <commit>:<path>`. شواهد `g1b` و `g1c` **کپی نمی‌شوند**؛ با commit و hash ارجاع داده می‌شوند (G1-C3).

**این حکم جایگزین می‌کند:**
- توصیه‌ی «merge شاخه‌ی Codex در شاخه‌ی پیاده‌سازی» در [`MLINO_PRE_PRISMA_DECISION_NOTE.md`](../../mlino_book/MLINO_PRE_PRISMA_DECISION_NOTE.md) §۱ — آن توصیه پیش از آن بود که شاخه‌ی V2 به ۷۲ commit V2 و governance برسد
- جهت §۲ و §۳٫۱ طرح انتقال انتخابی Codex

**پیش‌شرط:** این یک تصمیم ساختاری مخزن است → **تأیید مالک بر گزینه‌ی C** لازم است.

**Handoff:** شاخه‌ی تازه Handoff جدید می‌گیرد: **`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`** — طبق §۳ گام ۵ گردش‌کار Codex، با این بازبینی تعیین می‌شود. `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION` فقط برای شاخه‌ی V2 فعال می‌ماند.

---

## ۵. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ انتشار فقط با عضو (ADR-0010) · یک هویت سازمان (ADR-0001) · FK مرکب (RR2) · ADR-0004: FK آزمایشی EWL تصمیم نیست (N3) |
| ۲ | مشخصات مصوب | ✅ شکل fixture برای همه‌ی روابط زیر آزمون مطابق طراحی v3 |
| ۳ | Core و ماژول | ✅ بدون واژه‌ی صنفی |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت و اجازه | ✅ **W1 سازوکار واقعی بستن یافته‌ی امنیتی را ثابت کرد** (`P2003`) |
| ۶ | ایمنی migration | ✅ **مهم‌ترین ناشناخته‌ی پروژه پاسخ گرفت:** Prisma 5.22.0 روی زنجیره‌ی واقعی main + قیدهای دستی، از تاریخچه و از DB زنده، **هیچ شیء دستی را حذف نکرد** · شرط G1-C4 |
| ۷ | بدهی فنی | ⚠️ N1 (checksum) · N4 (auto-install) — هر دو در شرط‌ها |

---

## ۶. گام بعد

### Next Task
**G2 — ساخت شاخه‌ی Core از `origin/main` و انتقال فقط اسناد** (G2-1 تا G2-8) — **پس از تأیید مالک بر گزینه‌ی C.**

### TARGET_HANDOFF_ID
**`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`** — تازه، با این بازبینی تعیین می‌شود

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-G2-CORE-BRANCH-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION   (new; established by the review below)
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1C_VALIDATION.md
PRECONDITION: Owner has confirmed G2 option C (review section 4). If not confirmed: STOP.
DECISION: APPROVED_NEXT_STEP (G1 PASS WITH CONDITIONS)

TASK:
Create the Core Prisma branch from a fresh origin/main and copy documents only. No implementation change.

STEPS:
G2-1 git fetch origin. Record the full origin/main hash. In a SEPARATE git worktree (do not disturb the
     V2 clone or its three untracked files), create branch codex/core-prisma-foundation from that hash.
G2-2 Record SHA-256 of implementation/prisma/schema.prisma and all five migrations on the new branch;
     confirm ExternalWorkspaceLink model, migration 20260910020000, workspace-link service and spec exist.
     Do not modify them.
G2-3 Copy byte-identical with git show origin/codex/v2-intent-flow-foundation@f4d326f7d2046eee997dba4198f662c6e5d1e84e:<path>
     into the same paths on the new branch:
       mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md
       mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md
       mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md
       mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md
       mlino2/PRISMA_G1B_CLOSURE_REPORT.md
       mlino2/PRISMA_G1C_VALIDATION_REPORT.md
       AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md
     Verify each copy's SHA-256 equals the source blob SHA-256.
G2-4 Create mlino2/validation/G1_EVIDENCE_MANIFEST.md: for every file under mlino2/validation/g1b/ and
     mlino2/validation/g1c/ on the source commit, list path, source commit and SHA-256 of the git blob
     (LF canonical, from git show). Do NOT copy the evidence folders.
G2-5 Create .gitattributes containing exactly: mlino2/validation/** -text
G2-6 prisma validate only (Prisma 5.22.0 in a temp tooling folder outside the repo,
     PRISMA_GENERATE_SKIP_AUTOINSTALL=1) against the unchanged implementation/prisma/schema.prisma.
     No generate, no migrate, no database, no Docker.
G2-7 Verify: git diff --name-only origin/main...HEAD lists only allowed files.
G2-8 Write AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G2_CORE_BRANCH_REPORT.md (10 sections, REVIEW_REFERENCE,
     BASE_COMMIT = recorded origin/main hash, per-file source + SHA-256 table, command output for claims).
     Create mlino2/HANDOFF/HANDOFF_STATE.md on the new branch if absent (else append-only) recording
     HANDOFF-20260912-CORE-PRISMA-FOUNDATION. Commit only allowed files. Push the NEW branch only.
     STOP. Await Architecture Guardian review.
```

### Allowed files — فقط شاخه‌ی تازه‌ی `codex/core-prisma-foundation`
- هفت سند کپی‌شده در G2-3 — **بایت‌به‌بایت**، در همان مسیرها
- `mlino2/validation/G1_EVIDENCE_MANIFEST.md` — تازه
- `.gitattributes` — تازه؛ فقط همان یک خط
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G2_CORE_BRANCH_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — ساخت اگر نیست، وگرنه فقط افزودنی

### Forbidden changes
- **هر تغییر در `codex/v2-intent-flow-foundation`** — شاخه‌ی V2 دست‌نخورده می‌ماند
- **هر push به `main`**
- `implementation/**` — شامل `schema.prisma`، migrationها، service، test، `package.json` و lockfile
- `mlino_book/**` · ADRها · `AI_HANDOFF/CLAUDE_REVIEWS/**` · `AI_HANDOFF/CLAUDE_REPORTS/**`
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md`
- کپی کد، UI، asset یا شواهد V2 · کپی پوشه‌های `validation/g1b` و `validation/g1c`
- هر ویرایش در اسناد کپی‌شده — **کپی بایت‌به‌بایت**
- `merge`، `rebase`، `cherry-pick`، `push --force`
- Docker، پایگاه داده، `prisma generate`، `prisma migrate`
- `package.json`، `package-lock.json` یا `node_modules` در ریشه
- هر گام پس از گزارش G2 بدون بازبینی نگهبان

---

## ۷. برای مالک

1. **تأیید گزینه‌ی C برای G2** — شاخه‌ی تازه‌ی Core از `origin/main`، شاخه‌ی V2 دست‌نخورده، فقط اسناد کپی می‌شوند. **با این تأیید، دستور بالا را به Codex بدهید.**
2. **تصمیم‌های G3 (CCR)** — جمع‌بندی:
   - سازوکار C15 — پیشنهاد **B1**
   - **W1 الزامی** · W2 اختیاری
   - pin **5.22.0**
   - FK `ExternalWorkspaceLink` در CCR اول — پیشنهاد **نه**
   - دو قاعده‌ی G1-C4
3. **وضعیت دروازه‌ها:** **G1 ✅ PASS WITH CONDITIONS** · G2 آماده‌ی اجرا پس از تأیید شما · G3 باز · **`schema.prisma` مسدود.**

من کلاد هستم
