# بازبینی نگهبان معماری — G1 / G1b اعتبارسنجی PostgreSQL

**INSTRUCTION_ID:** `CLAUDE-ARCHITECT-GUARDIAN-001`
**تاریخ:** ۱۲ سپتامبر ۲۰۲۶ — ساعت ۱۶:۰۰ (شواهد تا ۱۵:۵۹)
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**شاخه‌ی Codex:** `codex/v2-intent-flow-foundation` @ `76589be` + **کار commitنشده‌ی در حال اجرا**

**موضوع بازبینی:**
1. **گزارش commitشده:** `mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md` (`ce28f32`) — پیش‌تر در [`MLINO_G1_CLOSURE_REVIEW.md`](../../mlino_book/MLINO_G1_CLOSURE_REVIEW.md) بازبینی شد: **G1 NOT CLOSED**
2. **کار در حال اجرای G1b — commitنشده:** `mlino2/validation/g1b/**` (۱۵:۴۷ تا ۱۵:۵۹ — logs `00` تا `15`) + `package.json` و `package-lock.json` در **ریشه‌ی مخزن** + container فعال `mlino-g1b-postgres-20260912`

**هیچ گزارش اجرایی برای G1b هنوز وجود ندارد، و هیچ `INSTRUCTION_ID` یا `TARGET_HANDOFF_ID` برای آن در Handoff Codex ثبت نشده است.** این بازبینی پیش از آن انجام می‌شود تا Codex **بدون بازبینی به گام بعد نرود.**

---

## تصمیم

# `APPROVED_WITH_FIXES`

**یعنی:**
- گام بعدی **تکمیل G1b** است و مجاز است — **به‌شرط ۱۲ اصلاح زیر.**
- **`schema.prisma`، migration محصول و CCR همچنان مسدودند.**
- **Codex اجرای فعلی را متوقف کند، اصلاحات را اعمال کند، G1b را کامل کند، یک گزارش G1b بدهد و منتظر بازبینی بعدی بماند.**

**چرا BLOCKED نه:** کار G1b در مسیر درست است و همین حالا یک یافته‌ی امنیتی واقعی بیرون داده (بند ۵). **متوقف کردن کامل آن، همان آزمونی را که این خطرها را پیدا می‌کند، متوقف می‌کند.**

---

## ۱. پیشرفت واقعی G1b — آنچه درست است

