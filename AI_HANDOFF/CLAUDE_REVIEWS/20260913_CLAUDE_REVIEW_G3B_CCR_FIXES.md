# بازبینی نگهبان معماری — G3b: اصلاحات CCR شِمای Core

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G3B_CCR_FIXES_REPORT.md`
**سند:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md` (DRAFT)
**شواهد:** `mlino2/validation/g3b/**`
**Commitها:** `fcddfc2` (اصلاحات و شواهد) · `6b62509` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`، مبنا `48834d1`
**دستور اجراشده:** `CODEX-20260913-G3B-CCR-FIXES-001` · **D6 = A** (تأیید مالک)

---

## تصمیم

# `APPROVED_NEXT_STEP`

- **هر هفت یافته‌ی بازبینی G3 (R-1 تا R-7) درست بسته شده‌اند** و با آزمون‌های واقعی (T1 تا T12) ثابت شده‌اند.
- **CCR از نظر فنی آماده‌ی تصویب مالک است.**
- **گام بعد — G4 (اعمال CCR در `schema.prisma` و ساخت migration محصول) — فقط پس از تصویب صریح مالک آزاد می‌شود.**

---

## ۱. راستی‌آزمایی مستقل

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| دامنه | `git diff --name-status 48834d1..6b62509` | ✅ فقط CCR (ویرایش)، ۳۱ فایل `g3b`، گزارش، Handoff (صفر خط حذف). **هیچ مسیر ممنوعی**؛ `g3/**` دست‌نخورده |
| remote و working tree | fetch · status | ✅ `6b62509` = محلی؛ working tree پاک |
| وضعیت CCR | خط ۳ | ✅ همچنان `DRAFT — pending owner approval` |
| **یکپارچگی استخراج** | استخراج بلوک‌های `CCR_CORE_MANUAL_SQL` و `CCR_CORE_MODELS` از CCR (با `git show`) و مقایسه با فایل‌های آزموده‌شده | ✅ **خط‌به‌خط برابر** — تنها تفاوت، دو خط نشانگر BEGIN/END است که اسکریپت استخراج عمداً حذف می‌کند. **آزمون‌ها دقیقاً همین متن را اجرا کرده‌اند** |
| R-1 | diff CCR | ✅ `BEFORE UPDATE OF publication_status, published_content_revision` (Profile، Capability) و `…, published_at` (OfferVersion) |
| R-2 | diff CCR | ✅ `BEFORE INSERT OR UPDATE OR DELETE`؛ UPDATE همیشه رد؛ INSERT و DELETE فقط وقتی `published_at IS NULL`؛ **قفل ردیف والد (`FOR UPDATE`)** — هم‌زمان با انتشار ایمن است: پس از commit انتشار، درج پیوند وضعیت تازه را می‌بیند و رد می‌شود |
| R-3 / D6-A | diff CCR | ✅ Triggerهای `BEFORE UPDATE OF <فیلدهای عمومی>, content_revision`: تغییر فیلد عمومی → `OLD+1`؛ **تغییر مستقیم بازبینی بدون تغییر فیلد عمومی → `P0001`**. هر ۹ فیلد Profile و ۴ فیلد Capability طبق طراحی §۵٫۲. با Trigger projection تداخلی ندارد — آن Trigger فیلد عمومی یا `content_revision` نمی‌نویسد |
| R-4 | diff CCR | ✅ `PUBLISHED → PUBLISHED` فقط با `NEW.content_revision > published_content_revision` |
| R-6 | diff CCR | ✅ `Membership` / `memberships` و همه‌ی ارجاع‌ها |
| R-7 | diff CCR | ✅ قواعد کامل گذار صریحاً جزء D1 |
| **بدنه‌ی آزمون‌ها** | خواندن `t1-t12.sql` | ✅ واقعی: T3 هر ۹ فیلد را جداگانه تغییر می‌دهد، بازبینی ۱→۱۰ و نامرئی شدن محتوای کهنه را می‌سنجد · T4 هر سه ستون projection · T7 INSERT و DELETE روی نسخه‌ی منتشرشده · T8 پیش‌نویس · T12 **برابری دقیق** مجموعه‌ی ۱۲ Trigger |
| نتایج | جست‌وجو در logs | ✅ همه‌ی C1 تا C15 و T1 تا T12 با SQLSTATE مورد انتظار PASS؛ **هیچ خط FAIL** |
| اثر انگشت `_PUSH_STAGING` | بازمحاسبه‌ی مستقل | ✅ هر چهار پوشه **دقیقاً برابر مبنا** — در logهای قبل و بعد هم |
| پاک‌سازی | ls · docker | ✅ `g3b-tooling` نیست · container G3b نیست |
| D4 | متن SQL | ✅ هیچ FK به `external_workspace_links` |

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ یک هویت سازمان (ADR-0001) · انتشار فقط با رخداد و عضو انسانی (ADR-0010، F1) — **R-1 بسته شد** · اجازه از عضویت و اعطا (ADR-0009) · منشأ جدا از تأیید (ADR-0006) |
| ۲ | مشخصات مصوب | ✅ طراحی v3 · F1–F5 · PR1/PR2 · PY1–PY6 · D1–D6 · FY1–FY4 · G1-C4 |
| ۳ | Core و ماژول | ✅ بدون واژه‌ی صنفی؛ Core جدول ماژول نمی‌خواند |
| ۴ | چند Vertical | ✅ کلیدهای رشته‌ای ثبت‌شده |
| ۵ | امنیت و اجازه | ✅ W1 (`P2003`) · FK مرکب · محافظ سه‌ستونی C15 · بازبینی خودکار محتوا (D6) |
| ۶ | ایمنی migration | ✅ زنجیره‌ی main دست‌نخورده · diff از تاریخچه · inventory پیش و پس یکسان · rollback پیش و پس از داده |
| ۷ | بدهی فنی | ✅ بدون مورد تازه |

**ریسک پذیرفته‌شده (ثبت در CCR §۱۳):** B1 هویت فراخواننده را در runtime تشخیص نمی‌دهد. امنیتش به `pg_trigger_depth` + فهرست بسته‌ی دقیق (T12) + بازبینی اجباری migration متکی است. **این همان انتخاب آگاهانه‌ی D1 است.**

---

## ۳. برای مالک — آنچه با تصویب CCR تصویب می‌کنید

- **۱۲ مدل و ۱۵ enum** شِمای Core (§۵٫۲) — مطابق طراحی v3
- **SQL دستی C1 تا C15** (§۶) — یکتاهای جزئی، قیدهای زوج سایه، XOR، ممیزی، گذارهای انتشار، تغییرناپذیری
- **تصمیم‌های D1 تا D6**
- **فهرست بسته‌ی ۱۲ Trigger** (§۶٫۱)
- **طرح migration و rollback** (§۱۱ و §۱۲)
- **pin دقیق Prisma روی 5.22.0**

**توصیه‌ی نگهبان: تصویب.**

---

## ۴. گام بعد

### پیش‌شرط
**تصویب صریح مالک:** «CCR شِمای Core Foundation (commit `fcddfc2`) تصویب است.»

### Next Task
**G4 — اعمال CCR مصوب:** افزودن بلوک مدل‌ها به `schema.prisma` · ساخت یک migration (SQL تولیدی Prisma + بلوک SQL دستی §۶) · pin نسخه‌ی Prisma · اعتبارسنجی کامل روی PostgreSQL یک‌بارمصرف. **بدون کد سرویس یا Repository.**

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G4-CORE-SCHEMA-MIGRATION-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3B_CCR_FIXES.md
OWNER_APPROVAL: ________   (owner must state: "CCR Core Foundation Schema at fcddfc2 is APPROVED")
DECISION: APPROVED_NEXT_STEP

TASK:
Apply the approved CCR to implementation/prisma: schema.prisma models, one product migration, exact Prisma pin.
Validate on disposable PostgreSQL. No application code.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>. If OWNER_APPROVAL is blank: STOP.
1. CCR status line only: "APPROVED — مصوب مالک، <date>" plus one line citing the owner approval and fcddfc2.
   No other CCR change.
2. implementation/prisma/schema.prisma: append the CCR §5.2 block (between the BEGIN/END CCR_CORE_MODELS markers,
   markers excluded) byte-identical. Do not change any existing model, enum, generator or datasource.
   Do NOT run prisma format. Verify no model/enum/table name collides with existing ones.
3. New migration folder implementation/prisma/migrations/<UTC timestamp after 20260910020000>_add_core_foundation/:
   migration.sql = header comment (CCR path + fcddfc2 + protected-object list per CCR §11.5)
                 + SQL from: prisma migrate diff --from-migrations implementation/prisma/migrations
                   --to-schema-datamodel implementation/prisma/schema.prisma --shadow-database-url <disposable> --script
                 + the CCR §6 block (markers excluded) byte-identical.
   The generated part must equal mlino2/validation/g3b/sql/generated-core-migration.sql; record the comparison.
   Never modify an existing migration or migration_lock.toml.
4. implementation/package.json: set "prisma" and "@prisma/client" to exactly "5.22.0". Regenerate
   implementation/package-lock.json consistently (npm install --package-lock-only --ignore-scripts). If the registry
   is unreachable: STOP and report; never hand-edit the lockfile.
5. Validation (disposable PostgreSQL 16 with --rm; never mlino-v1-local-db or its volume):
   a) prisma validate; b) prisma migrate deploy of all six migrations onto an empty database;
   c) prisma migrate diff --from-migrations ... --to-schema-datamodel schema.prisma must be EMPTY (no drift);
   d) run g3b base-assertions + t1-t12 against the deployed database; all PASS with exact SQLSTATE;
   e) W1 write path via Prisma Client generated to TEMP only; f) inventory of protected objects recorded.
   Tooling: read-only Prisma 5.22.0 from C:\mlino code\_PUSH_STAGING\implementation\node_modules, CHECKPOINT_DISABLE=1,
   PRISMA_GENERATE_SKIP_AUTOINSTALL=1, four-folder fingerprint before/after equal to the guardian baseline.
6. Evidence in mlino2/validation/g4/ (new; g3/g3b immutable). All hashes over git show bytes.
7. Report AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G4_CORE_SCHEMA_MIGRATION_REPORT.md (10 sections). Append to
   mlino2/HANDOFF/HANDOFF_STATE.md. Commit only allowed files. Push. STOP. Await Architecture Guardian review.
   State explicitly that V1 build/type-check/test against the regenerated client was NOT run (deferred to a later gate).
```

### Allowed files — فقط شاخه‌ی `codex/core-prisma-foundation`

| مسیر | مجوز |
|---|---|
| `implementation/prisma/schema.prisma` | **فقط افزودن** بلوک CCR، بایت‌به‌بایت |
| `implementation/prisma/migrations/<timestamp>_add_core_foundation/migration.sql` | **تازه** |
| `implementation/package.json` | فقط دو specifier `prisma` و `@prisma/client` |
| `implementation/package-lock.json` | **فقط بازتولیدشده** — دست‌ویرایش ممنوع |
| CCR | فقط خط وضعیت + یک خط ارجاع تصویب |
| `mlino2/validation/g4/**` | تازه |
| `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G4_CORE_SCHEMA_MIGRATION_REPORT.md` | تازه |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | فقط افزودنی |

### Forbidden changes
- هر مدل، enum، generator یا datasource **موجود** در `schema.prisma` · **`prisma format`**
- **هر migration موجود** یا `migration_lock.toml`
- هر کد، service، repository، test یا `implementation/shared-contracts/**` (از جمله `types.ts` منجمد)
- اعمال migration روی **هر** پایگاه داده‌ای جز container یک‌بارمصرف — به‌ویژه `mlino-v1-local-db`
- هر نوشتن در `C:\mlino code\_PUSH_STAGING`
- FK به `external_workspace_links` (D4)
- `mlino2/validation/g3/**` و `g3b/**` · ADRها · `mlino_book/**` · فایل‌های ریشه‌ی `AI_HANDOFF`
- شاخه‌ی V2 · `main` · `merge`، `rebase`، `cherry-pick`، `push --force`
- هر گام پس از گزارش G4 بدون بازبینی نگهبان

---

## ۵. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| G1 | ✅ با شرط بسته |
| G2 | ✅ بسته |
| **G3** | ✅ **از نظر فنی کامل — منتظر تصویب مالک** |
| **G4** | ⏳ پس از تصویب مالک |
| ادغام با `main` و آزمون V1 روی کلاینت تازه | دروازه‌ی بعدی — در G4 انجام نمی‌شود |

من کلاد هستم
