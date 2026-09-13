# گزارش اجرای G2 — شاخه مستقل Core Prisma

- **INSTRUCTION_ID:** `CODEX-20260912-G2-CORE-BRANCH-001`
- **TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
- **REVIEW_REFERENCE:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1C_VALIDATION.md` در Commit `28438f22d8cfb04f114834e8b164af7c65dcea11`
- **OWNER_CONFIRMATION:** گزینه C و اجرای G2 صریحاً توسط مالک تأیید شد.
- **BASE_COMMIT:** `28438f22d8cfb04f114834e8b164af7c65dcea11`
- **SOURCE_COMMIT:** `f4d326f7d2046eee997dba4198f662c6e5d1e84e`
- **BRANCH:** `codex/core-prisma-foundation`
- **DELIVERY_COMMIT:** `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719`
- **وضعیت:** تحویل‌شده و در انتظار بازبینی Architecture Guardian

## ۱. کار اجراشده

گزینه C اجرا شد: یک worktree مستقل و شاخه‌ی `codex/core-prisma-foundation` مستقیماً از `origin/main` ساخته شد. هیچ merge، rebase یا cherry-pick انجام نشد. هفت سند مصوب، بایت‌به‌بایت از Commit منبع به همان مسیرها منتقل شدند. یک manifest برای محتوای canonical شواهد G1b/G1c و یک قاعده‌ی `.gitattributes` ساخته شد. پوشه‌های شواهد به شاخه جدید کپی نشدند.

`ExternalWorkspaceLink`، migration مربوط، سرویس، تست و قرارداد mapping روی مبنای `origin/main` موجود بودند و فقط خوانده و hash شدند؛ هیچ‌کدام تغییر نکردند.

## ۲. اسناد منبع استفاده‌شده

- بازبینی مجوزدهنده: `AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1C_VALIDATION.md` از `origin/main@28438f22d8cfb04f114834e8b164af7c65dcea11`
- گردش‌کار: `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md`
- منبع هفت سند: `origin/codex/v2-intent-flow-foundation@f4d326f7d2046eee997dba4198f662c6e5d1e84e`
- تأیید مستقیم مالک برای گزینه C و دستور `CODEX-20260912-G2-CORE-BRANCH-001`

## ۳. فایل‌های تغییریافته

فایل‌های محتوایی Commit `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719`:

- `.gitattributes`
- `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md`
- `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md`
- `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md`
- `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md`
- `mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md`
- `mlino2/PRISMA_G1B_CLOSURE_REPORT.md`
- `mlino2/PRISMA_G1C_VALIDATION_REPORT.md`
- `mlino2/validation/G1_EVIDENCE_MANIFEST.md`

فایل‌های bookkeeping این تحویل:

- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_G2_CORE_BRANCH_REPORT.md`
- `mlino2/HANDOFF/HANDOFF_STATE.md`

### اثبات کپی بایت‌به‌بایت

Git blob هر سند در Commit منبع و Commit تحویل یکسان بود. SHA-256 زیر از بایت‌های دقیق خروجی `git show SOURCE_COMMIT:PATH` محاسبه شده است:

| فایل | منبع | SHA-256 |
|---|---|---|
| `mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` | `f4d326f7d2046eee997dba4198f662c6e5d1e84e` | `dff76aae5c7be67234998a73ee92a2716ff99b17e98f659bdf19abbf191823e6` |
| `mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md` | همان Commit | `b0d229751a4c141b634afe4160c72674c42bef94145891e27ab935bac237d785` |
| `mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md` | همان Commit | `92ecc10f9e136fff34808820cb39abcc37485db98d29063b3f7a1ed70db588f4` |
| `mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md` | همان Commit | `6fdfe2ff97757f2f03e90b38f687c9c5d46355dd161249a2a918b7974b272f60` |
| `mlino2/PRISMA_G1B_CLOSURE_REPORT.md` | همان Commit | `277ab119c36f2fd367fe9f74b75777bc1a36d8b5887fc8dad342e92a47db6276` |
| `mlino2/PRISMA_G1C_VALIDATION_REPORT.md` | همان Commit | `9ad9bb0945f21b7d6feb696c8a8f1e4dcd46122568754f0e5600bd6de85a9b6d` |
| `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md` | همان Commit | `93ee49ac5ac6c7ac51f8edb5642e9166ab4ea9e51c2da580a098433a5d0a6e6e` |

خروجی تطبیق Git blob برای هر هفت فایل `MATCH` بود. Manifest شامل هر ۸۳ فایل موجود زیر `mlino2/validation/g1b/` و `mlino2/validation/g1c/` در Commit منبع است. hash manifest برابر `546bc02b00c3221c381261743455e146821b95c48694170ac0ae4db61324d3b9` است.

## ۴. فایل‌های تغییریافته‌نشده

- کل `implementation/**`، شامل `implementation/prisma/schema.prisma`
- هر پنج migration محصول
- سرویس و تست `ExternalWorkspaceLink`
- `mlino_book/**` و ADRها
- `AI_HANDOFF/CLAUDE_REVIEWS/**` و `AI_HANDOFF/CLAUDE_REPORTS/**`
- `AI_HANDOFF/CLAUDE_LATEST_REPORT.md`
- `AI_HANDOFF/HANDOFF_STATE.md`
- `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md`
- شاخه‌ی `codex/v2-intent-flow-foundation` و سه فایل untracked قدیمی آن
- `main`
- پوشه‌های `mlino2/validation/g1b/` و `mlino2/validation/g1c/` در شاخه جدید وجود ندارند.