| | |
|---|---|
| **R1 — شواهد** | ✅ آغاز شده: fixture DDL، Triggerها، assertions و inventory **به‌صورت فایل** ثبت می‌شوند — شکاف اصلی G1 در حال بسته شدن است |
| **Prisma** | ✅ **`5.22.0`** — نسخه‌ی واقعی lockfile (D1) |
| **قرارداد فیزیکی** | ✅ مطابق F5، PY1 و PR2: مدل `PascalCase` · `@@map` جمع `snake_case` · فیلد `camelCase` + `@map` · `Organization.id` از نوع `TEXT` بدون پیش‌فرض · `@db.Timestamptz(3)` · `@@unique([id, organizationId])` هدف FK مرکب |
| **FK** | ✅ **همه‌ی روابط `onDelete: Restrict, onUpdate: Restrict`** (FY1) |
| **C15** | ✅ گونه‌ی **پرچم با خاموش‌کردن فوری** (B2): `set_config(…,'on',true)` → UPDATE → `set_config(…,'off',true)` |
| **DR — پایداری در برابر migration بعدی** | ✅ **اجرا شد — شاهد مهم.** `prisma migrate diff` (Prisma 5.22.0) از DB زنده به `followup.prisma` **فقط** `ALTER TABLE "organizations" ADD COLUMN "validation_note" TEXT` تولید کرد (`11_followup_migration.sql`). **هیچ `DROP` برای ۳ ایندکس جزئی، ۴ CHECK و ۵ Trigger دستی تولید نشد.** inventory پیش و پس یکسان: `NO_DIFFERENCE_IN_REQUIRED_OBJECT_INVENTORY` · `PASS_PRISMA_MIGRATION_PRESERVED_MANUAL_OBJECTS`. **این بزرگ‌ترین ناشناخته‌ی R3 را برای fixture پاسخ می‌دهد** |
| **FK-07** | ✅ **هر ۸ FK** در `10_inventory_before.log`: `ON UPDATE RESTRICT ON DELETE RESTRICT` — `onDelete/onUpdate: Restrict` در Prisma 5.22 به **`RESTRICT`** ترجمه می‌شود، نه `NO ACTION` |
| **هم‌زمانی** | ✅ یک اجرا: T1 (withdraw قدیمی → publish تازه) `COMMIT`؛ T2 (publish رقیب) `23505` روی `offer_one_published_version_unique` از درون Trigger projection؛ وضعیت نهایی `new=PUBLISHED`، `old=WITHDRAWN`، `rival=UNPUBLISHED`، بدون رخداد رقیب. **هنوز با `pg_sleep` و یک بار** — FX9 |
| **آزمون‌های SQL** | ✅ `05_sql_assertions.log` (۱۵:۵۵) — **شش PASS**: FK مرکب بین‌مستأجری · یکتای ادعا · قاعده‌ی `verified_at` · محافظ projection · rollback · RESTRICT سازمان. تکرار نتایج G1، **این بار با fixture ثبت‌شده** |
| **جداسازی محیط** | ✅ container جدا روی پورت `55436`؛ `mlino-v1-local-db` پورت منتشرشده ندارد و volume نام‌دار خودش را دارد — **تماسی با DB محلی V1 دیده نشد**؛ اتصال فقط از `G1_DATABASE_URL`؛ **هیچ اعتبارنامه‌ای در فایل‌ها یافت نشد** |

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت | خلاصه |
|---|---|---|---|
| ۱ | **ADR-0001 تا ADR-0012** | ⚠️ | **ADR-0010 و F1:** در fixture، رخداد `Publication` با **`platform_actor_ref`** ثبت می‌شود و اسکریپت Prisma با `'platform:prisma-test'` منتشر می‌کند. **طبق طراحی مصوب، انتشار فقط کار عضو انسانی همان سازمان است (`performed_by_membership_id`)؛ پلتفرم هرگز منتشر نمی‌کند.** برای fixture اشکال رفتاری PostgreSQL نمی‌سازد، ولی **مدل اختیار غلط را در ابزار آزمون عادی می‌کند** و FK مرکب انجام‌دهنده را هم نمی‌آزماید → FX3 |
| ۲ | **مشخصات مصوب** | ⚠️ | انحراف‌های fixture از طراحی v3 — بند ۳ |
| ۳ | **مرز Core و ماژول** | ✅ | بدون واژه‌ی صنفی؛ شناسه‌ها و وضعیت‌ها عمومی‌اند |
| ۴ | **آمادگی چند Vertical** | ✅ | `identifier_type` رشته است؛ هیچ enum عمودی |
| ۵ | **امنیت و مدل اجازه** | 🔴 | **یافته‌ی امنیتی تازه — بند ۵:** مسیر نوشتن Prisma می‌تواند ردیف را **بی‌صدا در سازمان دیگری** بسازد |
| ۶ | **ایمنی migration** | ⚠️ → بهبود جدی | ✅ migration دوم Prisma قیدهای دستی را **حفظ کرد** و FKها `RESTRICT` واقعی‌اند (بند ۱). **باقی:** (الف) زنجیره‌ی پنج migration `origin/main` در fixture نیست، پس DR-03 (بقای `external_workspace_link_active_unique`) پوشش ندارد — FX6 · (ب) diff از **DB زنده** (`--from-url`) گرفته شد؛ مسیر پیش‌فرض `prisma migrate dev` diff از **تاریخچه‌ی migration روی shadow DB** است و آزموده نشد — FX7 · (ج) container یک **volume بی‌نام** دارد و `AutoRemove=false` — پاک‌سازی باید `docker rm -v` باشد |
| ۷ | **بدهی فنی** | ⚠️ | **`package.json` و `package-lock.json` در ریشه‌ی مخزن** (نصب خودکار Prisma: «could not find a package.json … will be created»)؛ `node_modules` ریشه · harness داخل مخزن، نه پوشه‌ی موقت (طرح) · هم‌زمانی با `pg_sleep`، نه مانع قطعی |

