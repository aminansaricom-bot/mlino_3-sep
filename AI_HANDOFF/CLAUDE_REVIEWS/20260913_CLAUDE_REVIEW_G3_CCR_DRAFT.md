# بازبینی نگهبان معماری — پیش‌نویس CCR شِمای Core (G3)

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G3_CCR_DRAFT_REPORT.md`
**سند زیر بازبینی:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md` (DRAFT)
**شواهد:** `mlino2/validation/g3/**`
**Commitها:** `1c53ba2` (CCR و شواهد) · `48834d1` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`، مبنا `ee7fb95`
**دستور اجراشده:** `CODEX-20260912-G3-CCR-DRAFT-001` · **TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

---

## تصمیم

# `APPROVED_WITH_FIXES`

- **CCR هنوز آماده‌ی تصویب مالک نیست.**
- **دو حفره‌ی واقعی** نسبت به طراحی مصوب (R-1 و R-2) و **یک سازوکار نامشخص** (R-3 → تصمیم مالک D6) باید بسته شوند.
- پس از آن، **اعتبارسنجی از صفر** به‌صورت **G3b** اجرا می‌شود — با آزمون‌هایی که همین حفره‌ها را پوشش دهند.
- **هیچ‌کدام از این‌ها معماری مصوب را زیر سؤال نمی‌برد.** همه اصلاح متن SQL یا آزمون‌اند.
- **`schema.prisma` و migration محصول همچنان مسدودند.**

---

## ۱. آنچه عالی است

| | |
|---|---|
| **کشف و رفع نقص C6** | اجرای اول نشان داد CHECK سایه در حالت «یک جزء `NULL`» نتیجه‌ی `NULL` می‌دهد و **ردیف را می‌پذیرد** — منطق سه‌مقداری SQL. متن اصلاح شد (هر دو جزء صریحاً `IS NOT NULL`)، محیط از صفر بازسازی شد. **این دقیقاً کاری است که اعتبارسنجی باید بکند.** نگهبان متن اصلاح‌شده‌ی هر ۱۲ CHECK سایه را خواند: درست است |
| **دامنه** | فقط CCR، ۳۲ فایل `g3`، گزارش و Handoff افزودنی (صفر خط حذف). **هیچ مسیر ممنوعی** — `schema.prisma`، migrationها، `package.json`، ADRها، شاخه‌ی V2 و `main` دست‌نخورده |
| **استفاده‌ی فقط‌خواندنی از Prisma در `_PUSH_STAGING`** | نگهبان مستقلاً بازمحاسبه کرد: اثر انگشت هر چهار پوشه **دقیقاً برابر مبنا** است |
| **پاک‌سازی** | `g3-tooling` نیست، container G3 نیست |
| **شرط G2-C1** | همه‌ی hashهای CCR روی `git show` — نمونه‌ها با `canonical-git-hashes.log` برابرند |
| **D1 تا D5** | صحیح ثبت شده‌اند (مالک تأیید کرد). **D4 رعایت شده:** هیچ FK به `external_workspace_links` |
| **D5** | همه‌ی FK، unique و index Prisma با `map:` نام ثابت دارند؛ اشیای دستی نام ثابت دارند |
| **W1** | از مسیر Prisma: `P2003` |
| **شکل مدل‌ها** | هر ۱۲ مدل، ۱۵ enum، `Organization.id` `TEXT` بدون پیش‌فرض، `timestamptz(3)`، `RESTRICT` همه‌جا، زوج‌های سایه، ممیزی حداقلی، بدون `CUSTOMER_DATA`، بدون `version_status`، بدون `grant_id` — مطابق طراحی v3 |
| **صداقت** | ۵ حادثه‌ی اجرا ثبت شده و هیچ‌کدام شاهد PASS نشده‌اند |

---

## ۲. یافته‌ها

### 🔴 R-1 — محافظ C15 فقط ستون `publication_status` را می‌پاید

**متن CCR §۶:**

```sql
CREATE TRIGGER business_profile_publication_projection_guard
BEFORE UPDATE OF publication_status ON business_profiles ...
```

همین شکل برای `capabilities` و `offer_versions`.

**مشکل:** در PostgreSQL، `BEFORE UPDATE OF col` **فقط وقتی اجرا می‌شود که `col` در فهرست `SET` باشد.** پس این دستور **پذیرفته می‌شود:**

```sql
UPDATE business_profiles SET published_content_revision = content_revision WHERE id = …;
```

- `publication_status` همان `PUBLISHED` می‌ماند؛ CHECK بازبینی (`published_content_revision BETWEEN 1 AND content_revision`) هم می‌گذرد.

**پیامد:**
- محتوای ویرایش‌شده‌ای که طبق §۵٫۲ طراحی باید **نامرئی** باشد (`content_revision ≠ published_content_revision`)، **بدون رخداد `Publication` و بدون انجام‌دهنده‌ی انسانی** عمومی می‌شود.
- این دقیقاً همان دور زدنی است که «ایمن در شکست» (PY5) و F1 برای جلوگیری از آن تعریف شدند.
- **سند حل موانع §۵٫۲ صریحاً سه ستون را خواسته بود:** `publication_status`، `published_content_revision`، `published_at`.
- برای `offer_versions`: `published_at` هم مستقیم تغییرپذیر است — C13 آن را عمداً از تغییرناپذیری معاف کرده و C15 آن را نمی‌پاید.

**آزمون‌ها این را نیازموده‌اند** (`assertions.sql`: فقط UPDATE مستقیم `publication_status`).

**اصلاح:**

```sql
BEFORE UPDATE OF publication_status, published_content_revision ON business_profiles
BEFORE UPDATE OF publication_status, published_content_revision ON capabilities
BEFORE UPDATE OF publication_status, published_at ON offer_versions
```

همان تابع و همان شرط `pg_trigger_depth() <= 1`.

### 🔴 R-2 — پیوندهای نسخه‌ی منتشرشده با INSERT تغییرپذیرند

**متن CCR §۶:** `offer_version_capability_immutable_before_change` فقط **`BEFORE UPDATE OR DELETE`** است.

**مشکل:**
- **INSERT آزاد است:** می‌توان به نسخه‌ای که **منتشر شده** توانمندی تازه پیوند زد — یعنی محتوای عمومی آفر منتشرشده بدون نسخه‌ی تازه و بدون رخداد انتشار تغییر می‌کند.
- این هم تغییرناپذیری نسخه‌ی منتشرشده را می‌شکند، هم **قاعده‌ی FY2 مصوب** را: «درج و حذف پیوند فقط وقتی مجاز است که نسخه **هرگز منتشر نشده باشد** (`published_at IS NULL`)؛ UPDATE همیشه رد».
- از آن طرف، DELETE **همیشه** رد می‌شود — حتی برای پیش‌نویس — که از FY2 سخت‌گیرانه‌تر است.

**آزمون‌ها `offer_version_capabilities` را اصلاً لمس نکرده‌اند.**

**اصلاح:** Trigger `BEFORE INSERT OR UPDATE OR DELETE` روی `offer_version_capabilities`:
- UPDATE → همیشه `P0001`
- INSERT و DELETE → `P0001` اگر `offer_versions.published_at IS NOT NULL` برای نسخه‌ی مربوط؛ وگرنه مجاز

### 🟡 R-3 — سازوکار افزایش `content_revision` نامشخص است → تصمیم مالک **D6**

- طراحی §۵٫۲: «هر ویرایش فیلد عمومی `content_revision` را یکی زیاد می‌کند».
- سند حل موانع §۴٫۳: «تغییر عمومی بدون افزایش Revision باید **در سطح Database یا تنها مسیر نوشتن معتبر** رد شود».
- **CCR هیچ‌کدام را تعیین نکرده است.** بدون آن، یک ویرایش فیلد عمومی روی Profile یا Capability منتشرشده **بدون افزایش بازبینی** مستقیم عمومی می‌شود — حتی پس از بستن R-1.

| گزینه | سازوکار | نظر نگهبان |
|---|---|---|
| **D6-A** | Trigger `BEFORE UPDATE` روی `business_profiles` و `capabilities` که وقتی هر فیلد عمومی `IS DISTINCT FROM` مقدار قبلی است، `content_revision` را **خودکار** یکی زیاد کند (همان P9) | **پیشنهاد.** هیچ مسیری نمی‌تواند فراموش کند؛ «ایمن در شکست» در خود DB تضمین می‌شود |
| D6-B | فقط سرویس دامنه، با تست یکپارچه | ضعیف‌تر؛ هر مسیر نوشتن آینده باید آن را رعایت کند |

**فیلدهای عمومی** (از طراحی §۵٫۲):
- **Profile:** `name` · `description` · `latitude` · `longitude` · `address_text` · `contact_information` · `links` · `business_hours` · `business_identity_claim_id`
- **Capability:** `name` · `short_description` · `category_key` · `audience`

**D6-A یک Trigger دوم است که ستون‌های دیگری را روی همین جدول‌ها می‌نویسد.** فهرست بسته‌ی §۶٫۱ باید آن را صریحاً بیاورد. این Trigger `publication_status` یا `published_*` را **نمی‌نویسد**، پس با محافظ C15 تداخلی ندارد.

### 🟡 R-4 — انتشار دوباره‌ی بازبینی تازه با طراحی ناهمخوان است

- `core_apply_publication_projection` برای Profile و Capability رخداد `PUBLISHED` را **فقط** از `UNPUBLISHED` یا `WITHDRAWN` می‌پذیرد.
- طراحی §۵٫۲ برای ویرایش موضوع منتشرشده **«رخداد `PUBLISHED` تازه»** را پیش‌بینی کرده است. با متن فعلی، انتشار دوباره فقط با جفت `WITHDRAWN` + `PUBLISHED` ممکن است — تاریخچه‌ی پرنویز و دو رخداد برای یک عمل.

**اصلاح — هم‌خوان با طراحی، بدون تصمیم تازه:** گذار مجاز افزوده شود:

```text
publication_status = 'PUBLISHED' AND NEW.content_revision > published_content_revision
```

در کنار دو حالت فعلی.

### 🟡 R-5 — پوشش آزمون ناکافی برای مسیرهای حیاتی

`assertions.sql` **فقط مسیر OfferVersion** را برای انتشار آزموده است. آزمون‌های لازم در G3b:

| # | آزمون | انتظار |
|---|---|---|
| T1 | انتشار Profile با `content_revision` برابر | `PUBLISHED`، `published_content_revision` پر |
| T2 | انتشار Profile با `content_revision` نابرابر | `P0001` |
| T3 | ویرایش فیلد عمومی Profile منتشرشده (با D6-A) | `content_revision` +1؛ `published_content_revision` ثابت؛ **پرس‌وجوی مرجع نمایش (§۵٫۱ طراحی) صفر ردیف** |
| T4 | **R-1:** UPDATE مستقیم `published_content_revision` (Profile و Capability) و `published_at` (OfferVersion) | `P0001` |
| T5 | **R-4:** انتشار دوباره‌ی Profile و Capability با بازبینی بزرگ‌تر | پذیرفته؛ رخداد با بازبینی کوچک‌تر یا برابر → `P0001` |
| T6 | همین T1، T2 و T5 برای Capability | همان |
| T7 | **R-2:** INSERT پیوند روی نسخه‌ی منتشرشده | `P0001` |
| T8 | **R-2:** INSERT و DELETE روی نسخه‌ی پیش‌نویس | مجاز |
| T9 | **R-2:** UPDATE پیوند | `P0001` |
| T10 | `DELETE FROM publications` | `P0001` |
| T11 | C8 برای ادعا (`SUSPENDED` بدون ارجاع پلتفرم)، عضویت و اعطا (`REVOKED` بدون انجام‌دهنده یا با دو انجام‌دهنده) | `23514` |
| T12 | **فهرست بسته‌ی Triggerها:** مجموعه‌ی **دقیق** Triggerهای غیرداخلی روی `publications`، `business_profiles`، `capabilities`، `offer_versions` و `offer_version_capabilities` با فهرست مورد انتظار CCR برابر باشد — **نه فقط وجود یک Trigger** | برابر |

### 🟡 R-6 — انحراف نام‌گذاری از طراحی مصوب

- CCR مدل `Membership` طراحی را **`OrganizationMembership`** و جدول را **`organization_memberships`** نامیده است.
- دلیلی ثبت نشده، و همه‌ی اسناد مصوب (طراحی v3، بازبینی‌ها، G1) `Membership` / `memberships` می‌گویند.

**اصلاح:** به نام طراحی برگردد: `Membership` · `@@map("memberships")` · نام قیدها متناظر. **یا** اگر Codex دلیل فنی دارد (مثلاً تداخل نام)، آن را در CCR ثبت کند تا مالک آگاهانه تصویب کند.

### 📄 R-7 — اعلام صریح اعتبارسنجی گذار

- تابع projection با `ROW_COUNT <> 1` **گذارهای نامعتبر را رد می‌کند.** این همان پیشنهاد P2 طرح اعتبارسنجی است.
- با F1 هم‌خوان است و **نگهبان آن را درست می‌داند**، ولی مالک صریحاً تصویبش نکرده است.
- **اصلاح:** در §۴ یا §۶ CCR صریح بیاید: «سازوکار D1 شامل اعتبارسنجی گذار است: WITHDRAWN فقط از PUBLISHED؛ PUBLISHED فقط از UNPUBLISHED یا WITHDRAWN یا (طبق R-4) PUBLISHED با بازبینی بزرگ‌تر». پس مالک با تصویب CCR آن را آگاهانه تصویب می‌کند.

### 📄 نکته‌های بی‌اقدام

- هم‌زمانی در G3 یک سناریو است؛ با توجه به ۴۰ اجرای G1c روی همان سازوکار، **کافی است.**
- FKهای cascade قدیمی `_EventCoreEntities` (شِمای V1) بیرون از دامنه‌اند — درست ثبت شده‌اند.
- جدول `evidence` مفرد است؛ اسم غیرقابل‌شمارش — **پذیرفته.**

---

## ۳. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ⚠️ **ADR-0010 و F1:** R-1 اجازه می‌دهد محتوا بدون رخداد انسانی عمومی شود؛ پس از اصلاح ✅ |
| ۲ | مشخصات مصوب | ⚠️ R-1 (سند حل موانع §۵٫۲) · R-2 (FY2) · R-4 (§۵٫۲ طراحی) · R-6 (نام‌ها) |
| ۳ | Core و ماژول | ✅ بدون واژه‌ی صنفی؛ Core جدول ماژول را نمی‌خواند |
| ۴ | چند Vertical | ✅ `category_key`، `permission_key` و `identifier_type` رشته‌اند |
| ۵ | امنیت و اجازه | ⚠️ R-1 · R-3 · W1 ✅ · انتشار فقط با عضو ✅ · بدون Role ✅ |
| ۶ | ایمنی migration | ✅ فهرست حفاظت‌شده · بازبینی اجباری diff · rollback پیش و پس از داده · زنجیره‌ی main دست‌نخورده |
| ۷ | بدهی فنی | ⚠️ R-5 (پوشش) · R-6 (نام) |

---

## ۴. گام بعد

### پیش‌شرط: تصمیم مالک **D6**
- **D6-A** — Trigger افزایش خودکار `content_revision` · **پیشنهاد نگهبان**
- D6-B — فقط سرویس دامنه

### Next Task
**G3b — اعمال R-1 تا R-7 در متن CCR، گسترش آزمون‌ها (T1 تا T12) و اعتبارسنجی کامل از صفر.** CCR `DRAFT` می‌ماند.

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G3B-CCR-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G3_CCR_DRAFT.md
DECISION: APPROVED_WITH_FIXES
OWNER_DECISION_D6: ________   (A = DB trigger auto-increments content_revision on public-field change; B = domain service only)

TASK:
Apply R-1..R-7 of the review to the CCR text, extend the validation with T1..T12, and re-run the full
G3 validation from scratch as G3b. The CCR stays DRAFT.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>. If OWNER_DECISION_D6 is blank: STOP.
1. Edit only implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md:
   R-1 guard columns (profiles/capabilities: publication_status, published_content_revision;
       offer_versions: publication_status, published_at);
   R-2 offer_version_capabilities: UPDATE always P0001; INSERT/DELETE P0001 iff parent version published_at IS NOT NULL;
   R-3 record D6 and, if D6=A, add the auto-increment trigger for the listed public fields and add it to the §6.1
       closed trigger list;
   R-4 allow PUBLISHED -> PUBLISHED for Profile/Capability only when NEW.content_revision > published_content_revision;
   R-6 rename OrganizationMembership/organization_memberships back to Membership/memberships (and dependent map names),
       or record a technical reason in the CCR;
   R-7 state transition validation explicitly as part of D1.
   Add a "G3b changes" section listing every change with its R-number.
2. Create mlino2/validation/g3b/ (do NOT modify mlino2/validation/g3/**). Rebuild everything from scratch:
   extract CCR text, five origin/main migrations, generated SQL + manual SQL, assertions including T1..T12,
   Prisma validate/generate (explicit generator output in TEMP), W1 write path, from-migrations diff,
   unrelated-change inventory before/after.
3. Tooling: read-only Prisma 5.22.0 from C:\mlino code\_PUSH_STAGING\implementation\node_modules with
   CHECKPOINT_DISABLE=1 and PRISMA_GENERATE_SKIP_AUTOINSTALL=1; record the four-folder fingerprint before and after
   (must equal the guardian baseline). Disposable PostgreSQL 16 with --rm; never touch mlino-v1-local-db or its volume.
4. All hashes over git show bytes. Every negative test asserts its exact SQLSTATE / Prisma code.
5. Teardown: container and temp tooling removed, with command output as evidence.
6. Write AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G3B_CCR_FIXES_REPORT.md (10 sections, REVIEW_REFERENCE, BASE_COMMIT,
   per-R and per-T result table). Append to mlino2/HANDOFF/HANDOFF_STATE.md. Commit only allowed files. Push.
7. STOP. Await Architecture Guardian review.
```