SHA-256 مبنای Prisma که پیش و پس از انتقال یکسان ماند:

| فایل | SHA-256 |
|---|---|
| `implementation/prisma/schema.prisma` | `c26f0de3612edd4009dd16759f7d471323beb4c4d2826661d05553c64cc74906` |
| `implementation/prisma/migrations/20260814065924_init/migration.sql` | `976204bfe6f03d853b86f67fc7ab307d6f49afb27b8e967bc231d84b247d5e9a` |
| `implementation/prisma/migrations/20260815033018_add_situation_key/migration.sql` | `bc21d148f1af07df7fd3e49274aa70583a5f00e7e27b81945d19f3e967d7ab43` |
| `implementation/prisma/migrations/20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql` | `4dc85a5c2a13064069f024a014f501f666b00ef9cd74ca00555b1635eef78908` |
| `implementation/prisma/migrations/20260906001500_add_ownership_type/migration.sql` | `845927b41316685a56eba2ea9d98ca247569ef3a40095f8eca3ac6659674dc98` |
| `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql` | `b4b4087ea9a7ac49215b8c93a63ae8f2716311d30c08d54018dea6177322737f` |

## ۵. تست‌های اجراشده

- `prisma --version` با نصب موقت Prisma CLI در خارج از مخزن
- `prisma validate --schema implementation/prisma/schema.prisma`
- مقایسه Git blob هفت سند میان Commit منبع و Commit تحویل
- محاسبه SHA-256 برای schema و پنج migration
- شمارش و hash محتوای canonical تمام ۸۳ شاهد G1b/G1c
- بررسی دامنه با `git diff --name-only origin/main...HEAD`
- بررسی نبود تغییر زیر `implementation/`
- بررسی نبود پوشه‌های شواهد G1b/G1c در شاخه جدید

تست کد، generate، migrate، پایگاه داده و Docker اجرا نشدند؛ در دامنه G2 نبودند.

## ۶. نتایج تست

`prisma --version`:

```text
prisma                : 5.22.0
Computed binaryTarget : windows
Node.js               : v24.18.0
Default Engines Hash  : 605197351a3c8bdd595af2d2a9bc3025bca48ea2
```

`prisma validate`:

```text
Prisma schema loaded from ..\core-prisma-foundation\implementation\prisma\schema.prisma
The schema at ..\core-prisma-foundation\implementation\prisma\schema.prisma is valid
```

دامنه Commit محتوایی:

```text
.gitattributes
AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md
mlino2/MLINO_CORE_PRISMA_BLOCKER_RESOLUTION.md
mlino2/MLINO_CORE_PRISMA_SCHEMA_DESIGN.md
mlino2/MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md
mlino2/PRISMA_G1B_CLOSURE_REPORT.md
mlino2/PRISMA_G1C_VALIDATION_REPORT.md
mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md
mlino2/validation/G1_EVIDENCE_MANIFEST.md
```

خروجی بررسی `implementation/` خالی بود. قاعده‌ی `.gitattributes` دقیقاً یک خط `mlino2/validation/** -text` و ۲۷ بایت با LF پایانی است.

پوشه موقت ابزار بعد از validate حذف شد. هیچ `package.json`، `package-lock.json` یا `node_modules` در ریشه مخزن ایجاد نشد.

## ۷. شناسه Commit

- Commit مبنا: `28438f22d8cfb04f114834e8b164af7c65dcea11`
- Commit محتوایی G2: `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719`
- Remote پس از Push محتوایی: `refs/heads/codex/core-prisma-foundation` روی `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719`
- Commit گزارش و Handoff پس از نهایی‌شدن این فایل ایجاد و در پاسخ تحویل اعلام می‌شود؛ درج hash خود Commit در محتوای همان Commit وابستگی دوری ایجاد می‌کند.

## ۸. ریسک‌های باقی‌مانده

- G1 با شرایط Guardian بسته شده است؛ تصمیم‌های C15، W1/W2، نسخه ثابت Prisma و قواعد SQL دستی باید در G3 تثبیت شوند.
- `schema.prisma` هنوز مجوز تغییر ندارد.
- در اولین تلاش نصب ابزار موقت، دریافت binary Prisma بدون خروجی متوقف ماند و فرآیند متوقف شد. اجرای رسمی postinstall همان نسخه در تلاش بعد موفق شد و validate عبور کرد.
- یک `npm init` ابتدا به اشتباه در پوشه والد worktree اجرا شد و فایل موقت `C:\Users\galexy\mlino code\package.json` ساخت. timestamp همان لحظه ثبت و فایل فوراً حذف شد؛ مخزن و فایل‌های پروژه تحت تأثیر قرار نگرفتند. پوشه ابزار صحیح نیز پس از validate پاک شد.

## ۹. پرسش‌های باز

- انتخاب نهایی سازوکار C15 در G3.
- الزام W1 و وضعیت اختیاری W2 در CCR نهایی.
- تثبیت Prisma روی 5.22.0 در مرحله مجاز بعدی.
- تصمیم نهایی درباره FK مربوط به `ExternalWorkspaceLink`؛ طبق بازبینی Guardian نباید در CCR نخست قرار گیرد.

Codex هیچ‌یک از این تصمیم‌ها را اعمال نکرده است.

## ۱۰. گام بعدی پیشنهادی

Architecture Guardian گزارش G2، hashها، دامنه شاخه و Handoff جدید را مستقل بازبینی کند. تا دریافت تصمیم بعدی Claude، G3، تغییر `schema.prisma`، migration، Backend یا هر مرحله بعدی آغاز نشود.

من کدکس هستم.