---

## ۳. انحراف‌های fixture از طراحی v3 — اثر روی آنچه اثبات می‌شود

| انحراف | اثر |
|---|---|
| `Publication.platform_actor_ref` به‌جای `performed_by_membership_id` | FK مرکب انجام‌دهنده (مهم‌ترین FK امنیتی انتشار) آزموده نمی‌شود؛ مدل اختیار غلط — FX3 |
| `IdentityVerification` بدون `organization_id`؛ FK ساده به `claims.id` | جداسازی مستأجر (RR2) برای Verification آزموده نمی‌شود — FX4 |
| هیچ رابطه‌ی **اختیاری** مرکب و هیچ **زوج سایه‌ای** | **پرسش اصلی Prisma** — رابطه‌ی اختیاری مرکب به `@@unique` با ستون سازمان سایه (§۳٫۳ طراحی) — **اصلاً آزموده نمی‌شود** — FX5 |
| یکتای عضویت روی `(organization_id, external_subject)` — بدون `identity_provider` | C2 با شکل مصوب آزموده نمی‌شود — FX8 |
| `VerificationStatus` = `APPROVED` (طراحی: `VERIFIED`) | فقط نام؛ اثر رفتاری ندارد — در گزارش ذکر شود |
| `Publication.created_at` در نقش `occurred_at`؛ بدون `reason` اجباری | ممیزی حداقلی F4 در رخداد آزموده نمی‌شود — FX3 |

**قاعده:** fixture می‌تواند ساده باشد، ولی **هر رابطه‌ای که آزمون ادعای اثباتش را دارد، باید همان شکل مصوب را داشته باشد.**

---

## ۴. C15 — گونه‌ی آزموده‌شده

- Trigger A پرچم را **پس از UPDATE خاموش می‌کند** (B2). این نشت اصلی‌ای را که در طرح main پیش‌بینی شده بود، **به احتمال زیاد می‌بندد.**
- در PostgreSQL، تغییر GUC با `is_local = true` در بازگشت زیرتراکنش هم برمی‌گردد.
- **ولی `assertions.sql` آزمون نشت (PC-04) و Savepoint (PC-07) را ندارد.** «به احتمال زیاد» شاهد نیست → FX2.

---

## ۵. یافته‌ی امنیتی — نوشتن بین‌مستأجری بی‌صدا از مسیر Prisma

**شاهد — `logs/04_prisma_write_path.log`، اجرای ۱۵:۵۷:**

```text
PASS prisma_composite_create
FAIL prisma_cross_tenant_connect was accepted
FAIL prisma_cross_tenant_connect stored_organization_id=prisma-org-a
PASS prisma_partial_unique_claim code=P2002
PASS prisma_publication_projection_read
PASS prisma_direct_projection_mutation code=SQLSTATE
VALIDATION_FAILURE_COUNT=1
```

**سناریوی آزمون** (`prisma-write-path.cjs`، خط ۴۸ تا ۶۴): ساخت `OfferVersion` با

```text
organization: connect { id: 'prisma-org-b' }
offer:        connect { id_organizationId: { id: 'prisma-offer-a', organizationId: 'prisma-org-a' } }
```

**تحلیل:**
- DB یک FK مرکب `(offer_id, organization_id) → offers(id, organization_id)` دارد (۸ `ALTER TABLE` در `01_baseline_apply.log`). پس ردیفِ **آمیخته** `(offer-a, org-b)` را **حتماً** رد می‌کرد.
- **تأیید شد:** ردیف با **`organization_id = prisma-org-a`** ذخیره شد. Prisma ستون مشترک `organizationId` را از `connect` مرکب آفر گرفت و **`connect` صریح سازمان (`org-b`) را بدون هیچ خطا یا هشداری کنار گذاشت.**
- Codex بعد از اجرای ۱۵:۵۲ ثبت ردیف ذخیره‌شده را خودش افزود و شکست را پنهان نکرد — **نیمه‌ی اول FX1 انجام شده است.**