### Allowed files — فقط شاخه‌ی `codex/core-prisma-foundation`
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md` — ویرایش؛ وضعیت همچنان DRAFT
- `mlino2/validation/g3b/**` — تازه
- `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G3B_CCR_FIXES_REPORT.md` — تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- `mlino2/validation/g3/**` · `g1b` · `g1c` — شواهد پیشین تغییرناپذیرند
- `implementation/prisma/**` · `implementation/package.json` · lockfileها · هر کد، service یا test
- تغییر وضعیت CCR به `APPROVED` — **فقط مالک**
- ADRها · `mlino_book/**` · اسناد طراحی کپی‌شده · فایل‌های ریشه‌ی `AI_HANDOFF` · `AI_HANDOFF/CLAUDE_REVIEWS/**`
- هر نوشتن در `C:\mlino code\_PUSH_STAGING`
- شاخه‌ی V2 · `main` · `merge`، `rebase`، `cherry-pick`، `push --force`
- FK به `external_workspace_links` (D4)
- هر گام پس از گزارش G3b بدون بازبینی نگهبان

---

## ۵. برای مالک

1. **تصمیم D6** — پیشنهاد نگهبان: **A** (Trigger افزایش خودکار بازبینی). جای خالی `OWNER_DECISION_D6` را در دستور بالا پر کنید و به Codex بدهید.
2. **R-1 و R-2 مهم‌اند:** بدون آن‌ها، محتوای ویرایش‌شده یا پیوندهای آفر منتشرشده **بدون رخداد انتشار انسانی** قابل تغییرند — درست همان چیزی که کل طراحی انتشار برای جلوگیری از آن ساخته شد.
3. **وضعیت دروازه‌ها:** G1 ✅ (با شرط) · G2 ✅ · **G3: پیش‌نویس CCR نیازمند اصلاح (G3b)** · **`schema.prisma` مسدود.**

من کلاد هستم