**چرا این مهم است — حتی اگر DB سالم مانده باشد:**
- FK مرکب جلوی ردیف **آمیخته** را می‌گیرد، **نه جلوی ردیف در سازمان اشتباه.**
- اگر یک API سازمان را از زمینه‌ی احراز هویت با `organization: connect` بدهد و شناسه‌ی والد را از ورودی کاربر با `connect` مرکب شامل `organizationId` بگیرد، **کاربر سازمان B می‌تواند ردیفی در سازمان A بسازد.**
- DB آن را می‌پذیرد، چون ردیف از درون سازگار است.
- **این شکست مرز اختیار است** (D-08، ADR-0009، RR2) — و **دقیقاً همان خطری است که FY4-ج پیش‌بینی کرده بود**، حالا با شاهد.

**قاعده‌ی لازم برای CCR — پیشنهاد، تصمیم مالک:**
1. **سازمان هر نوشتن فقط از زمینه‌ی احراز هویت می‌آید** و فقط به‌صورت **ستون مستقیم** (`organizationId: ctx.organizationId`) نوشته می‌شود.
2. **هرگز `connect` مرکبی که `organizationId` را از ورودی بگیرد.** شناسه‌ی والد به‌صورت ستون مستقیم (`offerId: input.offerId`) نوشته شود، تا **FK مرکب DB** ردیف `(offer-a, org-b)` را با `23503` رد کند.
3. آزمون این قاعده در G1b (FX1) و بعداً در تست Repository.

---

## ۶. اصلاحات الزامی — FX1 تا FX12

| # | اصلاح | منشأ |
|---|---|---|
| **FX1** | ثبت ردیف ذخیره‌شده — ✅ **انجام شد** (`stored_organization_id=prisma-org-a`). **باقی:** گونه‌ی **ستون مستقیم** را بیفزا — `organizationId` از «زمینه»، `offerId` از «ورودی» — با انتظار `P2003`/`23503`. نتیجه در گزارش **یافته‌ی امنیتی** نامیده شود، نه «آزمون شکست‌خورده» | بند ۵ |
| **FX2** | آزمون نشت C15: (الف) درج رخداد برای X و UPDATE مستقیم Y در همان تراکنش → `P0001`؛ (ب) همان پس از `ROLLBACK TO SAVEPOINT`؛ (ج) گونه‌ی `pg_trigger_depth() > 1` به‌عنوان **variant برچسب‌دار** برای مقایسه | بند ۴ · R2 |
| **FX3** | `Publication`: جایگزینی `platform_actor_ref` با `performed_by_membership_id` + FK مرکب `(performed_by_membership_id, organization_id) → memberships(id, organization_id)` · `reason` اجباری · `occurred_at`. **ارجاع پلتفرمی فقط در Verification می‌ماند** | ADR-0010 · F1 · F4 |
| **FX4** | `IdentityVerification`: افزودن `organization_id` + FK مرکب به ادعا | RR2 |
| **FX5** | **یک رابطه‌ی اختیاری مرکب با زوج سایه** — `BusinessProfile.business_identity_claim_id` + `business_identity_claim_organization_id` → `business_identity_claims(id, organization_id)` — با CHECK C6. آزمون‌ها: `prisma validate` و `generate` · زوج نیمه‌پر **بدون** C6 (نمایش پذیرش در `MATCH SIMPLE`) و **با** C6 (`23514`) · سازمان نابرابر (`23514`) | R4 · FK-05 |
| **FX6** | **زنجیره‌ی پنج migration `origin/main`** را پیش از fixture Core اعمال کن — **با `git show origin/main:<path>` به پوشه‌ی موقت بیرون از مخزن**؛ نه merge، نه cherry-pick، نه نوشتن در `implementation/`. `external_workspace_link_active_unique` در inventory ثبت شود | R3 · DR-03 |
| **FX7** | DR — **دامنه کوچک شد؛ هسته‌اش در ۱۵:۵۸ گذشت.** باقی: (الف) **فرمان دقیق** `prisma migrate diff` در گزارش ثبت شود · (ب) گونه‌ی **`--from-migrations` + shadow DB** (مسیر پیش‌فرض `migrate dev`) با همان انتظار «فقط ستون تازه» · FK-07 با `pg_get_constraintdef` ثابت شد و کافی است | R3 |
| **FX8** | آزمون‌های غایب: C2 با `identity_provider` · C3 (جدول حداقلی اعطا + یکتای جزئی فعال) · C4 (FX5) · FK حلقوی `Organization ⇄ Membership` (آرشیوکننده) · `DELETE` روی `publications` → `P0001` · FY2 (پیوند نسخه‌ی منتشرشده) · جایگزینی به ترتیب غلط → `23505` | R4 |
| **FX9** | هم‌زمانی: `pg_sleep` با **مانع Advisory Lock** جایگزین شود؛ سناریوی موجود **۲۰ بار** در `READ COMMITTED` و **۲۰ بار** در `SERIALIZABLE` | طرح main §۶ |
| **FX10** | **پاک‌سازی:** حذف `package.json` و `package-lock.json` **ریشه** (untracked) و `node_modules` ریشه · ابزار Prisma و `@prisma/client` 5.22.0 در **پوشه‌ی موقت بیرون از مخزن** نصب و از آنجا اجرا شود (`--schema` به fixture) · پایان: `docker rm -f -v mlino-g1b-postgres-20260912` | بدهی فنی · ایمنی |
| **FX11** | **گزارش G1b:** commit مبنا · SHA-256 **هر** فایل fixture · مسیر و commit **هر دو** طرح (`mlino_book/…` @ `a2fb238`، `mlino2/…` @ `7411754`) · جدول آزمون‌ها با SQLSTATE مورد انتظار و مشاهده‌شده · شاهد ردیف FX1 · حکم طبق §۸ بازبینی بستن G1 | R1 · D2 |
| **FX12** | **دقت آزمون‌های منفی:** `expectRejected` در `prisma-write-path.cjs` **هر** استثنایی را PASS می‌شمارد. `code=SQLSTATE` در log یعنی کد خطا اصلاً ثبت نشده است؛ خطای اتصال یا خطای نامربوط هم «PASS» می‌شود. **هر آزمون منفی کد مورد انتظار را بسنجد:** Prisma `P2002`/`P2003`، یا SQLSTATE از `error.meta` / پیام؛ برای Trigger، `P0001`. هر خطای دیگر = FAIL | اعتبار شواهد |

---

## ۷. گام بعد

### Next Task
**تکمیل G1b با اصلاحات FX1 تا FX12 و تحویل گزارش G1b — سپس توقف برای بازبینی نگهبان.**

### TARGET_HANDOFF_ID
`HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION` — Handoff زنده‌ی شاخه‌ی Codex

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-G1B-COMPLETION-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
REVIEWED_BY: AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1_POSTGRES_VALIDATION.md (origin/main)
DECISION: APPROVED_WITH_FIXES

TASK:
Complete G1b PostgreSQL validation (R1-R4 of mlino_book/MLINO_G1_CLOSURE_REVIEW.md)
by applying fixes FX1-FX12 of the review above. Validation only.

STEPS:
0. Stop the current G1b run. Record what already ran (logs 00-04) as-is.
1. FX10 hygiene first: delete untracked repo-root package.json and package-lock.json,
   delete repo-root node_modules. Install prisma@5.22.0 and @prisma/client@5.22.0 in a
   temp tooling folder OUTSIDE the repo and run all Prisma commands/scripts from there
   (use --schema to point at mlino2/validation/g1b/prisma/*.prisma).
2. FX6: build the baseline DB from the five origin/main migrations, extracted with
   `git show origin/main:implementation/prisma/migrations/<name>/migration.sql` into the
   temp folder. Do not write into implementation/. Then apply the Core fixture.
3. Update the fixture to the approved design shape for every relation under test:
   FX3 (Publication performer = membership, composite FK, reason, occurred_at),
   FX4 (IdentityVerification organization_id + composite FK),
   FX5 (optional composite relation with shadow organization column + C6 CHECK),
   FX8 (C2 with identity_provider, C3 grant table, circular Organization<->Membership).
4. Tests: FX1 (record stored row; add direct-scalar variant expecting P2003/23503),
   FX2 (C15 leak in same transaction and after ROLLBACK TO SAVEPOINT; labeled
   pg_trigger_depth() variant for comparison), FX5 tests, FX7 (record the exact migrate diff
   command; add a --from-migrations + shadow DB variant; expected: only the new column), FX8 tests,
   FX9 (advisory-lock barriers; 20 runs READ COMMITTED + 20 runs SERIALIZABLE),
   FX12 (every negative test asserts its expected error code; any other error = FAIL).
5. FX11: write mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION_G1B.md with base commit,
   SHA-256 of every fixture file, both plan references (mlino_book/... @ a2fb238,
   mlino2/... @ 7411754), per-test expected vs observed SQLSTATE, FX1 stored-row
   evidence classified as a SECURITY FINDING, and a verdict per
   MLINO_G1_CLOSURE_REVIEW.md section 8 (G1 PASS / PASS WITH CONDITIONS / NOT CLOSED).
6. Teardown: docker rm -f -v mlino-g1b-postgres-20260912. Delete the temp tooling folder.
7. Commit only allowed files. Append to mlino2/HANDOFF/HANDOFF_STATE.md. Push.
8. STOP. Do not start any next step. Await the Architecture Guardian review.

ACCEPTANCE:
- Every test has expected and observed SQLSTATE.
- No connection string, password or token appears in any committed file or log.
- No repo-root package.json/package-lock.json/node_modules in the commit.
- FX1 and FX2 results are explicit even if they fail.
```

### Allowed files to modify — شاخه‌ی `codex/v2-intent-flow-foundation` فقط

| مسیر | مجوز |
|---|---|
| `mlino2/validation/g1b/**` | ساخت و تغییر — **فقط شاهد اعتبارسنجی**؛ نه schema یا migration محصول |
| `mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION_G1B.md` | **فایل تازه** |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | **فقط افزودنی** |
| `AI_HANDOFF/CLAUDE_REPORTS/20260912_G1B_*.md` | **فقط فایل تازه** |

### Forbidden changes

- `implementation/**` — شامل `schema.prisma`، migrationها، کد، تست، `package.json` و lockfile آن
- هر ADR (`docs/architecture/**`) و هر سند طراحی، حل موانع یا طرح اعتبارسنجی موجود — **فقط خواندن**
- **`package.json`، `package-lock.json` یا `node_modules` در ریشه‌ی مخزن** — نه ساخت، نه commit
- **`AI_HANDOFF/CLAUDE_LATEST_REPORT.md` و `AI_HANDOFF/HANDOFF_STATE.md` ریشه** — منبع تعارض ادغام؛ دیگر نوشته نشوند
- سه فایل commitنشده‌ی قدیمی: `MLINO_FIRST_VALUE_PATH_PLAN.md` · `MLINO_PHASE_0_CLOSURE_REPORT.md` · `MLINO_PHASE_0_IMPLEMENTATION_READINESS_REPORT.md`
- `merge`، `rebase`، `cherry-pick`، `push --force`، تغییر شاخه
- **هر پایگاه داده‌ای جز container یک‌بارمصرف — به‌ویژه `mlino-v1-local-db`**
- اعمال P1 تا P12 در اسناد طراحی — **در fixture فقط به‌صورت variant برچسب‌دار**
- هر اعتبارنامه یا رشته‌ی اتصال در فایل، log یا گزارش
- **هر گام پس از گزارش G1b بدون بازبینی نگهبان**

---

## ۸. برای مالک

- **Codex همین حالا در حال اجراست** — container بالا؛ تا ۱۵:۵۹ assertions SQL، مسیر نوشتن Prisma، یک رقابت هم‌زمان و **migration دوم Prisma** اجرا شده‌اند. **خبر خوب:** Prisma 5.22 قیدهای دستی را پاک نکرد و FKها `RESTRICT` واقعی‌اند. پیشنهاد: دستور بالا را به Codex بدهید تا **متوقف، اصلاح و تکمیل** کند.
- **یافته‌ی بند ۵** در هر حال باید به CCR برود: «سازمان هر نوشتن فقط از زمینه‌ی احراز هویت، و فقط به‌صورت ستون مستقیم».
- وضعیت دروازه‌ها: **G1 NOT CLOSED** (در انتظار G1b) · G2 باز · G3 باز · **`schema.prisma` مسدود.**

من کلاد هستم
